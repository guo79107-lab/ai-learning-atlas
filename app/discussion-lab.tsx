'use client';
import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  MessageCircle,
  Quote,
} from 'lucide-react';
import Link from './site-link';
import cases from './discussion-cases.json';
import {
  useProgress,
  emptyDiscussion,
  saveDiscussion,
  switchDiscussionMode,
  completeDiscussion,
  discussionReady,
  zhihuSourceUrl,
  type Discussion,
} from './atlas-store';

export default function DiscussionLab({ id }: { id: number }) {
  const progress = useProgress();
  const d = progress.metrics.discussions[id] ?? emptyDiscussion();
  const sample = cases[id - 1];
  const [step, setStep] = useState(0);
  const custom = d.mode === 'zhihu';
  const sourceReady =
    !custom || !!(d.title.trim() && d.excerpt.trim() && zhihuSourceUrl(d.url));
  const analysisReady = !!(
    d.claim.trim() &&
    d.evidence.trim() &&
    d.counterpoint.trim()
  );
  const change = (key: keyof Omit<Discussion, 'completedAt'>, value: string) =>
    saveDiscussion(id, { [key]: value });
  const field = (
    key: 'claim' | 'evidence' | 'counterpoint' | 'revision',
    label: string,
    hint: string,
  ) => (
    <label className="discussion-field" htmlFor={`discussion-${key}`}>
      <span>{label}</span>
      <textarea
        id={`discussion-${key}`}
        maxLength={1500}
        value={d[key]}
        onChange={(e) => change(key, e.target.value)}
        placeholder={hint}
      />
    </label>
  );
  return (
    <section className="discussion-lab" aria-label="观点拆解与证据练习">
      <div className="discussion-topline">
        <span>
          <MessageCircle size={15} /> 观点拆解与证据练习
        </span>
        <span>{step + 1} / 3</span>
      </div>
      <div className="discussion-steps" aria-label="练习步骤">
        {['读一段观点', '找到追问', '修订判断'].map((name, i) => (
          <button
            key={name}
            aria-current={step === i ? 'step' : undefined}
            onClick={() => setStep(i)}
          >
            {name}
          </button>
        ))}
      </div>
      {step === 0 && (
        <>
          <div className="discussion-mode" aria-label="选择材料">
            <button
              aria-pressed={!custom}
              onClick={() => switchDiscussionMode(id, 'sample')}
            >
              先做情境练习
            </button>
            <button
              aria-pressed={custom}
              onClick={() => switchDiscussionMode(id, 'zhihu')}
            >
              带入知乎材料
            </button>
          </div>
          {custom ? (
            <div className="discussion-import">
              <p className="discussion-help">
                选一段想弄懂的知乎回答或文章，粘贴相关摘录和原文链接。材料仅保存在本机。
              </p>
              <label className="discussion-field">
                <span>原文链接</span>
                <input
                  type="url"
                  value={d.url}
                  maxLength={1000}
                  placeholder="https://www.zhihu.com/question/…/answer/…"
                  onChange={(e) => change('url', e.target.value)}
                  aria-invalid={!!d.url && !zhihuSourceUrl(d.url)}
                  aria-describedby="discussion-url-note"
                />
              </label>
              <p id="discussion-url-note" className="discussion-help">
                {d.url && !zhihuSourceUrl(d.url)
                  ? '请填写知乎回答或专栏的 http / https 链接。'
                  : '这里记录来源，不会自动读取链接内容。'}
              </p>
              <div className="discussion-source-fields">
                <label className="discussion-field">
                  <span>原文标题</span>
                  <input
                    value={d.title}
                    maxLength={200}
                    onChange={(e) => change('title', e.target.value)}
                    placeholder="保留原文标题"
                  />
                </label>
                <label className="discussion-field">
                  <span>作者（可选）</span>
                  <input
                    value={d.author}
                    maxLength={100}
                    onChange={(e) => change('author', e.target.value)}
                    placeholder="原作者署名"
                  />
                </label>
              </div>
              <label className="discussion-field">
                <span>要讨论的摘录</span>
                <textarea
                  value={d.excerpt}
                  maxLength={3000}
                  onChange={(e) => change('excerpt', e.target.value)}
                  placeholder="只放与本次问题相关的一段内容……"
                />
              </label>
            </div>
          ) : (
            <>
              <div className="discussion-excerpt">
                <span className="discussion-provenance">
                  原创讨论示例 · 非知乎原文
                </span>
                <h2>{sample.title}</h2>
                <Quote size={20} />
                <blockquote>{sample.excerpt}</blockquote>
              </div>
              <p className="discussion-help">
                先留意：这段话说了什么，又凭什么得出结论？
              </p>
            </>
          )}
          <button
            className="learn-primary"
            disabled={!sourceReady}
            onClick={() => setStep(1)}
          >
            开始拆解 <ArrowRight size={17} />
          </button>
        </>
      )}
      {step === 1 && (
        <>
          <details className="discussion-material">
            <summary>回看{custom ? '我的知乎摘录' : '讨论材料'}</summary>
            <blockquote>
              {custom
                ? d.excerpt || '还没有添加材料，请返回第一步。'
                : sample.excerpt}
            </blockquote>
          </details>
          {!custom && (
            <fieldset className="quiz discussion-question">
              <legend>{sample.question}</legend>
              {sample.options.map((text, i) => (
                <label key={text} className={d.choice === i ? 'chosen' : ''}>
                  <input
                    type="radio"
                    name={`discussion-choice-${id}`}
                    checked={d.choice === i}
                    onChange={() => saveDiscussion(id, { choice: i })}
                  />
                  <span>{text}</span>
                </label>
              ))}
              {d.choice !== null && (
                <output
                  className={`answer-feedback ${d.choice === sample.answer ? 'success' : ''}`}
                  aria-live="polite"
                >
                  <h2>
                    {d.choice === sample.answer
                      ? '这条追问切中了推断的关键。'
                      : '这条追问也有用，再看看关键缺口。'}
                  </h2>
                  <p>{sample.explanation}</p>
                </output>
              )}
            </fieldset>
          )}
          {field(
            'claim',
            '01 · 一句话提炼观点',
            '作者在主张什么？把主张和事实分开写。',
          )}
          {field(
            'evidence',
            '02 · 依据在哪里',
            custom
              ? '写下摘录中的证据及出处；没有证据就记“待核查”，并说明要查什么。'
              : sample.evidenceHint,
          )}
          {field(
            'counterpoint',
            '03 · 提出自己的反问',
            '什么反例、条件或材料，可能改变这个结论？',
          )}
          <button
            className="learn-primary"
            disabled={!sourceReady || !analysisReady}
            onClick={() => setStep(2)}
          >
            带着证据，重新判断 <ArrowRight size={17} />
          </button>
        </>
      )}
      {step === 2 && (
        <>
          <div className="discussion-excerpt">
            <span className="discussion-provenance">
              {custom ? '我的知乎材料' : '原创讨论示例'}
            </span>
            <h2>{custom ? d.title || '还没有添加材料' : sample.title}</h2>
            <p className="discussion-help">
              观点：{d.claim || '还没有提炼观点，请回到第二步。'}
            </p>
          </div>
          {field(
            'revision',
            '现在，我的判断是……',
            '我保留 / 修改 / 暂缓这个判断，因为……还需要核查……',
          )}
          <p className="discussion-help">
            可以保留不确定性。填完代表留下了思考记录，不代表结论已经被核实。
          </p>
          {d.completedAt ? (
            <output className="discussion-complete" aria-live="polite">
              <Check size={19} />
              <div>
                <strong>这一张观点卡，已经留下来了。</strong>
                <p>到复盘页回看依据、反问和修订后的判断。</p>
              </div>
            </output>
          ) : (
            <button
              className="learn-primary"
              disabled={!discussionReady(d)}
              onClick={() => completeDiscussion(id)}
            >
              保存本次观点卡 <Check size={17} />
            </button>
          )}
          {d.completedAt && (
            <Link
              className="learn-primary"
              href={`/review?chapter=${id}#discussion-review`}
            >
              带着观点卡，去复盘 <ArrowUpRight size={17} />
            </Link>
          )}
        </>
      )}
      <div className="discussion-bottom">
        {step > 0 && (
          <button onClick={() => setStep(step - 1)}>
            <ArrowLeft size={14} /> 上一步
          </button>
        )}
        <small>
          {progress.available ? '输入即保存 · 仅本机' : '暂存本页 · 请复制保留'}
        </small>
      </div>
    </section>
  );
}
