"use client";

import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bot,
  ChevronRight,
  CirclePlay,
  Clock3,
  Database,
  FileText,
  GitBranch,
  Heart,
  Home as HomeIcon,
  Image as ImageIcon,
  Layers3,
  Library,
  MessageCircle,
  Mic,
  Music2,
  Network,
  Pause,
  PenLine,
  Play,
  Radio,
  Save,
  Search,
  Send,
  SlidersHorizontal,
  Sparkles,
  Type as TypeIcon,
  Upload,
  Video,
  WandSparkles,
} from "lucide-react";

type TabId = "inbox" | "organize" | "library" | "graph" | "demo";
type SaveState = "quick" | "ai" | null;

type NavItem = {
  id: TabId;
  label: string;
  icon: LucideIcon;
};

const captureModes = [
  { id: "chat", label: "对话", icon: MessageCircle },
  { id: "text", label: "文字", icon: TypeIcon },
  { id: "hum", label: "哼唱", icon: Mic },
  { id: "voice", label: "语音", icon: Radio },
  { id: "image", label: "图片", icon: ImageIcon },
  { id: "video", label: "视频", icon: Video },
  { id: "import", label: "导入", icon: Upload },
];

const mainTabs: NavItem[] = [
  { id: "inbox", label: "收集箱", icon: HomeIcon },
  { id: "organize", label: "AI整理", icon: WandSparkles },
  { id: "library", label: "灵感库", icon: Library },
  { id: "graph", label: "图谱", icon: Network },
  { id: "demo", label: "Demo", icon: Music2 },
];

const suggestions = [
  {
    id: "hum-01",
    title: "凌晨副歌哼唱01",
    meta: "旋律卡 · Hook 相似度 82%",
    relation: "搭配",
    icon: Music2,
  },
  {
    id: "photo-rain",
    title: "雨夜出租车照片",
    meta: "图片卡 · 场景：城市、霓虹",
    relation: "来源",
    icon: ImageIcon,
  },
  {
    id: "goodnight",
    title: "最后一句晚安",
    meta: "歌词卡 · 情绪：克制、遗憾",
    relation: "相似",
    icon: FileText,
  },
];

const libraryCards = [
  {
    type: "歌词卡",
    title: "像明天还会见",
    status: "待发展",
    tags: ["告别", "城市夜晚"],
    icon: PenLine,
  },
  {
    type: "旋律卡",
    title: "凌晨副歌哼唱01",
    status: "已关联",
    tags: ["BPM 76", "Hook"],
    icon: Music2,
  },
  {
    type: "图片卡",
    title: "雨夜出租车照片",
    status: "已用于Demo",
    tags: ["霓虹", "离开深圳"],
    icon: ImageIcon,
  },
  {
    type: "反馈卡",
    title: "副歌情绪再释放",
    status: "反馈回流",
    tags: ["V2建议", "合作"],
    icon: MessageCircle,
  },
];

const organizeCopy = {
  tags: {
    title: "仅生成标签",
    body: "#城市夜晚 #告别 #未完成歌词 #主歌结尾",
  },
  polish: {
    title: "优化表达",
    body: "我们把再见说得很轻，像明天还会见。",
  },
  extend: {
    title: "继续扩写",
    body: "车窗外的灯退成一条线，我把沉默留给转弯之前。",
  },
};

const graphNodes = [
  { id: "lyric", label: "原始歌词", detail: "我们把告别说得像明天还会见", x: 18, y: 28 },
  { id: "rewrite", label: "优化歌词", detail: "再见说得很轻，像明天还会见", x: 196, y: 28 },
  { id: "melody", label: "副歌哼唱", detail: "BPM 76 · 中低音域 · Hook", x: 108, y: 112 },
  { id: "demo1", label: "Demo V1", detail: "都市流行 · 钢琴与电子氛围", x: 18, y: 194 },
  { id: "demo2", label: "Demo V2", detail: "情绪曲线：克制到释放", x: 196, y: 194 },
];

const roleOptions = ["核心内容", "参考内容", "必须保留", "只取情绪"];

