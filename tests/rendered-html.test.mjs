import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Sonic Seed entry", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>声因 \| AI 协作音乐创作空间<\/title>/i);
  assert.match(html, /灵感库/);
  assert.match(html, /开始创作/);
  assert.match(html, /一段哼唱/);
  assert.match(html, /合作方继续创作/);
  assert.doesNotMatch(html, /灵感收集箱|主动召回/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|SkeletonPreview/i);
});

test("server-renders the create collaboration page", async () => {
  const response = await render("/create");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /对话/);
  assert.match(html, /文字/);
  assert.match(html, /哼唱/);
  assert.match(html, /图片/);
  assert.match(html, /语音/);
  assert.match(html, /协作创作空间/);
  assert.match(html, /前后台架构/);
});

test("uses the requested visual constraints", async () => {
  const [css, page, createPage, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/create/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(packageJson, /"lucide-react"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(page, /from "lucide-react"/);
  assert.match(createPage, /from "lucide-react"/);
  assert.doesNotMatch(page, /emoji|🐦|🎵|✨|🚀/);
  assert.doesNotMatch(createPage, /emoji|🐦|🎵|✨|🚀/);
  assert.match(layout, /lang="zh-CN"/);
  assert.match(layout, /data-theme="dark"/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview|_sites-preview/);
  assert.doesNotMatch(css, /linear-gradient|backdrop-filter|glass/i);
  assert.match(css, /--background:\s*#0d0d0d/i);
  assert.match(css, /--button-highlight:\s*#00f285/i);
  assert.match(css, /@keyframes wave-dance/);
});
