import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("front-end defines the requested product routes", async () => {
  const [app, api, html] = await Promise.all([
    readFile(new URL("../frontend/src/App.tsx", import.meta.url), "utf8"),
    readFile(new URL("../frontend/src/api.ts", import.meta.url), "utf8"),
    readFile(new URL("../frontend/index.html", import.meta.url), "utf8"),
  ]);

  assert.match(html, /<html lang="zh-CN"/);
  assert.match(html, /<title>声因 \| AI 协作音乐创作空间<\/title>/);
  assert.match(app, /<h1>声因<\/h1>/);
  assert.match(app, /灵感库/);
  assert.match(app, /开始创作/);
  assert.match(app, /创作历史/);
  assert.match(app, /工作台/);
  assert.match(app, /AI 分析后台/);
  assert.match(app, /Demo 成品区/);
  assert.match(api, /VITE_API_BASE_URL/);
});

test("back-end exposes the split deployment API contract", async () => {
  const [main, schemas, requirements] = await Promise.all([
    readFile(new URL("../backend/app/main.py", import.meta.url), "utf8"),
    readFile(new URL("../backend/app/schemas.py", import.meta.url), "utf8"),
    readFile(new URL("../backend/requirements.txt", import.meta.url), "utf8"),
  ]);

  assert.match(main, /FastAPI/);
  assert.match(main, /@app\.get\("\/api\/health"/);
  assert.match(main, /@app\.get\("\/api\/projects"/);
  assert.match(main, /@app\.post\("\/api\/brief"/);
  assert.match(main, /@app\.post\("\/api\/uploads"/);
  assert.match(main, /@app\.post\("\/api\/demo-tasks"/);
  assert.match(main, /@app\.get\("\/api\/demo-tasks\/\{task_id\}"/);
  assert.match(schemas, /class BriefRequest/);
  assert.match(schemas, /class DemoTaskResponse/);
  assert.match(requirements, /fastapi/);
  assert.match(requirements, /uvicorn/);
});

test("uses split deployment settings and visual constraints", async () => {
  const [css, netlify, rootPackage, frontendPackage] = await Promise.all([
    readFile(new URL("../frontend/src/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../netlify.toml", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../frontend/package.json", import.meta.url), "utf8"),
  ]);

  assert.match(netlify, /base\s*=\s*"frontend"/);
  assert.match(netlify, /publish\s*=\s*"dist"/);
  assert.match(netlify, /to\s*=\s*"\/index\.html"/);
  assert.match(rootPackage, /pnpm --dir frontend build/);
  assert.match(frontendPackage, /"vite"/);
  assert.match(frontendPackage, /"lucide-react"/);
  assert.doesNotMatch(rootPackage, /"next"|"vinext"|drizzle|wrangler/);
  assert.doesNotMatch(css, /linear-gradient|backdrop-filter|glass/i);
  assert.match(css, /--background:\s*#0d0d0d/i);
  assert.match(css, /--button-highlight:\s*#00f285/i);
  assert.match(css, /@keyframes status-pulse/);
});