function Waveform({ active = false }: { active?: boolean }) {
  return (
    <div className={active ? "waveform is-active" : "waveform"} aria-hidden="true">
      {[18, 28, 14, 34, 22, 40, 16, 30, 24, 36, 20, 32].map((height, index) => (
        <span key={`${height}-${index}`} style={{ height }} />
      ))}
    </div>
  );
}

function IconBadge({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="icon-badge" aria-hidden="true">
      <Icon size={18} strokeWidth={1.8} />
    </span>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("inbox");
  const [captureMode, setCaptureMode] = useState("hum");
  const [saveState, setSaveState] = useState<SaveState>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([
    "hum-01",
    "photo-rain",
  ]);
  const [organizeMode, setOrganizeMode] = useState<keyof typeof organizeCopy>("tags");
  const [activeNodeId, setActiveNodeId] = useState("lyric");
  const [isPlaying, setIsPlaying] = useState(false);
  const [demoVersion, setDemoVersion] = useState("V1");
  const [role, setRole] = useState(roleOptions[0]);

  const activeNode = useMemo(
    () => graphNodes.find((node) => node.id === activeNodeId) ?? graphNodes[0],
    [activeNodeId],
  );

  function flashSave(nextState: Exclude<SaveState, null>) {
    setSaveState(nextState);
    window.setTimeout(() => setSaveState(null), 2200);
  }

  function toggleSuggestion(id: string) {
    setSelectedSuggestions((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  return (
    <main className="app-shell" aria-label="声因音乐灵感工作台">
      <header className="topbar">
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true">
            <Music2 size={20} strokeWidth={2} />
          </div>
          <div>
            <p className="eyebrow">Sonic Seed</p>
            <h1>声因</h1>
          </div>
          <button className="round-button" type="button" aria-label="搜索灵感" title="搜索灵感">
            <Search size={18} />
          </button>
        </div>
        <p className="slogan">让每个灵感被记录、被连接、被重新听见。</p>
      </header>

      <section className="composer card" aria-labelledby="composer-title">
        <div className="section-title compact">
          <div>
            <p className="eyebrow">灵感收集箱</p>
            <h2 id="composer-title">先记录，再整理</h2>
          </div>
          <span className="time-chip">
            <Clock3 size={12} />
            20秒内
          </span>
        </div>

        <label className="sr-only" htmlFor="idea-input">
          灵感输入
        </label>
        <textarea
          id="idea-input"
          defaultValue="我们把告别说得像明天还会见。"
          placeholder="说一句、写一句、哼一段，先把灵感留下来。"
        />

        <div className="mode-strip" aria-label="输入方式">
          {captureModes.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className="mode-button"
              type="button"
              data-active={captureMode === id}
              onClick={() => setCaptureMode(id)}
              aria-pressed={captureMode === id}
              title={label}
            >
              <Icon size={16} strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="capture-preview">
          <div>
            <span className="caption">副歌哼唱片段</span>
            <strong>00:10 · A小调 · 76 BPM</strong>
          </div>
          <Waveform active={captureMode === "hum"} />
        </div>

        <div className="action-row">
          <button className="secondary-button" type="button" onClick={() => flashSave("quick")}>
            <Save size={16} />
            快速保存
          </button>
          <button className="primary-button" type="button" onClick={() => flashSave("ai")}>
            <WandSparkles size={16} />
            AI整理后保存
          </button>
        </div>

        <p className="save-state" aria-live="polite">
          {saveState === "quick" && "已保留原始内容，进入收集箱。"}
          {saveState === "ai" && "已生成标题、标签与潜在关联。"}
        </p>
      </section>

      <section className="recall-card card" aria-labelledby="recall-title">
        <div className="section-title compact">
          <div>
            <p className="eyebrow">主动召回</p>
            <h2 id="recall-title">找到3条可能相关的历史灵感</h2>
          </div>
          <Sparkles size={18} aria-hidden="true" />
        </div>
        <div className="suggestion-list">
          {suggestions.map(({ id, title, meta, relation, icon }) => (
            <button
              className="suggestion"
              data-selected={selectedSuggestions.includes(id)}
              key={id}
              onClick={() => toggleSuggestion(id)}
              type="button"
            >
              <IconBadge icon={icon} />
              <span>
                <strong>{title}</strong>
                <small>{meta}</small>
              </span>
              <em>{relation}</em>
            </button>
          ))}
        </div>
        <button className="text-button" type="button" onClick={() => setActiveTab("demo")}>
          组合看看
          <ChevronRight size={15} />
        </button>
      </section>

      <nav className="tab-strip" aria-label="核心模块">
        {mainTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            data-active={activeTab === id}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={15} strokeWidth={1.8} />
            {label}
          </button>
        ))}
      </nav>

      <section className="workspace" aria-live="polite">
        {activeTab === "inbox" && <InboxPanel />}
        {activeTab === "organize" && (
          <OrganizePanel organizeMode={organizeMode} setOrganizeMode={setOrganizeMode} />
        )}
        {activeTab === "library" && <LibraryPanel />}
        {activeTab === "graph" && (
          <GraphPanel activeNodeId={activeNodeId} setActiveNodeId={setActiveNodeId} activeNode={activeNode} />
        )}
        {activeTab === "demo" && (
          <DemoPanel
            selectedCount={selectedSuggestions.length}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            demoVersion={demoVersion}
            setDemoVersion={setDemoVersion}
            role={role}
            setRole={setRole}
          />
        )}
      </section>

      <nav className="bottom-nav" aria-label="底部导航">
        {mainTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            data-active={activeTab === id}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={21} strokeWidth={activeTab === id ? 2.2 : 1.8} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}

function InboxPanel() {
  return (
    <div className="panel-stack">
      <div className="section-title">
        <h2>今日新灵感</h2>
        <span className="muted">6条</span>
      </div>
      <div className="quick-grid">
        <MetricCard icon={Database} value="128" label="灵感资产" />
        <MetricCard icon={GitBranch} value="42" label="已建立关联" />
        <MetricCard icon={CirclePlay} value="9" label="可听Demo" />
      </div>
      <article className="card idea-card">
        <div className="idea-head">
          <IconBadge icon={PenLine} />
          <div>
            <p className="eyebrow">歌词句</p>
            <h3>像明天还会见</h3>
          </div>
          <span className="status-chip">待发展</span>
        </div>
        <p className="quote">我们把告别说得像明天还会见。</p>
        <div className="tag-row">
          <span>#告别</span>
          <span>#城市夜晚</span>
          <span>#副歌Hook</span>
        </div>
      </article>
    </div>
  );
}

function OrganizePanel({
  organizeMode,
  setOrganizeMode,
}: {
  organizeMode: keyof typeof organizeCopy;
  setOrganizeMode: (mode: keyof typeof organizeCopy) => void;
}) {
  const active = organizeCopy[organizeMode];

  return (
    <div className="panel-stack">
      <div className="card ai-card">
        <div className="idea-head">
          <IconBadge icon={Bot} />
          <div>
            <p className="eyebrow">AI灵感整理</p>
            <h3>保留原文，生成新版本</h3>
          </div>
        </div>
        <dl className="field-list">
          <div>
            <dt>标题</dt>
            <dd>像明天还会见</dd>
          </div>
          <div>
            <dt>主题</dt>
            <dd>告别、重逢</dd>
          </div>
          <div>
            <dt>情绪</dt>
            <dd>克制、遗憾</dd>
          </div>
          <div>
            <dt>适用位置</dt>
            <dd>主歌结尾或副歌Hook</dd>
          </div>
        </dl>
      </div>

      <div className="option-card card">
        <div className="segmented-control">
          {Object.entries(organizeCopy).map(([id, item]) => (
            <button
              key={id}
              type="button"
              data-active={organizeMode === id}
              onClick={() => setOrganizeMode(id as keyof typeof organizeCopy)}
            >
              {item.title}
            </button>
          ))}
        </div>
        <p>{active.body}</p>
        <button className="primary-button full" type="button">
          <Layers3 size={16} />
          保存为新版本
        </button>
      </div>
    </div>
  );
}

function LibraryPanel() {
  return (
    <div className="panel-stack">
      <div className="filter-card card">
        <div className="section-title compact">
          <h2>个人灵感库</h2>
          <SlidersHorizontal size={18} />
        </div>
        <div className="filter-row">
          {["类型", "情绪", "曲风", "项目", "状态"].map((filter) => (
            <button key={filter} type="button">
              {filter}
            </button>
          ))}
        </div>
      </div>

      {libraryCards.map(({ type, title, status, tags, icon }) => (
        <article className="card library-card" key={title}>
          <IconBadge icon={icon} />
          <div>
            <p className="eyebrow">{type}</p>
            <h3>{title}</h3>
            <div className="tag-row compact-tags">
              {tags.map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
          </div>
          <span className="status-chip">{status}</span>
        </article>
      ))}
    </div>
  );
}

function GraphPanel({
  activeNodeId,
  setActiveNodeId,
  activeNode,
}: {
  activeNodeId: string;
  setActiveNodeId: (id: string) => void;
  activeNode: (typeof graphNodes)[number];
}) {
  return (
    <div className="panel-stack">
      <div className="card graph-card">
        <div className="section-title compact">
          <h2>灵感图谱</h2>
          <span className="status-chip dashed">潜在关联</span>
        </div>
        <div className="graph-canvas" aria-label="灵感关系网络">
          <span className="graph-link link-one" />
          <span className="graph-link link-two" />
          <span className="graph-link link-three" />
          <span className="graph-link link-four" />
          <span className="graph-link link-five dashed-line" />
          {graphNodes.map((node) => (
            <button
              key={node.id}
              className="graph-node"
              type="button"
              data-active={activeNodeId === node.id}
              style={{ left: node.x, top: node.y }}
              onClick={() => setActiveNodeId(node.id)}
            >
              {node.label}
            </button>
          ))}
        </div>
        <div className="node-detail">
          <span>{activeNode.label}</span>
          <strong>{activeNode.detail}</strong>
        </div>
      </div>

      <div className="relation-row">
        {["相似", "延续", "改写", "搭配", "来源", "衍生", "使用", "反馈"].map((relation) => (
          <span key={relation}>{relation}</span>
        ))}
      </div>
    </div>
  );
}

function DemoPanel({
  selectedCount,
  isPlaying,
  setIsPlaying,
  demoVersion,
  setDemoVersion,
  role,
  setRole,
}: {
  selectedCount: number;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  demoVersion: string;
  setDemoVersion: (version: string) => void;
  role: string;
  setRole: (role: string) => void;
}) {
  return (
    <div className="panel-stack">
      <div className="card puzzle-card">
        <div className="section-title compact">
          <div>
            <p className="eyebrow">创作拼图</p>
            <h2>离开一座生活很久的城市</h2>
          </div>
          <span className="status-chip">{selectedCount}个节点</span>
        </div>
        <div className="puzzle-grid">
          <PuzzleItem label="核心旋律" value="凌晨副歌哼唱01" />
          <PuzzleItem label="歌词素材" value="像明天还会见" />
          <PuzzleItem label="视觉氛围" value="雨夜、出租车、霓虹灯" />
          <PuzzleItem label="情绪曲线" value="克制、不舍、释放" />
        </div>
        <div className="role-row">
          {roleOptions.map((option) => (
            <button
              key={option}
              type="button"
              data-active={role === option}
              onClick={() => setRole(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="card player-card">
        <div className="player-top">
          <button
            className="play-button"
            type="button"
            aria-label={isPlaying ? "暂停Demo" : "播放Demo"}
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause size={22} /> : <Play size={22} />}
          </button>
          <div>
            <p className="eyebrow">{demoVersion} · 都市流行</p>
            <h3>十五秒概念片段</h3>
          </div>
          <button className="round-button like-button" type="button" aria-label="收藏Demo">
            <Heart size={18} />
          </button>
        </div>
        <Waveform active={isPlaying} />
        <div className="version-row">
          {["V1", "V2", "V3"].map((version) => (
            <button
              key={version}
              type="button"
              data-active={demoVersion === version}
              onClick={() => setDemoVersion(version)}
            >
              {version}
            </button>
          ))}
        </div>
        <button className="primary-button full" type="button">
          <Send size={16} />
          协作接力
        </button>
      </div>
    </div>
  );
}

function MetricCard({ icon, value, label }: { icon: LucideIcon; value: string; label: string }) {
  const Icon = icon;

  return (
    <div className="metric-card">
      <Icon size={17} />
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function PuzzleItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="puzzle-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
