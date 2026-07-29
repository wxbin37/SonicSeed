import Link from "next/link";
import {
  ArrowLeft,
  AudioWaveform,
  FileText,
  Image as ImageIcon,
  Music2,
  Search,
  Tags,
} from "lucide-react";

const cards = [
  {
    type: "旋律",
    title: "凌晨副歌哼唱01",
    meta: "BPM 76 · A小调 · Hook",
    status: "可进入编曲",
    icon: Music2,
  },
  {
    type: "歌词",
    title: "像明天还会见",
    meta: "告别 · 城市夜晚 · 主歌结尾",
    status: "待发展",
    icon: FileText,
  },
  {
    type: "画面",
    title: "雨夜出租车照片",
    meta: "霓虹 · 离开深圳 · 克制",
    status: "已关联 Demo",
    icon: ImageIcon,
  },
  {
    type: "声音",
    title: "风噪与站台广播",
    meta: "现场采样 · Intro 参考",
    status: "待清理",
    icon: AudioWaveform,
  },
];

export default function LibraryPage() {
  return (
    <main className="library-shell" aria-label="灵感库">
      <header className="page-header">
        <Link className="back-link" href="/">
          <ArrowLeft size={18} />
          返回
        </Link>
        <div>
          <p>INSPIRATION VAULT</p>
          <h1>灵感库</h1>
        </div>
        <button className="icon-action" type="button" aria-label="搜索灵感">
          <Search size={18} />
        </button>
      </header>

      <section className="library-hero panel">
        <div>
          <p>个人音乐基因库</p>
          <h2>128 条灵感，42 条已建立关系，9 个可播放 Demo。</h2>
        </div>
        <div className="tag-cluster">
          {["告别", "R&B", "城市夜晚", "Hook", "雨夜"].map((tag) => (
            <span key={tag}>
              <Tags size={12} />
              {tag}
            </span>
          ))}
        </div>
      </section>

      <section className="library-grid">
        {cards.map(({ type, title, meta, status, icon: Icon }) => (
          <article className="library-tile panel" key={title}>
            <span className="tile-icon">
              <Icon size={21} />
            </span>
            <p>{type}</p>
            <h3>{title}</h3>
            <span>{meta}</span>
            <strong>{status}</strong>
          </article>
        ))}
      </section>
    </main>
  );
}
