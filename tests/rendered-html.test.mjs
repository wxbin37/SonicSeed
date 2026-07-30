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
  assert.match(app, /Mus<span>eed<\/span>/);
  assert.match(app, /让每一刻灵感/);
  assert.match(app, /灵感库/);
  assert.match(app, /开始创作/);
  assert.match(app, /创作历史/);
  assert.match(app, /工作台/);
  assert.match(app, /搜索灵感、标签或项目/);
  assert.match(app, /导航视图/);
  assert.match(app, /图谱视图/);
  assert.match(app, /融合并开始创作/);
  assert.match(app, /图谱定位/);
  assert.match(app, /核心意象/);
  assert.match(app, /旋律特征/);
  assert.match(app, /创作位置/);
  assert.match(app, /使用方式/);
  assert.match(app, /查看原始对话/);
  assert.match(app, /展开详情/);
  assert.match(app, /对话概括/);
  assert.match(app, /showFullSummary/);
  assert.match(app, /data-expanded/);
  assert.match(app, /关联建议/);
  assert.match(app, /所属项目/);
  assert.match(app, /data-focused/);
  assert.match(app, /scrollIntoView/);
  assert.match(app, /id: "kind", label: "灵感类型"/);
  assert.match(app, /id: "theme", label: "核心主题"/);
  assert.match(app, /id: "emotion", label: "情绪"/);
  assert.match(app, /id: "scene", label: "场景"/);
  assert.match(app, /id: "imagery", label: "核心意象"/);
  assert.match(app, /id: "genre", label: "曲风"/);
  assert.match(app, /id: "melody", label: "旋律特征"/);
  assert.match(app, /id: "position", label: "创作位置"/);
  assert.match(app, /id: "usage", label: "使用方式"/);
  assert.match(app, /inspirations=/);
  assert.match(api, /VITE_API_BASE_URL/);
  assert.match(api, /type InspirationRecord/);
  assert.match(api, /\/api\/inspirations/);
  assert.match(api, /listInspirations/);
  assert.match(app, /SQLite 已同步/);
  assert.match(app, /mapInspirationRecord/);
  assert.match(app, /AI 标签/);
  assert.match(app, /创作配置弹窗/);
  assert.match(app, /当前创作（基于 V1 原生版）/);
  assert.match(app, /已选灵感/);
  assert.match(app, /Prompt/);
  assert.match(app, /音乐基因设置/);
  assert.match(app, /handleApplyCreationSetup/);
  assert.match(app, /toggleCreationSeed/);
  assert.match(app, /libraryCards\.map\(cardToCreationSeed\)/);
  assert.match(app, /暂无灵感记录/);
  assert.doesNotMatch(app, /defaultCreationSeeds/);
  assert.match(app, /创作版本/);
  assert.match(app, /生成试听版/);
  assert.match(app, /版本树/);
  assert.match(app, /const \[creationModalOpen, setCreationModalOpen\] = useState\(false\)/);
  assert.doesNotMatch(app, /useState\(\(\) => !getShareToken\(\)\)/);
  assert.match(app, /可上传 MP3\/M4A\/WAV\/WebM、图片、视频/);
  assert.match(app, /PanelLeftClose/);
  assert.match(app, /PanelLeftOpen/);
  assert.match(app, /handleAttachmentChange/);
  assert.match(app, /handleListenVersion/);
  assert.match(app, /playingVersionId/);
  assert.match(app, /Pause/);
  assert.match(app, /version-mini-list/);
  assert.doesNotMatch(app, /setDraft\(promptForTask\)/);
  assert.match(app, /handleSaveInspiration/);
  assert.match(app, /私域接力/);
  assert.match(app, /getProjectWorkspace/);
  assert.match(app, /saveProjectWorkspace/);
  assert.match(app, /applyWorkbenchSnapshot/);
  assert.match(app, /handleOpenCollaborationSession/);
  assert.match(app, /getOrCreateClientId/);
  assert.match(app, /createShareLink/);
  assert.match(app, /joinShareLink/);
  assert.match(app, /updateCollaborationSession/);
  assert.match(app, /pollVersionTask/);
  assert.match(app, /attempt < 90/);
  assert.match(app, /后台仍在生成/);
  assert.match(app, /listProjects/);
  assert.match(app, /saveProject/);
  assert.match(app, /listInspirations/);
  assert.match(app, /listDemoTasks/);
  assert.match(app, /versionFromTask/);
  assert.match(app, /formatDemoTaskMessage/);
  assert.match(app, /生成失败：/);
  assert.match(app, /message\.audioUrl/);
  assert.match(app, /试听版本已生成/);
  assert.match(app, /已找回/);
  assert.match(app, /还没有创作历史/);
  assert.doesNotMatch(app, /凌晨副歌哼唱01/);
  assert.doesNotMatch(app, /雨夜出租车照片/);
  assert.doesNotMatch(app, /Demo 成品区/);
  assert.doesNotMatch(app, /source-toolbar/);
  assert.match(api, /VITE_API_BASE_URL/);
  assert.match(api, /uploadAudio/);
  assert.match(api, /attachments\?: BriefAttachment\[\]/);
  assert.match(api, /getDemoTask/);
  assert.match(api, /listDemoTasks/);
  assert.match(api, /saveInspiration/);
  assert.match(api, /getProjectWorkspace/);
  assert.match(api, /saveProjectWorkspace/);
  assert.match(api, /listCollaborationSessions/);
  assert.match(api, /getCollaborationSession/);
  assert.match(api, /hasApiConnection/);
});

