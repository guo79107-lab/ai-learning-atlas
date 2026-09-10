# AI 学习图鉴

一个围绕「会用 AI，更会判断」的中文互动学习网站。

**首页 → 星球学习地图 → 11 关课程 → 学习复盘**。首页使用 16:9 旧纸、书籍与档案拼贴海报，主标题融入海报，实际学习按钮位于画面下方；11 本立体书默认隐藏，点击才展开。首页学习入口进入第二级地图，再由「进入学习」进入课程；全站浮动入口可单独进入 AI 教练。

## 学习流程

- 读一页：用短讲解认识模型、四个 D、可信度、幻觉、迎合、偏见、词元与上下文。
- 试一试：完成判断题，留下自己的方法笔记。
- 观点练习：拆解原创情境，或粘贴一段知乎材料，记录观点、依据、反问与修订。
- AI 教练（独立 `/coach`）：选择「提问解惑」或「检验判断」，由 **DeepSeek V4 Pro** 提供三步方法说明与通俗解答；保留原话反馈、方法卡、迁移练习和推荐课程。支持整理可编辑知乎分享稿，复制后打开知乎写文章，用户确认发布。
- 学习复盘：查看真实活跃时长、判断题记录、教练历史和复习卡。首次练习 1 天后回顾；自评能说清后分别间隔 3 天、7 天回顾。不熟悉则回到 1 天。回顾必须写下自己的理解，可延期。

AI 反馈不代表事实已被证实，也不代表智力、专注力或长期掌握度。推荐关卡依据本次反馈的缺口，不凭访问次数生成能力分数。课程判断题的完成标记与 AI 教练记录彼此独立。

## 运行

Node.js 22.13+、Python 3.10+。

```sh
npm ci
npm run dev -- --port 4310
```

默认前缀为 `/ai-learning`，预览入口 `http://localhost:4310/ai-learning/`。前端开发代理将 `/ai-learning/api` 转给本机 `127.0.0.1:18426`。

AI 服务所需私有环境变量（真实值不得写入仓库）：

```text
DEEPSEEK_API_KEY=<your-private-key>
QUOTA_SALT=<random-private-value>
QUOTA_DB=/path/to/private/quota.sqlite
ALLOWED_ORIGINS=http://localhost:4310
PORT=18426
DAILY_REQUEST_LIMIT=400
IP_DAILY_REQUEST_LIMIT=30
```

在独立终端配置上述变量后运行 `python3 server/coach.py`。没有配置 AI 时，静态课程、固定练习、笔记与复盘仍可使用；教练请求显示明确错误，不伪造反馈。

## 验证和生产构建

```sh
npm run lint
npx tsc --noEmit
node --experimental-strip-types --test scripts/progress.test.mjs scripts/learning-metrics.test.mjs scripts/coach.test.mjs
python3 -m unittest discover -s server -p 'test_*.py'
npm run build
node scripts/prepare-release.mjs
```

前端技术栈：React 19、TypeScript、Vinext/Vite、Tailwind CSS、Lucide、Recharts。`dist/client` 为静态产物，包含 15 个学习页面和独立访问密码页和对应 RSC 数据。没有新增 UI 依赖。Python API 只使用标准库，独立于静态部署。

`deploy/nginx-template.conf` 提供本地静态监听器与 API 转发配置；`deploy/https-prefix.conf` 挂载在已有 HTTPS 站点的 `/ai-learning/` 下，覆盖可信客户端 IP 头。后端仅监听 loopback，不应暴露到公网端口。`deploy/ai-learning-atlas-api.service` 使用 systemd DynamicUser、只读系统目录和独立状态目录。真实服务器环境变量位于站点公开目录和源码归档之外。

每次发布更新 `deploy/release.json` 的版本，构建后准备脚本生成哈希清单与 Nginx 配置。静态页与 RSC 响应需要一致的 compatibility ID。代码中保留固定 Vinext beta.5 的 basePath 预渲染补丁，升级框架时应重新验证。

## 数据、隐私与调用边界

