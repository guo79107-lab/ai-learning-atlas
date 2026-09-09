'use client';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clock3,
  Download,
  Lightbulb,
  Target,
  ChevronRight,
  MessageCircle,
  Quote,
} from 'lucide-react';
import {
  PieChart,
  BarChart,
  Bar,
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
import cases from '../discussion-cases.json';
import CoachReview from '../coach-review';

const palette = ['#9bb9ce', '#c5a383', '#818b96'];
const argumentFields = [
  { key: 'claim', title: '提炼观点' },
  { key: 'evidence', title: '核查依据' },
  { key: 'counterpoint', title: '提出反问' },
  { key: 'revision', title: '修订判断' },
] as const;
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
    quiz = m.quizzes[selected],
    discussion = m.discussions[selected],
    sample = cases[selected - 1];
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
  const discussionCount = Object.values(m.discussions).filter(
    (d) => d.completedAt || d.alternate?.completedAt,
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
            attempts: daily?.attempts ?? null,
            rate: daily
              ? Math.round((daily.correct / daily.attempts) * 100)
              : null,
          };
        });
  const hasMinutes = trend.some((d) => d.minutes !== null);
  const hasRate = trend.some((d) => d.rate !== null);
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
      '课程资料：Claude Academy · 独立中文整理',
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
      '## 观点练习',
      ...(discussion
        ? [
            discussion.mode === 'sample'
              ? '材料类型：原创讨论示例 · 非知乎原文'
              : '材料类型：用户添加的知乎摘录（未自动核验）',
            `标题：${discussion.mode === 'sample' ? sample.title : discussion.title}`,
            ...(discussion.mode === 'zhihu'
              ? [`原作者：${discussion.author || '未填写'}`]
              : []),
            `摘录：${discussion.mode === 'sample' ? sample.excerpt : discussion.excerpt}`,
            ...argumentFields.flatMap((f) => [
              '',
              `### ${f.title}`,
              discussion[f.key] || '尚未填写',
            ]),
            '',
            discussion.completedAt
              ? '状态：已保存观点卡；不代表结论已核实。'
              : '状态：练习草稿',
          ]
        : ['还没有观点练习记录。']),
      '',
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
            <MessageCircle size={20} />
            <span>完成观点练习</span>
            <strong>
              {discussionCount}
              <i> / 11</i>
            </strong>
            <small>把阅读变成一次有依据的判断</small>
          </article>
        </section>
        <CoachReview now={today} selected={selected} />
        <section className="review-chart-grid">
          <article className="review-panel">
            <div className="review-panel-title">
              <span>01</span>
              <div>
                <h2>学习时间，花在哪里？</h2>
                <p>按学习阶段分配活跃时长</p>
              </div>
            </div>
            {totalTime > 0 ? (
              <div className="review-pie-wrap">
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
                      innerRadius={72}
                      outerRadius={93}
                      paddingAngle={
                        pieData.filter((d) => d.value > 0).length > 1 ? 3 : 0
                      }
                      stroke="none"
                      isAnimationActive={false}
                    ></Pie>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          className="review-chart-tooltip"
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
                <div className="review-pie-center">
                  <strong>{duration(totalTime)}</strong>
                  <span>累计活跃学习</span>
                </div>
              </div>
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
                  <strong>{d.value ? duration(d.value) : '未记录'}</strong>
                  <em>
                    {totalTime && d.value
                      ? `${Math.round((d.value / totalTime) * 100)}%`
                      : '—'}
                  </em>
                </li>
              ))}
            </ul>
          </article>
          <article className="review-panel">
            <div className="review-panel-title">
              <span>02</span>
              <div>
                <h2>看见最近七天的积累</h2>
                <p>每天的学习投入与练习提交记录</p>
              </div>
            </div>
            <div className="review-metric-chart">
              <h3>
                活跃学习时长 <span>分钟 / 天</span>
              </h3>
              {hasMinutes ? (
                <ChartContainer
                  config={{ minutes: { label: '活跃分钟', color: palette[0] } }}
                  className="review-trend"
                  aria-label="最近七天每天的活跃学习分钟柱图"
                >
                  <BarChart
                    data={trend}
                    margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                    accessibilityLayer
                  >
                    <CartesianGrid vertical={false} stroke="#ffffff0d" />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tickMargin={9}
                    />
                    <YAxis
                      width={43}
                      domain={[0, 'auto']}
                      tickCount={3}
                      axisLine={false}
                      tickLine={false}
                    />
                    <ChartTooltip
                      cursor={{ fill: '#ffffff05' }}
                      content={
                        <ChartTooltipContent
                          className="review-chart-tooltip"
                          formatter={(v) => (
                            <span>{Number(v).toFixed(2)} 分钟</span>
                          )}
                        />
                      }
                    />
                    <Bar
                      dataKey="minutes"
                      fill={palette[0]}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={24}
                      minPointSize={2}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="review-metric-empty">
                  还没有活跃时长
                  <br />
                  回到课程读一页，记录从这里开始。
                </div>
              )}
            </div>
            <div className="review-metric-chart">
              <h3>
                练习提交正确率 <span>正确次数 / 当日提交次数</span>
              </h3>
              {hasRate ? (
                <ChartContainer
                  config={{ rate: { label: '练习正确率', color: palette[1] } }}
                  className="review-trend"
                  aria-label="最近七天每天的练习提交正确率折线图"
                >
                  <LineChart
                    data={trend}
                    margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                    accessibilityLayer
                  >
                    <CartesianGrid vertical={false} stroke="#ffffff0d" />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tickMargin={9}
                      padding={{ left: 12, right: 12 }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      ticks={[0, 50, 100]}
                      width={43}
                      unit="%"
                      axisLine={false}
                      tickLine={false}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          className="review-chart-tooltip"
                          formatter={(v, _name, item) => (
                            <span>
                              {Number(v)}% · 当日 {item.payload.attempts} 次提交
                            </span>
                          )}
                        />
                      }
                    />
                    <Line
                      type="linear"
                      dataKey="rate"
                      stroke={palette[1]}
                      strokeWidth={2}
                      dot={{
                        r: 4,
                        fill: palette[1],
                        stroke: '#111416',
                        strokeWidth: 2,
                      }}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="review-metric-empty">
                  还没有提交记录
                  <br />
                  完成一次课程判断题后，这里会出现数据。
                </div>
              )}
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
            分钟内有操作的时间；后台、长时间闲置与设备休眠不补记。它反映浏览投入，不能测量心理专注力。首次正确率保留每课第一次提交，最新正确率反映各课最近一次提交；正确率折线按当天课程判断题的提交计算，观点练习不计入正确率。旧完成记录不补造分数或时长。全部数据仅保存在这台设备。
          </p>
        </details>
        <section className="review-workspace">
          <div className="review-workspace-heading">
            <div>
              <p className="review-kicker">FROM KNOWLEDGE TO ACTION</p>
              <h2>从一段观点，走到自己的判断。</h2>
              <p>保留来源、依据和反问，看见一次思考是怎样发生的。</p>
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
          <section
            className="review-discussion"
            id="discussion-review"
            aria-label="观点练习复盘"
          >
            {discussion ? (
              <>
                <div className="review-discussion-source">
                  <Quote size={23} />
                  <div>
                    <span className="discussion-provenance">
                      {discussion.mode === 'sample'
                        ? '原创讨论示例 · 非知乎原文'
                        : '我的知乎材料 · 摘录未自动核验'}
                    </span>
                    <h3>
                      {discussion.mode === 'sample'
                        ? sample.title
                        : discussion.title || '尚未填写原文标题'}
                    </h3>
                    <p>
                      {discussion.mode === 'zhihu' && discussion.author
                        ? `原作者：${discussion.author} · `
                        : ''}
                      {discussion.completedAt ? '观点卡已保存' : '练习草稿'}
                    </p>
                    <details className="review-source-excerpt">
                      <summary>查看讨论摘录</summary>
                      <p>
                        {discussion.mode === 'sample'
                          ? sample.excerpt
                          : discussion.excerpt || '还没有添加摘录。'}
                      </p>
                    </details>
                  </div>
                </div>
                <div className="review-argument-map">
                  {argumentFields.map((f, i) => (
                    <article className="review-argument-node" key={f.key}>
                      <h4>
                        {number(i + 1)} · {f.title}
                        {i < 3 && <ChevronRight size={15} />}
                      </h4>
                      <p>{discussion[f.key] || '这一格还在等你的想法。'}</p>
                    </article>
                  ))}
                </div>
                <div className="review-discussion-actions">
                  <span>
                    {
                      argumentFields.filter((f) => discussion[f.key].trim())
                        .length
                    }{' '}
                    / 4 步有记录 · 结论仍需依据核验
                  </span>
                  <Link href={`/learn/${selected}?tab=discussion`}>
                    继续这次观点练习 <ArrowRight size={15} />
                  </Link>
                </div>
              </>
            ) : (
              <div className="review-discussion-empty">
                <div>
                  <h3>让一次阅读，留下自己的判断。</h3>
                  <p>
                    做一道情境题，或带入一段知乎摘录。这里会连起你的观点、依据、反问和修订。
                  </p>
                </div>
                <Link
                  className="review-primary"
                  href={`/learn/${selected}?tab=discussion`}
                >
                  开始观点练习 <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </section>
          <details className="review-personal-work">
            <summary>继续拆解一个自己的任务</summary>
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
                <article
                  className="review-thought"
                  key={`${selected}-${f.key}`}
                >
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
          </details>
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
            <p className="review-source">
              课程资料：Claude Academy · 独立中文整理
            </p>
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
