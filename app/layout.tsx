import type { Metadata } from 'next';
import './globals.css';
import { sitePath } from './site-config';
import AtlasTools from './atlas-tools';
import CoachLauncher from './coach-launcher';
export const metadata: Metadata = {
  icons: { icon: sitePath('/favicon.svg') },
  title: 'AI 学习图鉴 · 会用 AI，更会判断。',
  description:
    '11 个关卡，练会拆问题、给背景、核验答案。带上一个真实任务，练习把 AI 的回答变成能用的成果。',
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
        <CoachLauncher />
        <AtlasTools />
      </body>
    </html>
  );
}