- 原课程进度保持在 `ai-learning-atlas:v1`；新增教练独立保存在 `ai-learning-atlas:coach:v1`，不覆盖旧笔记或完成记录。
- 草稿、本次回答、AI 反馈、回顾记录保存在当前浏览器，最多保留最近 100 次教练。可在复盘页导出 Markdown；本页存储不可用时可直接导出当前内容。没有云端账号同步。
- 只有点击提交，才将本次目标、课程材料、原答（修订时）与回答发送给 DeepSeek。不要输入敏感个人信息。服务器不持久保存学习文本；成功结果在内存缓存 5 分钟供重试复用。SQLite 仅保存按日计数和经 HMAC 处理的 IP 标识。
- 固定官方 API `https://api.deepseek.com/chat/completions`，固定模型 `deepseek-v4-pro`，关闭思考模式，JSON 输出，最多 4400 输出 tokens。客户端不能指定模型、上游地址或系统提示。
- 输入大小、Origin、模型输出结构、原答引句、推荐范围和标准一致性经过校验。相同输入复用稳定请求标识。默认最多 3 个并发、每 IP 每 UTC 日 30 次、全站每日 400 次上游尝试；失败调用也计入限额。限额是演示运行保护，可通过私有配置调整。
- 不执行 AI 返回的 HTML，不抓取用户输入的 URL。摘录中的指令作为不可信材料处理。知乎官方检索为可选配置：仅设置 `ZHIHU_ACCESS_SECRET` 后启用固定官方搜索与问题回答摘要接口；没有凭据时只使用粘贴摘录。未接入知乎 OAuth、自动发布或外部事实核查。检索结果不是事实认证。

## 来源与素材

- 11 关依据 [Claude Academy AI Fluency](https://academy.claude.com/collections/ai-fluency) 独立中文整理，前台保留出处文字，不显示原文外链。
- 观点案例为本项目原创教学示例，明确标注非知乎原文。粘贴材料保留用户提供的标题与作者署名。
- 首页当前为参考用户提供海报生成的 16:9 撕纸拼贴静态图片，主标题“会用 AI / 更会判断”，搭配书籍、图书馆与档案。教练采用 256px、2.6 秒循环的眨眼 GIF，有暂停与减少动态效果下的静态替代。这两项素材由内置 imagegen 生成；先前视频文件保留但首页不加载。
- 首页书籍排布复用用户授权参考的书籍流水线效果；海报使用用户的 11 张课程图。水星背景为用户星球项目的授权副本，原项目未修改。
- 页面正文使用苹果风格系统字体回退，首页海报标题使用宋体字形；按钮使用透明玻璃效果。不捆绑或分发苹果专有字体。
- [DeepSeek V4 Pro 官方发布](https://api-docs.deepseek.com/news/news260813/) 与 [Chat API 文档](https://api-docs.deepseek.com/api/create-chat-completion/)。

用户提供的 DOCX 是《赛道二 · 学习工具与知识生产／冲冠产品升级方案》，本项目采用其中“目标—练习—反馈—复习”的产品建议。它不是已经核实的赛事规则原文；不据此宣称符合未提供的官方强制要求。

## 网站访问与知乎内容配置

生产 Nginx 在站点前缀范围内执行服务器端访问验证，包括 HTML、RSC、图片和 API。访问密码通过 `ATLAS_ACCESS_HASH` 保存 PBKDF2-SHA256 哈希（格式 `pbkdf2_sha256$salt$hex`，200000 次），会话签名使用独立随机 `ATLAS_ACCESS_SECRET`。成功后签发有效期 12 小时的 Secure / HttpOnly / SameSite=Lax Cookie，路径仅限 `/ai-learning/`。没有配置哈希的本地开发环境不启用访问锁。凭据仅放私有环境文件，不写入仓库。

可选环境变量 `ZHIHU_ACCESS_SECRET` 用于 [知乎官方搜索](https://developer.zhihu.com/docs?key=zhihu_search) 和 [问题回答摘要](https://developer.zhihu.com/docs?key=question_answers)。后端仅请求固定官方域名，禁止跟随重定向，不抓取任意用户网址；每次最多 5 条。未实际配置凭据时，界面明确提供手动摘录方式，不能宣称已打通官方检索。

分享功能不冒用账号自动发布。它生成包含学习问题、AI 三步解释和来源署名的可编辑稿；不自动搬运全文，用户复制到知乎后选择话题并发布。
