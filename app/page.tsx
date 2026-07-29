"use client";

import Link from "next/link";
import {
  ArrowRight,
  AudioWaveform,
  Library,
  Music2,
  Network,
  Play,
  Sparkles,
  UsersRound,
} from "lucide-react";

const flowSteps = ["一段哼唱", "AI理解与编曲", "可播放Demo", "合作方继续创作"];

export default function Home() {
  return (
    <main className="home-shell" aria-label="声因入口">
      <section className="immersive-stage">
        <div className="stage-copy">
          <div className="brand-lockup">
            <span className="brand-symbol" aria-hidden="true">
              <Music2 size={26} strokeWidth={2.2} />
            </span>
            <div>
              <p>Sonic Seed</p>
              <h1>声因</h1>
            </div>
          </div>

          <p className="home-kicker">让每个灵感被记录、被连接、被重新听见。</p>
          <h2>从一段哼唱开始，让 Demo 和合作接力自然发生。</h2>

          <div className="home-actions" aria-label="主入口">
            <Link className="entrance-button secondary" href="/library">
              <Library size={20} />
              灵感库
            </Link>
            <Link className="entrance-button primary" href="/create">
              <Play size={20} />
              开始创作
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>

        <div className="sound-stage" aria-hidden="true">
          <div className="signal-header">
            <span>
              <AudioWaveform size={16} />
              Guide vocal
            </span>
            <strong>00:12</strong>
          </div>
          <div className="hero-wave">
            {[34, 74, 48, 118, 62, 146, 82, 128, 54, 102, 70, 132, 46, 88].map(
              (height, index) => (
                <span key={`${height}-${index}`} style={{ height }} />
              ),
            )}
          </div>
          <div className="signal-grid">
            {flowSteps.map((step, index) => (
              <div className="signal-node" key={step} data-step={index + 1}>
                <span>{step}</span>
              </div>
            ))}
          </div>
          <div className="live-track">
            <Network size={16} />
            <span>Melody ID synced</span>
            <UsersRound size={16} />
          </div>
        </div>
      </section>

      <section className="architecture-strip" aria-label="核心产品链路">
        {flowSteps.map((step, index) => (
          <div key={step}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{step}</strong>
          </div>
        ))}
      </section>

      <div className="ambient-lines" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <Sparkles className="stage-spark" size={22} aria-hidden="true" />
    </main>
  );
}
