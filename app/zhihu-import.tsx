'use client';
import { useEffect, useState } from 'react';
import { Search, ArrowUpRight, LoaderCircle } from 'lucide-react';
import { sitePath } from './site-config';
import { zhihuUrl } from './coach-utils';
import { saveCoachDraft, type CoachDraft } from './coach-store';
type Item = { title: string; author: string; excerpt: string; url: string };
export default function ZhihuImport({
  id,
  draft,
}: {
  id: number;
  draft: CoachDraft;
}) {
  const [available, setAvailable] = useState(false),
    [query, setQuery] = useState(''),
    [items, setItems] = useState<Item[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch(sitePath('/api/health'), { signal: controller.signal })
      .then((r) => r.json())
      .then((d) =>
        setAvailable(
          !!d &&
            typeof d === 'object' &&
            'zhihuConfigured' in d &&
            d.zhihuConfigured === true,
        ),
      )
      .catch(() => {});
    return () => controller.abort();
  }, []);
  const search = async () => {
    if (busy || query.trim().length < 2) return;
    setBusy(true);
    setError('');
    setItems([]);
    try {
      const r = await fetch(sitePath('/api/zhihu'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });
      const d = (await r.json()) as { error?: string; items?: Item[] };
      if (!r.ok) throw new Error(d.error || '暂时无法搜索。');
      if (!Array.isArray(d.items)) throw new Error('返回内容不完整。');
      setItems(
        d.items.filter(
          (x: Item) =>
            x &&
            typeof x.excerpt === 'string' &&
            typeof x.title === 'string' &&
            typeof x.author === 'string' &&
            zhihuUrl(x.url),
        ),
      );
      if (!d.items.length)
        setError('没有找到相关摘要，可以继续粘贴你的知乎摘录。');
    } catch (e) {
      setError(
        e instanceof Error ? e.message : '搜索暂时不可用，可以手动粘贴。',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="coach-import">
      <div className="zhihu-import-heading">
        <span className="zhihu-wordmark">知</span>
        <div>
          <h3>让一次知乎阅读，成为你的知识</h3>
          <p>
            {available
              ? '输入关键词或知乎问题链接，选取一段摘要开始学习。'
              : '粘贴你想弄懂的知乎内容，保留标题和署名。'}
          </p>
        </div>
      </div>
      {available && (
        <>
          <label className="coach-field">
            <span>搜索知乎内容</span>
            <div className="zhihu-search">
              <input
                value={query}
                maxLength={500}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="关键词，或完整的知乎问题链接"
              />
              <button
                type="button"
                disabled={busy || query.trim().length < 2}
                onClick={search}
                aria-label="搜索知乎"
              >
                {busy ? (
                  <LoaderCircle size={18} className="coach-spinner" />
                ) : (
                  <Search size={18} />
                )}
              </button>
            </div>
          </label>
          {error && <output>{error}</output>}
          <div className="zhihu-results">
            {items.map((x, i) => (
              <button
                type="button"
                key={`${x.url}-${i}`}
                onClick={() => {
                  saveCoachDraft(id, {
                    title: x.title,
                    author: x.author,
                    excerpt: x.excerpt,
                    sourceUrl: x.url,
                    question: '',
                    previous: '',
                    answer: '',
                  });
                  setItems([]);
                }}
              >
                <strong>{x.title}</strong>
                <small>{x.author || '接口未提供署名'} · 官方接口摘要</small>
                <p>{x.excerpt.slice(0, 120)}…</p>
                <span>
                  选作学习材料
                  <ArrowUpRight size={14} />
                </span>
              </button>
            ))}
          </div>
        </>
      )}
      <label className="coach-field">
        <span>
          知乎链接 <small>可选，用于保留来源</small>
        </span>
        <input
          value={draft.sourceUrl}
          maxLength={500}
          onChange={(e) => saveCoachDraft(id, { sourceUrl: e.target.value })}
          placeholder="https://www.zhihu.com/question/…"
        />
        {draft.sourceUrl && !zhihuUrl(draft.sourceUrl) && (
          <small className="coach-input-error">
            请输入完整的 HTTPS 知乎问题、回答或文章链接。
          </small>
        )}
      </label>
      <div className="coach-source-meta">
        <label className="coach-field">
          <span>摘录标题</span>
          <input
            value={draft.title}
            maxLength={200}
            onChange={(e) => saveCoachDraft(id, { title: e.target.value })}
          />
        </label>
        <label className="coach-field">
          <span>
            作者署名 <small>可选</small>
          </span>
          <input
            value={draft.author}
            maxLength={100}
            onChange={(e) => saveCoachDraft(id, { author: e.target.value })}
          />
        </label>
      </div>
      <label className="coach-field">
        <span>
          相关摘录 <small>20–3000 字</small>
        </span>
        <textarea
          value={draft.excerpt}
          maxLength={3000}
          onChange={(e) => saveCoachDraft(id, { excerpt: e.target.value })}
          placeholder="只粘贴本次需要讨论的段落，保留重要上下文。"
        />
      </label>
      <p className="coach-fine">
        {available
          ? '接口返回摘要，不代表已核实其中观点。'
          : '当前未启用知乎官方检索，粘贴链接不会自动读取原文。'}{' '}
        教练只依据你提供的内容解答。
      </p>
    </div>
  );
}