test("back-end exposes the split deployment API contract", async () => {
  const [main, schemas, storage, uploadStore, envLoader, requirements] = await Promise.all([
    readFile(new URL("../backend/app/main.py", import.meta.url), "utf8"),
    readFile(new URL("../backend/app/schemas.py", import.meta.url), "utf8"),
    readFile(new URL("../backend/app/storage.py", import.meta.url), "utf8"),
    readFile(new URL("../backend/app/upload_store.py", import.meta.url), "utf8"),
    readFile(new URL("../backend/app/env_loader.py", import.meta.url), "utf8"),
    readFile(new URL("../backend/requirements.txt", import.meta.url), "utf8"),
  ]);

  assert.match(main, /FastAPI/);
  assert.match(main, /BackgroundTasks/);
  assert.match(main, /load_local_env/);
  assert.match(main, /@app\.get\("\/api\/health"/);
  assert.match(main, /@app\.get\("\/api\/projects"/);
  assert.match(main, /@app\.post\("\/api\/projects"/);
  assert.match(main, /@app\.get\("\/api\/projects\/\{project_id\}\/workspace"/);
  assert.match(main, /@app\.put\("\/api\/projects\/\{project_id\}\/workspace"/);
  assert.match(main, /@app\.post\("\/api\/share-links"/);
  assert.match(main, /@app\.post\("\/api\/share-links\/\{token\}\/join"/);
  assert.match(main, /@app\.get\("\/api\/projects\/\{project_id\}\/collaboration-sessions"/);
  assert.match(main, /@app\.get\("\/api\/collaboration-sessions\/\{session_id\}"/);
  assert.match(main, /@app\.patch\("\/api\/collaboration-sessions\/\{session_id\}"/);
  assert.match(main, /@app\.post\("\/api\/brief"/);
  assert.match(main, /@app\.get\("\/api\/inspirations"/);
  assert.match(main, /@app\.post\("\/api\/inspirations"/);
  assert.match(main, /@app\.post\("\/api\/uploads"/);
  assert.match(main, /@app\.post\("\/api\/demo-tasks"/);
  assert.match(main, /background_tasks\.add_task/);
  assert.match(main, /@app\.get\("\/api\/demo-tasks"/);
  assert.match(main, /@app\.get\("\/api\/demo-tasks\/\{task_id\}"/);
  assert.match(schemas, /class BriefRequest/);
  assert.match(schemas, /class BriefAttachment/);
  assert.match(schemas, /"video"/);
  assert.match(schemas, /class InspirationCard/);
  assert.match(schemas, /class DemoTaskResponse/);
  assert.match(schemas, /attachments: list\[BriefAttachment\]/);
  assert.match(schemas, /class ProjectWorkspaceResponse/);
  assert.match(schemas, /class ShareLinkResponse/);
  assert.match(schemas, /class CollaborationSessionResponse/);
  assert.match(schemas, /lyrics/);
  assert.match(schemas, /traceId/);
  assert.match(schemas, /provider/);
  assert.match(schemas, /projectId/);
  assert.match(schemas, /createdAt/);
  assert.match(storage, /import sqlite3/);
  assert.match(storage, /SONIC_SEED_DB_PATH/);
  assert.match(uploadStore, /SONIC_SEED_UPLOAD_DIR/);
  assert.match(uploadStore, /save_upload_bytes/);
  assert.match(uploadStore, /read_upload_bytes/);
  assert.match(envLoader, /\.env\.local/);
  assert.match(envLoader, /os\.environ/);
  assert.match(storage, /CREATE TABLE IF NOT EXISTS projects/);
  assert.match(storage, /CREATE TABLE IF NOT EXISTS project_workspaces/);
  assert.match(storage, /CREATE TABLE IF NOT EXISTS inspirations/);
  assert.match(storage, /CREATE TABLE IF NOT EXISTS demo_tasks/);
  assert.match(storage, /CREATE TABLE IF NOT EXISTS share_links/);
  assert.match(storage, /CREATE TABLE IF NOT EXISTS collaboration_sessions/);
  assert.match(storage, /creator_client_id/);
  assert.match(storage, /workbench_json/);
  assert.match(storage, /upsert_project_workspace_record/);
  assert.match(storage, /UNIQUE\(share_token, collaborator_client_id\)/);
  assert.match(storage, /attachments_json/);
  assert.match(storage, /tags_json/);
  assert.doesNotMatch(storage, /PROJECTS|INSPIRATIONS|TASKS/);
  assert.match(requirements, /fastapi/);
  assert.match(requirements, /uvicorn/);
});

test("back-end calls MiniMax only through server-side configuration", async () => {
  const [services, envExample] = await Promise.all([
    readFile(new URL("../backend/app/services.py", import.meta.url), "utf8"),
    readFile(new URL("../backend/.env.example", import.meta.url), "utf8"),
  ]);

  assert.match(services, /MINIMAX_API_KEY/);
  assert.match(services, /queue_demo_task/);
  assert.match(services, /run_queued_demo_task/);
  assert.match(services, /is_ascii_token/);
  assert.match(services, /中文占位符/);
  assert.match(services, /\/v1\/music_generation/);
  assert.match(services, /output_format/);
  assert.match(services, /lyrics_optimizer/);
  assert.match(services, /is_instrumental/);
  assert.match(services, /audio_base64/);
  assert.match(services, /MINIMAX_AUDIO_MODEL/);
  assert.match(services, /TEXT_MUSIC_MODELS/);
  assert.match(services, /build_minimax_prompt/);
  assert.match(services, /music-cover/);
  assert.match(services, /extract_minimax_lyrics/);
  assert.match(services, /generated_lyrics/);
  assert.match(services, /normalize_minimax_error_message/);
  assert.match(services, /余额不足/);
  assert.match(services, /music-3\.0/);
  assert.match(services, /未配置 MINIMAX_API_KEY/);
  assert.doesNotMatch(services, /fallback|mock|固定样例/i);
  assert.match(envExample, /MINIMAX_BASE_URL=https:\/\/api\.minimaxi\.com/);
  assert.match(envExample, /MINIMAX_MUSIC_MODEL=music-3\.0/);
  assert.match(envExample, /MINIMAX_AUDIO_MODEL=music-cover/);
  assert.match(envExample, /SONIC_SEED_UPLOAD_DIR=data\/uploads/);
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
  assert.match(css, /creation-modal-layer/);
  assert.match(css, /selected-seeds-panel/);
  assert.match(css, /prompt-config-panel/);
  assert.match(css, /message-audio-result/);
  assert.match(css, /version-mini-item/);
  assert.match(css, /version-listen-button\.is-playing/);
  assert.match(css, /--background:\s*#0d0d0d/i);
  assert.match(css, /--button-highlight:\s*#00f285/i);
  assert.match(css, /@keyframes status-pulse/);
});
