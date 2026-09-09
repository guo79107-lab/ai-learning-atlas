import type { Metadata } from 'next';
import './globals.css';
import { sitePath } from './site-config';
import AtlasTools from './atlas-tools';
export const metadata: Metadata = {
  icons: { icon: sitePath('/favicon.svg') },
  title: 'AI 学习图鉴 · 把好奇心翻成下一页',
  description:
    '11 个 AI 问题，11 次小小的进步。翻阅知识海报，做一道练习，建立自己的 AI 判断力。',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <AtlasTools />
      </body>
    </html>
  );
}
