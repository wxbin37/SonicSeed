import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "声因 | AI 协作音乐创作空间",
  description: "AI 灵感管理与协作 Demo 创作工作台。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" data-theme="dark" data-container="large">
      <body>{children}</body>
    </html>
  );
}
