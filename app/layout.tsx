import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "声因 | AI 音乐灵感工作台",
  description: "让每个灵感被记录、被连接、被重新听见。",
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
    <html lang="zh-CN" data-theme="light" data-container="large">
      <body>{children}</body>
    </html>
  );
}
