#!/usr/bin/env python3
"""Smoke-test MiniMax music generation with text, image, and audio inspiration.

The MiniMax music endpoint does not accept images directly. Image mode therefore
extracts simple color and brightness features locally and turns them into a music
prompt before calling the text-to-music model.

Set MINIMAX_API_KEY in the environment or enter it at the interactive prompt.
The key is never written to disk.
"""

from __future__ import annotations

import argparse
import base64
import binascii
import getpass
import json
import math
import os
import struct
import sys
import time
import urllib.error
import urllib.request
import wave
import zlib
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple


DEFAULT_BASE_URL = "https://api.minimaxi.com"
TEXT_MODEL = os.getenv("MINIMAX_MUSIC_MODEL", "music-3.0")
COVER_MODEL = os.getenv("MINIMAX_AUDIO_MODEL", "music-cover")


class MiniMaxError(RuntimeError):
    pass


def png_chunk(kind: bytes, payload: bytes) -> bytes:
    return (
        struct.pack(">I", len(payload))
        + kind
        + payload
        + struct.pack(">I", binascii.crc32(kind + payload) & 0xFFFFFFFF)
    )


def create_sample_png(path: Path, width: int = 320, height: int = 180) -> None:
    """Create a small dark city image without third-party image libraries."""
    rows = bytearray()
    for y in range(height):
        rows.append(0)  # PNG filter: None
        for x in range(width):
            if y < 112:
                r = 9 + y // 18
                g = 18 + y // 8
                b = 35 + y // 3
            else:
                r, g, b = 8, 19, 28

            # Block-like buildings.
            if y > 62 and ((x // 42) % 3 != 1):
                r, g, b = 8, 13, 22

            # Green and cyan windows reflected in a wet street.
            if y > 72 and x % 37 < 5 and y % 23 < 8:
                r, g, b = 0, 220, 132
            if y > 116 and (x + y) % 41 < 4:
                r, g, b = 0, 115, 128

            rows.extend((r, g, b))

    signature = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    path.write_bytes(
        signature
        + png_chunk(b"IHDR", ihdr)
        + png_chunk(b"IDAT", zlib.compress(bytes(rows), 9))
        + png_chunk(b"IEND", b"")
    )


def create_sample_wav(path: Path, duration: float = 8.0, sample_rate: int = 16000) -> None:
    """Create an 8-second hummed-style melody suitable for cover smoke tests."""
    notes = [220.0, 246.94, 261.63, 329.63, 293.66, 261.63, 246.94, 220.0]
    frames = bytearray()
    total_frames = int(duration * sample_rate)
    note_frames = total_frames // len(notes)

    for index in range(total_frames):
        note_index = min(index // note_frames, len(notes) - 1)
        frequency = notes[note_index]
        local = (index % note_frames) / float(note_frames)
        envelope = min(local / 0.08, 1.0) * min((1.0 - local) / 0.12, 1.0)
        t = index / float(sample_rate)
        signal = math.sin(2 * math.pi * frequency * t)
        signal += 0.22 * math.sin(2 * math.pi * frequency * 2 * t)
        sample = int(max(-1.0, min(1.0, signal * envelope * 0.42)) * 32767)
        frames.extend(struct.pack("<h", sample))

    with wave.open(str(path), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(sample_rate)
        output.writeframes(bytes(frames))


def paeth_predictor(left: int, up: int, upper_left: int) -> int:
    estimate = left + up - upper_left
    distance_left = abs(estimate - left)
    distance_up = abs(estimate - up)
    distance_upper_left = abs(estimate - upper_left)
    if distance_left <= distance_up and distance_left <= distance_upper_left:
        return left
    if distance_up <= distance_upper_left:
        return up
    return upper_left


def decode_png_pixels(path: Path) -> Tuple[int, int, int, bytes]:
    """Decode non-interlaced, 8-bit RGB/RGBA PNG data for prompt extraction."""
    content = path.read_bytes()
    if not content.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValueError("Image mode currently supports PNG files only")

    offset = 8
    width = height = color_type = bit_depth = interlace = 0
    compressed = bytearray()
    while offset < len(content):
        length = struct.unpack(">I", content[offset : offset + 4])[0]
        kind = content[offset + 4 : offset + 8]
        payload = content[offset + 8 : offset + 8 + length]
        offset += 12 + length
        if kind == b"IHDR":
            width, height, bit_depth, color_type, _, _, interlace = struct.unpack(
                ">IIBBBBB", payload
            )
        elif kind == b"IDAT":
            compressed.extend(payload)
        elif kind == b"IEND":
            break

    if bit_depth != 8 or color_type not in (2, 6) or interlace != 0:
        raise ValueError("PNG must be non-interlaced 8-bit RGB or RGBA")

    channels = 3 if color_type == 2 else 4
    stride = width * channels
    raw = zlib.decompress(bytes(compressed))
    output = bytearray(height * stride)
    source_offset = 0

    for row in range(height):
        filter_type = raw[source_offset]
        source_offset += 1
        source = raw[source_offset : source_offset + stride]
        source_offset += stride
        destination_offset = row * stride
        previous_offset = (row - 1) * stride

        for column, value in enumerate(source):
            left = output[destination_offset + column - channels] if column >= channels else 0
            up = output[previous_offset + column] if row > 0 else 0
            upper_left = (
                output[previous_offset + column - channels]
                if row > 0 and column >= channels
                else 0
            )
            if filter_type == 0:
                decoded = value
            elif filter_type == 1:
                decoded = value + left
            elif filter_type == 2:
                decoded = value + up
            elif filter_type == 3:
                decoded = value + ((left + up) // 2)
            elif filter_type == 4:
                decoded = value + paeth_predictor(left, up, upper_left)
            else:
                raise ValueError("Unsupported PNG filter type: %s" % filter_type)
            output[destination_offset + column] = decoded & 0xFF

    return width, height, channels, bytes(output)


def image_to_music_prompt(path: Path) -> str:
    width, height, channels, pixels = decode_png_pixels(path)
    step = max(1, (width * height) // 5000)
    red = green = blue = count = 0
    for pixel_index in range(0, width * height, step):
        offset = pixel_index * channels
        red += pixels[offset]
        green += pixels[offset + 1]
        blue += pixels[offset + 2]
        count += 1

    average = (red // count, green // count, blue // count)
    brightness = sum(average) / 3.0
    spread = max(average) - min(average)

    if brightness < 75:
        scene = "深夜、低光、安静的城市"
        tempo = "中慢速"
    elif brightness < 165:
        scene = "黄昏、街道、逐渐亮起的灯"
        tempo = "中速"
    else:
        scene = "清晨、开阔、明亮的空气"
        tempo = "轻快"

    if spread < 18:
        mood = "克制、内省、留白"
    elif average[2] >= max(average[0], average[1]):
        mood = "冷色、孤独、微微不舍"
    elif average[0] >= max(average[1], average[2]):
        mood = "温暖、怀旧、逐步释放"
    else:
        mood = "清新、希望、逐渐打开"

    return "%s，%s，%s，钢琴与电子氛围，具有清晰副歌 Hook" % (scene, mood, tempo)


def request_json(url: str, api_key: str, payload: Dict[str, Any], timeout: int) -> Dict[str, Any]:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Authorization": "Bearer %s" % api_key,
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        response_body = error.read().decode("utf-8", errors="replace")
        raise MiniMaxError("HTTP %s: %s" % (error.code, response_body)) from error
    except urllib.error.URLError as error:
        raise MiniMaxError("Network error: %s" % error.reason) from error


def save_audio(response: Dict[str, Any], destination: Path, timeout: int) -> None:
    base_response = response.get("base_resp") or {}
    if base_response.get("status_code") not in (None, 0):
        raise MiniMaxError(
            "MiniMax error %s: %s"
            % (base_response.get("status_code"), base_response.get("status_msg"))
        )

    audio = (response.get("data") or {}).get("audio")
    if not audio:
        raise MiniMaxError("Response did not contain data.audio")

    if isinstance(audio, str) and audio.startswith(("https://", "http://")):
        with urllib.request.urlopen(audio, timeout=timeout) as source:
            destination.write_bytes(source.read())
    else:
        try:
            destination.write_bytes(bytes.fromhex(audio))
        except (TypeError, ValueError) as error:
            raise MiniMaxError("data.audio was neither a URL nor hex audio") from error


def run_case(
    name: str,
    api_key: str,
    base_url: str,
    payload: Dict[str, Any],
    output_dir: Path,
    timeout: int,
) -> Dict[str, Any]:
    print("[%s] submitting model=%s" % (name, payload["model"]), flush=True)
    started = time.monotonic()
    response = request_json(
        "%s/v1/music_generation" % base_url.rstrip("/"),
        api_key,
        payload,
        timeout,
    )
    destination = output_dir / ("%s.mp3" % name)
    save_audio(response, destination, timeout)
    elapsed = round(time.monotonic() - started, 2)
    metadata = {
        "case": name,
        "model": payload["model"],
        "elapsed_seconds": elapsed,
        "audio_file": str(destination),
        "audio_bytes": destination.stat().st_size,
        "trace_id": response.get("trace_id"),
        "extra_info": response.get("extra_info"),
        "base_resp": response.get("base_resp"),
    }
    (output_dir / ("%s.response.json" % name)).write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print("[%s] saved %s bytes in %ss" % (name, metadata["audio_bytes"], elapsed))
    return metadata


def text_payload() -> Dict[str, Any]:
    return {
        "model": TEXT_MODEL,
        "prompt": "一首关于雨夜离开城市的都市流行歌曲，克制的主歌和逐渐释放的副歌",
        "lyrics_optimizer": True,
        "is_instrumental": False,
        "stream": False,
        "output_format": "url",
        "audio_setting": {"sample_rate": 44100, "bitrate": 256000, "format": "mp3"},
    }


def image_payload(image_path: Path) -> Dict[str, Any]:
    prompt = image_to_music_prompt(image_path)
    print("[image] locally derived prompt: %s" % prompt)
    return {
        "model": TEXT_MODEL,
        "prompt": prompt,
        "lyrics_optimizer": True,
        "is_instrumental": False,
        "stream": False,
        "output_format": "url",
        "audio_setting": {"sample_rate": 44100, "bitrate": 256000, "format": "mp3"},
    }


def audio_payload(audio_path: Path) -> Dict[str, Any]:
    encoded = base64.b64encode(audio_path.read_bytes()).decode("ascii")
    return {
        "model": COVER_MODEL,
        "prompt": "都市流行风格，克制的钢琴主歌，副歌加入温暖电子氛围并逐渐释放",
        "lyrics": "[Verse]\n雨落在离开的站台\n灯光把影子慢慢拉开\n[Chorus]\n我们把告别说得像明天还会见\n让最后的回声停在雨里面",
        "audio_base64": encoded,
        "stream": False,
        "output_format": "url",
        "audio_setting": {"sample_rate": 44100, "bitrate": 256000, "format": "mp3"},
    }


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=("all", "text", "image", "audio"), default="all")
    parser.add_argument("--image", type=Path, help="PNG inspiration; generated when omitted")
    parser.add_argument("--audio", type=Path, help="6s-6min audio reference; generated when omitted")
    parser.add_argument("--output-dir", type=Path, default=Path("outputs/minimax-music"))
    parser.add_argument("--timeout", type=int, default=300)
    return parser.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parse_args(argv)
    api_key = os.getenv("MINIMAX_API_KEY")
    if not api_key and sys.stdin.isatty():
        api_key = getpass.getpass("MiniMax API key: ")
    if not api_key:
        print("MINIMAX_API_KEY is required", file=sys.stderr)
        return 2

    base_url = os.getenv("MINIMAX_BASE_URL", DEFAULT_BASE_URL)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    image_path = args.image or (args.output_dir / "sample_city_night.png")
    audio_path = args.audio or (args.output_dir / "sample_humming.wav")

    if args.mode in ("all", "image") and not image_path.exists():
        create_sample_png(image_path)
    if args.mode in ("all", "audio") and not audio_path.exists():
        create_sample_wav(audio_path)

    cases: List[Tuple[str, Dict[str, Any]]] = []
    if args.mode in ("all", "text"):
        cases.append(("text", text_payload()))
    if args.mode in ("all", "image"):
        cases.append(("image", image_payload(image_path)))
    if args.mode in ("all", "audio"):
        cases.append(("audio", audio_payload(audio_path)))

    results = []
    failures = []
    for name, payload in cases:
        try:
            results.append(
                run_case(name, api_key, base_url, payload, args.output_dir, args.timeout)
            )
        except Exception as error:  # Keep the smoke test running for the other modes.
            failures.append({"case": name, "error": str(error)})
            print("[%s] FAILED: %s" % (name, error), file=sys.stderr, flush=True)

    summary = {"results": results, "failures": failures}
    (args.output_dir / "summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
