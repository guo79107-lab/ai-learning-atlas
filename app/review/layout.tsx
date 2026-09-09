import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: '学习复盘 · AI 学习图鉴',
  description:
    '用真实学习记录看见投入，用复习卡和思维拆解把知识带回自己的任务。',
};
export default function ReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
