'use client';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Clock3,
  Download,
  Lightbulb,
  NotebookPen,
  Target,
  ChevronRight,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import Link from '../site-link';
import { sitePath } from '../site-config';
import {
  localDay,
  number,
  stages,
  useProgress,
  saveReflection,
  type Reflection,
} from '../atlas-store';
import lessons from '../lessons.json';

const palette = ['#355e7b', '#bd8452', '#7e947b'];
const fields = [
  {
    key: 'problem',
    title: '定义问题',
    hint: '我想解决什么？为谁解决？怎样才算完成？',
  },
  {
    key: 'evidence',
    title: '找到证据',
    hint: '有哪些材料、来源或例子？还有什么需要核查？',
  },
  {
    key: 'judgment',
    title: '形成判断',
    hint: '我的结论是什么？为什么？有没有相反的解释？',
  },
  {
    key: 'next',
    title: '安排下一步',
    hint: '把方法用在哪里？写下一个可以执行的小动作。',
  },
] as const;
const duration = (ms: number) =>
  ms < 60000
    ? `${Math.floor(ms / 1000)} 秒`
    : `${Math.floor(ms / 60000)} 分 ${Math.floor(ms / 1000) % 60} 秒`;
export default function Review() {
  const progress = useProgress(),
    m = progress.metrics;
  const [selected, setSelected] = useState(1),
    [today, setToday] = useState<number | null>(null),
    [flipped, setFlipped] = useState(false);
  /* oxlint-disable react/react-compiler */
  useEffect(() => {
    setToday(Date.now());
    const id = Number(new URLSearchParams(location.search).get('chapter'));
    if (Number.isInteger(id) && id >= 1 && id <= 11) setSelected(id);
  }, []);
  /* oxlint-enable react/react-compiler */
  const lesson = lessons[selected - 1],
    reflection = m.reflections[selected],
    quiz = m.quizzes[selected];
  const timeFor = (id: number) =>
    Object.values(m.timeByDay).reduce((sum, row) => sum + (row[id] || 0), 0);
  const totalTime = lessons.reduce((sum, l) => sum + timeFor(l.id), 0);
  const quizzes = Object.values(m.quizzes),
    tested = quizzes.length;
  const firstRate = tested
    ? Math.round((quizzes.filter((q) => q.first.correct).length / tested) * 100)
    : null;
  const latestRate = tested
    ? Math.round(
        (quizzes.filter((q) => q.latest.correct).length / tested) * 100,
      )
    : null;
  const reflectionCount = Object.values(m.reflections).filter((r) =>
    fields.some((f) => r[f.key].trim()),
  ).length;
  const thinkingFields = fields.filter((f) =>
    reflection?.[f.key]?.trim(),
  ).length;
  const pieData = stages.map((s, i) => ({
    name: s.name,
    value: lessons
      .filter((l) => l.id >= s.start && l.id <= s.end)
      .reduce((sum, l) => sum + timeFor(l.id), 0),
    fill: palette[i],
  }));
  const trend =
    today === null
      ? []
      : Array.from({ length: 7 }, (_, i) => {
          const d = new Date(today);
          d.setHours(12, 0, 0, 0);
          d.setDate(d.getDate() - 6 + i);
          const day = localDay(d.getTime());
          const time = m.timeByDay[day],
            daily = m.quizByDay[day];
          return {
            day,
            label: `${d.getMonth() + 1}/${d.getDate()}`,
            minutes: time
              ? Number(
                  (
                    Object.values(time).reduce((a, b) => a + b, 0) / 60000
                  ).toFixed(2),
                )
              : null,
            rate: daily
              ? Math.round((daily.correct / daily.attempts) * 100)
              : null,
          };
        });
  const hasTrend = trend.some((d) => d.minutes !== null || d.rate !== null);
  const needsReview = lessons.filter(
    (l) => m.quizzes[l.id] && !m.quizzes[l.id].latest.correct,
  );
  const selectChapter = (value: string | null) => {
    const id = Number(value);
    if (!Number.isInteger(id) || id < 1 || id > 11) return;
    setSelected(id);
    setFlipped(false);
    history.replaceState(null, '', sitePath(`/review?chapter=${id}`));
  };
  const exportReview = () => {
    const text = [
      `# ${lesson.title} · 我的学习复盘`,
      '',
      `课程来源：${lesson.source}`,
      '',
      `活跃学习时长：${duration(timeFor(selected))}`,
      `首次判断：${quiz ? (quiz.first.correct ? '正确' : '待复习') : '未记录'}`,
      '',
      '## 课程重点',
      ...lesson.takeaways.map((t) => `- ${t}`),
      '',
      '## 我的笔记',
      progress.notes[selected] || '尚未记录',
      '',
      ...fields.flatMap((f) => [
        `## ${f.title}`,
        reflection?.[f.key] || '尚未填写',
        '',
      ]),
      '## 下次复习时问自己',
      lesson.question,
      '',
      '整理依据：课程内容与个人填写的记录。',
    ].join('\n');
    const url = URL.createObjectURL(
      new Blob([text], { type: 'text/markdown;charset=utf-8' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI学习复盘-${number(selected)}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <main className="review-page">
      <header className="review-nav">
        <Link className="brand" href={`/learn/${selected}`}>
          AI 学习图鉴
        </Link>
        <Link href={`/learn/${selected}`}>
          <ArrowLeft size={15} /> 返回课程
        </Link>
        <span>04 / 学习复盘</span>
      </header>
      <div className="review-shell">
        <section className="review-heading">
          <div>
            <p className="review-kicker">THE REFLECTION DESK</p>
            <h1>
              把学过的，<em>变成用得上的。</em>
            </h1>
            <p>看看时间花在哪里，再把一个真实问题想清楚。</p>
          </div>
          <Link href={`/learn/${selected}`} className="review-primary">
            回到这一课 <ArrowRight size={17} />
          </Link>
        </section>
        {!progress.available && (
          <output className="review-notice">
            当前浏览器无法保存记录，复盘内容暂留在本次页面。离开前可以导出。
          </output>
        )}
        <section className="review-stats" aria-label="学习概览">
          <article>
            <Clock3 size={20} />
            <span>活跃学习时长</span>
            <strong>{duration(totalTime)}</strong>
            <small>{Object.keys(m.timeByDay).length} 天有学习记录</small>
          </article>
          <article>
            <BookOpen size={20} />
            <span>已探索章节</span>
            <strong>
              {progress.completed.length}
              <i> / 11</i>
            </strong>
            <small>每次弄懂一个问题，就是进步</small>
          </article>
          <article>
            <Target size={20} />
            <span>首次判断正确率</span>
            <strong>{firstRate === null ? '—' : `${firstRate}%`}</strong>
            <small>
              已测验 {tested} / 11 课 · 最新{' '}
              {latestRate === null ? '未记录' : `${latestRate}%`}
            </small>
          </article>
          <article>
            <NotebookPen size={20} />
            <span>留下思考的章节</span>
            <strong>
              {reflectionCount}
              <i> / 11</i>
            </strong>
            <small>从自己的问题和证据开始</small>
          </article>
        </section>
        <section className="review-chart-grid">
          <article className="review-panel">
            <div className="review-panel-title">
              <span>01</span>
              <div>
                <h2>专注投入，落在哪里？</h2>
                <p>按学习阶段分配活跃时长</p>
              </div>
            </div>
            {totalTime > 0 ? (
              <ChartContainer
                config={{ value: { label: '活跃时长' } }}
                className="review-pie"
                aria-label="各学习阶段活跃时长饼图"
              >
                <PieChart>
                  <Pie
                    data={pieData.filter((d) => d.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={62}
                    outerRadius={88}
                    paddingAngle={3}
                    isAnimationActive={false}
                  ></Pie>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(v, name) => (
                          <span>
                            {name}：{duration(Number(v))}
                          </span>
                        )}
                      />
                    }
                  />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="review-chart-empty">
                <Clock3 size={32} />
                <p>
                  让第一段学习时间
                  <br />
                  成为这张图的起点。
                </p>
              </div>
            )}
            <ul className="review-legend">
              {pieData.map((d) => (
                <li key={d.name}>
                  <span style={{ background: d.fill }} />
                  {d.name}
                  <strong>{duration(d.value)}</strong>
                </li>
              ))}
            </ul>
          </article>
          <article className="review-panel">
            <div className="review-panel-title">
              <span>02</span>
              <div>
                <h2>看见最近七天的积累</h2>
                <p>活跃分钟与练习提交正确率</p>
              </div>
            </div>
            {hasTrend ? (
              <ChartContainer
                config={{
                  minutes: { label: '活跃分钟', color: palette[0] },
                  rate: { label: '练习正确率', color: palette[1] },
                }}
                className="review-trend"
                aria-label="最近七天的学习时长和练习正确率趋势"
              >
                <LineChart
                  data={trend}
                  margin={{ top: 15, right: 6, left: 0, bottom: 10 }}
                  accessibilityLayer
                >
                  <CartesianGrid vertical={false} stroke="#e3e5dd" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} />
                  <YAxis
                    yAxisId="time"
                    width={36}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="rate"
                    orientation="right"
                    domain={[0, 100]}
                    width={42}
                    unit="%"
                    axisLine={false}
                    tickLine={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    yAxisId="time"
                    type="linear"
                    dataKey="minutes"
                    stroke={palette[0]}
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="rate"
                    type="linear"
                    dataKey="rate"
                    stroke={palette[1]}
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 4 }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="review-chart-empty wide">
                <Target size={32} />
                <p>
                  还没有学习趋势。
                  <br />
                  读一页、做一次练习，记录就会出现在这里。
                </p>
              </div>
            )}
            <div className="review-trend-key">
              <span>● 活跃分钟（左轴）</span>
              <span>● 正确率（右轴）</span>
            </div>
            <p className="review-caption">
              没有记录的日期留空；只有一个数据点时，不推断上升或下降。
            </p>
          </article>
        </section>
        <details className="review-method">
          <summary>这些数据怎样计算？</summary>
          <p>
            时长仅统计课程页处于前台、有焦点，且最近 2
            分钟内有操作的时间；后台、长时间闲置与设备休眠不补记。它反映浏览投入，不能测量心理专注力。首次正确率保留每课第一次提交，最新正确率反映各课最近一次提交；折线图按当天所有提交计算。旧完成记录不补造分数或时长。全部数据仅保存在这台设备。
          </p>
        </details>
        <section className="review-workspace">
          <div className="review-workspace-heading">
            <div>
              <p className="review-kicker">FROM KNOWLEDGE TO ACTION</p>
              <h2>把一个问题，拆成自己的思路。</h2>
              <p>写下依据和下一步，让知识留下可以再次使用的形状。</p>
            </div>
            <Select
              items={lessons.map((l) => ({
                value: String(l.id),
                label: `${number(l.id)} · ${l.shortTitle}`,
              }))}
              value={String(selected)}
              onValueChange={selectChapter}
            >
              <SelectTrigger
                className="review-select"
                aria-label="选择复盘章节"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="review-select-menu">
                {lessons.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    {number(l.id)} · {l.shortTitle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="review-thinking-progress">
            <span>思考记录 · 已填写 {thinkingFields} / 4 步</span>
            <Progress
              value={thinkingFields * 25}
              aria-label="思考记录填写进度"
            />
            <small>记录完成度，不是思考能力评分</small>
          </div>
          <div className="review-mindmap">
            {fields.map((f, i) => (
              <article className="review-thought" key={`${selected}-${f.key}`}>
                <div>
                  <span>{number(i + 1)}</span>
                  <h3>{f.title}</h3>
                  {i < 3 && <ChevronRight size={16} />}
                </div>
                <label htmlFor={`reflection-${f.key}`}>{f.hint}</label>
                <textarea
                  id={`reflection-${f.key}`}
                  value={reflection?.[f.key] || ''}
                  maxLength={1500}
                  onChange={(e) =>
                    saveReflection(
                      selected,
                      f.key as keyof Omit<Reflection, 'updatedAt'>,
                      e.target.value,
                    )
                  }
                  placeholder="用自己的话写下来……"
                />
              </article>
            ))}
          </div>
          <div className="review-save-line">
            <span>
              {progress.available
                ? '输入即保存，仅保存在本机'
                : '当前无法持久保存，请导出保留'}
            </span>
            <button onClick={exportReview}>
              <Download size={15} /> 导出这次复盘
            </button>
          </div>
        </section>
        <section className="review-output-grid">
          <article className="review-panel">
            <div className="review-panel-title">
              <span>03</span>
              <div>
                <h2>带走一张复习卡</h2>
                <p>课程重点＋你的记录，供下次快速回想</p>
              </div>
            </div>
            <button
              className={`review-flashcard ${flipped ? 'is-flipped' : ''}`}
              onClick={() => setFlipped(!flipped)}
              aria-expanded={flipped}
            >
              <span className="review-card-index">
                {number(selected)} / 11 ·{' '}
                {flipped ? '回想与核对' : '先试着回答'}
              </span>
              {flipped ? (
                <>
                  <h3>{lesson.shortTitle}</h3>
                  <ul>
                    {lesson.takeaways.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                  {reflection?.next && <p>我的下一步：{reflection.next}</p>}
                </>
              ) : (
                <>
                  <Lightbulb size={25} />
                  <h3>{lesson.question}</h3>
                  <p>先用自己的话解释，再翻过来核对。</p>
                </>
              )}
              <span className="review-card-turn">
                {flipped ? '回到问题' : '翻看知识要点'} <ArrowRight size={15} />
              </span>
            </button>
            <a
              className="review-source"
              href={lesson.source}
              target="_blank"
              rel="noreferrer"
            >
              查看这一课的原始资料 <ArrowUpRight size={13} />
            </a>
          </article>
          <article className="review-panel">
            <div className="review-panel-title">
              <span>04</span>
              <div>
                <h2>下一次，从这里开始</h2>
                <p>先照顾还没弄懂的地方</p>
              </div>
            </div>
            {needsReview.length ? (
              <ul className="review-return-list">
                {needsReview.map((l) => (
                  <li key={l.id}>
                    <Link href={`/learn/${l.id}`}>
                      <span>{number(l.id)}</span>
                      <div>
                        <strong>{l.shortTitle}</strong>
                        <small>最近一次判断需要再想想</small>
                      </div>
                      <ArrowRight size={16} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="review-next-empty">
                <BookOpen size={28} />
                <h3>{tested ? '暂时没有待回看的错题' : '先留下第一次判断'}</h3>
                <p>
                  {tested
                    ? '选一个真实任务，检验你能否把学过的方法用起来。'
                    : '回到课程，完成一次练习，复盘会有更具体的起点。'}
                </p>
                <Link href={`/learn/${selected}`}>
                  回到第 {number(selected)} 关 <ArrowRight size={15} />
                </Link>
              </div>
            )}
            <div className="review-personal-note">
              <h3>这章留下的发现</h3>
              <p>
                {progress.notes[selected] ||
                  '你在课程练习页写下的笔记，会出现在这里。'}
              </p>
            </div>
          </article>
        </section>
        <footer className="review-footer">
          <span>理解 → 判断 → 记录 → 再次尝试</span>
          <span>AI 学习图鉴 · 你的进步，由真实记录留下</span>
        </footer>
      </div>
    </main>
  );
}
