"use client";

import Link from "next/link";
import { Library, Play } from "lucide-react";

export default function Home() {
  return (
    <main className="home-shell" aria-label="声因入口">
      <section className="entry-panel" aria-label="主入口">
        <h1>声因</h1>
        <nav className="home-actions" aria-label="页面入口">
          <Link className="entrance-button secondary" href="/library">
            <Library size={20} />
            灵感库
          </Link>
          <Link className="entrance-button primary" href="/create">
            <Play size={20} />
            开始创作
          </Link>
        </nav>
      </section>
    </main>
  );
}
