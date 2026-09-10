import type { CoachSession } from './coach-store';

export function zhihuUrl(value: string): string {
  try {
    const u = new URL(value.trim());
    if (u.protocol !== 'https:' || u.username || u.password || u.port)
      return '';
    if (
      !(
        (u.hostname === 'www.zhihu.com' &&
          /^\/(question\/\d+(\/answer\/\d+)?|answer\/\d+|pin\/\d+)\/?$/.test(
            u.pathname,
          )) ||
        (u.hostname === 'zhuanlan.zhihu.com' &&
          /^\/p\/\d+\/?$/.test(u.pathname))
      )
    )
      return '';
    u.hash = '';
    for (const key of Array.from(u.searchParams.keys()))
      if (!key.startsWith('utm_')) u.searchParams.delete(key);
    return u.toString();
  } catch {
    return '';
  }
}

export function coachingShare(session: CoachSession, chapterTitle: string) {
  const { draft: d, feedback: f } = session;
  const source =
    d.mode === 'zhihu'
      ? [
          d.title,
          d.author ? `原作者：${d.author}` : '作者署名待核对',
          zhihuUrl(d.sourceUrl || ''),
        ]
          .filter(Boolean)
          .join('\n')
      : 'AI 学习图鉴原创教学情境';
  return [
    `${d.mode === 'zhihu' && d.title ? d.title : chapterTitle}｜我的一次学习记录`,
    `学习主题：${chapterTitle}`,
    d.intent === 'question'
      ? `我的问题\n${d.answer}`
      : `本次练习题\n${d.question || '你会采纳这段观点吗？请说明判断、依据和适用条件。'}\n\n我的回答\n${d.answer}`,
    f.steps
      ? `拆成三步\n${f.steps.map((s, i) => `${i + 1}. ${s.title}\n${s.detail}`).join('\n\n')}`
      : '',
    `AI 教练的解释\n${f.explanation || f.observation + '\n' + f.gap}`,
    `下一步练习\n${f.question}`,
    `材料来源\n${source}`,
    '这份学习稿由我与 DeepSeek V4 Pro 辅助整理，事实与引用仍需核验。使用 AI 学习图鉴完成。',
  ]
    .filter(Boolean)
    .join('\n\n');
}
