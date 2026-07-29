"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  AudioLines,
  Bot,
  CheckCircle2,
  CircleDashed,
  FileAudio,
  Image as ImageIcon,
  Link2,
  MessageCircle,
  Mic,
  Music2,
  Pause,
  Play,
  Radio,
  Send,
  Share2,
  SlidersHorizontal,
  Split,
  Timer,
  Type,
  UsersRound,
} from "lucide-react";

type InputMode = "dialogue" | "text" | "humming" | "image" | "voice";

type Mode = {
  id: InputMode;
  label: string;
  icon: LucideIcon;
  title: string;
  body: string;
};

const modes: Mode[] = [
  {
    id: "dialogue",
    label: "对话",
    icon: MessageCircle,
    title: "说清楚你脑子里的方向",
    body: "我想要温暖的 R&B，鼓轻一点，像凌晨离开城市。",
  },
  {
    id: "text",
    label: "文字",
    icon: Type,
    title: "写一句歌词或风格提示",
    body: "我们把告别说得像明天还会见。",
  },
  {
    id: "humming",
    label: "哼唱",
    icon: Mic,
    title: "录一段旋律作为 Guide Vocal",
    body: "浏览器录音或上传 MP3、M4A、WAV、WebM。",
  },
  {
    id: "image",
    label: "图片",
    icon: ImageIcon,
    title: "用画面锁定情绪和场景",
    body: "雨夜、出租车、霓虹、离开深圳的最后一晚。",
  },
  {
    id: "voice",
    label: "语音",
    icon: Radio,
    title: "用口述整理创作 Brief",
    body: "把故事、结构、参考曲和不想要的元素一次说完。",
  },
];

const projects = [
  {
    title: "离开城市之前",
    status: "Mureka 伴奏生成中",
    percent: 68,
    owner: "我",
    updated: "2分钟前",
    branch: "V2 · light drums",
  },
  {
    title: "凌晨副歌接力",
    status: "合作方正在改副歌歌词",
    percent: 42,
    owner: "林雨",
    updated: "12分钟前",
    branch: "Hook rewrite",
  },
  {
    title: "雨夜 Demo 试听",
    status: "等待主理人确认方向",
    percent: 86,
    owner: "陈舟",
    updated: "今天 15:20",
    branch: "V1 review",
  },
];

const backendFlow = [
  "音频校验与转码",
  "YIN/pYIN 旋律分析",
  "DeepSeek Brief",
  "Mureka Instrumental",
  "版本与分享权限",
];

export default function CreatePage() {
  const [activeMode, setActiveMode] = useState<InputMode>("humming");
  const [isPlaying, setIsPlaying] = useState(false);
  const active = useMemo(
    () => modes.find((mode) => mode.id === activeMode) ?? modes[2],
    [activeMode],
  );

  const ActiveIcon = active.icon;

  return (
    <main className="create-shell" aria-label="开始创作">
      <header className="page-header">
        <Link className="back-link" href="/">
          <ArrowLeft size={18} />
          返回
        </Link>
        <div>
          <p>CREATE SPACE</p>
          <h1>开始创作</h1>
        </div>
        <button className="icon-action" type="button" aria-label="分享创作空间">
          <Share2 size={18} />
        </button>
      </header>

      <section className="create-grid">
        <div className="capture-panel panel">
          <div className="section-heading">
            <div>
              <p>灵感输入</p>
              <h2>选择一种开始方式</h2>
            </div>
            <span className="live-pill">
              <CircleDashed size={13} />
              实时同步
            </span>
          </div>

          <div className="mode-grid" aria-label="输入方式">
            {modes.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                data-active={activeMode === id}
                onClick={() => setActiveMode(id)}
              >
                <Icon size={19} />
                {label}
              </button>
            ))}
          </div>

          <article className="active-mode-card">
            <span className="mode-symbol" aria-hidden="true">
              <ActiveIcon size={26} />
            </span>
            <div>
              <p>{active.title}</p>
              <strong>{active.body}</strong>
            </div>
          </article>

          <div className="recording-console">
            <div className="console-top">
              <span>
                <FileAudio size={16} />
                humming_take_03.webm
              </span>
              <strong>00:18 / 10MB</strong>
            </div>
            <div className="console-wave" aria-hidden="true">
              {[42, 86, 55, 122, 64, 150, 92, 132, 50, 104, 76, 116].map(
                (height, index) => (
                  <span key={`${height}-${index}`} style={{ height }} />
                ),
              )}
            </div>
            <div className="console-actions">
              <button
                className="round-play"
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                aria-label={isPlaying ? "暂停录音" : "播放录音"}
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
              <button className="primary-action" type="button">
                <Send size={17} />
                AI 理解与编曲
              </button>
            </div>
          </div>
        </div>

        <section className="workspace-panel panel" aria-label="协作创作列表">
          <div className="section-heading">
            <div>
              <p>协作创作空间</p>
              <h2>创作列表与共享进度</h2>
            </div>
            <button className="share-chip" type="button">
              <Link2 size={14} />
              复制分享链接
            </button>
          </div>

          <div className="project-list">
            {projects.map((project) => (
              <article className="project-card" key={project.title}>
                <div className="project-meta">
                  <span>
                    <Music2 size={16} />
                    {project.branch}
                  </span>
                  <em>{project.updated}</em>
                </div>
                <h3>{project.title}</h3>
                <p>{project.status}</p>
                <div className="progress-track" aria-label={`${project.title}进度 ${project.percent}%`}>
                  <span style={{ width: `${project.percent}%` }} />
                </div>
                <div className="project-footer">
                  <span>
                    <UsersRound size={15} />
                    {project.owner} 正在处理
                  </span>
                  <strong>{project.percent}%</strong>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="architecture-panel panel" aria-label="前后台架构">
          <div className="section-heading">
            <div>
              <p>前后台架构</p>
              <h2>从上传到接力的异步链路</h2>
            </div>
            <SlidersHorizontal size={18} />
          </div>

          <div className="architecture-columns">
            <div>
              <span className="column-label">前台</span>
              <strong>浏览器录音 / 上传 / 分享链接 / 协作编辑</strong>
            </div>
            <div>
              <span className="column-label">后台</span>
              <strong>转码、旋律分析、模型任务、状态轮询、存储</strong>
            </div>
          </div>

          <div className="backend-flow">
            {backendFlow.map((item, index) => (
              <div key={item}>
                {index < 3 ? <CheckCircle2 size={16} /> : <Timer size={16} />}
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <aside className="handoff-panel panel">
          <div className="handoff-icon">
            <Split size={24} />
          </div>
          <p>每次“换个方向”都会创建新分支；试听链接和编辑链接权限分开。分享者可以看到所有合作方的修改进度和版本说明。</p>
          <div className="handoff-status">
            <Bot size={16} />
            DeepSeek Brief 已结构化
          </div>
          <div className="handoff-status">
            <AudioLines size={16} />
            Mureka 任务轮询中
          </div>
        </aside>
      </section>
    </main>
  );
}
