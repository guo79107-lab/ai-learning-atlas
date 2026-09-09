# AI 学习图鉴

首页 → 星球学习地图 → 11 个独立学习章节 → 学习复盘。首页采用用户确认的 Foliom 书籍流水线效果与现有 11 张封面，保留价值主题文案。首页所有导航、按钮链接和书封都只指向 `/explore`；星球页海报只选课，仅「进入学习」打开课程。学习页提供讲解、判断题、笔记及第四级复盘入口。原 Foliom 和原星球项目保持不变。

## 运行与检查

```sh
npm install
npm run dev
node --experimental-strip-types --test scripts/progress.test.mjs scripts/learning-metrics.test.mjs
npm run lint
npx tsc --noEmit
npm run build
node scripts/prepare-release.mjs
```

技术栈为 React、TypeScript、Vinext/Vite、Tailwind CSS、Lucide。保留项目生成器的依赖与锁文件；复盘页复用已安装的 Select、Progress、Chart 组件及 Recharts，没有新增依赖。`dist/client/` 是可部署的纯静态产物，包含首页、章节选择页、11 个学习页、复盘页及各页 RSC 数据。

本机 Vinext beta.5 的静态导出暂不启用 `trailingSlash`，避免预渲染被 308 重定向中断。Nginx 需要将带 `RSC: 1` 的页面请求映射到 `.rsc` 文件，并返回本次构建的 compatibility ID；发布准备脚本根据 `deploy/release.json` 中的发布 ID 自动生成配置，并核对客户端产物。代码升级发布时应更新该 ID，避免旧浏览器混用不兼容的章节数据。

当前部署前缀为 `/ai-learning`。`prebuild` 中的 `scripts/patch-vinext.mjs` 对固定版本 beta.5 的内部预渲染请求补上 `basePath`，只修改已知的一处构建时代码；版本或匹配不符时停止，不改写浏览器产物。`prepare-release.mjs` 同时将前缀目录下的 `_next` 资产复制到静态根目录，供 Nginx 去掉请求前缀后统一读取。

## 内容与素材来源

- 11 章依据 [Claude Academy AI Fluency](https://academy.claude.com/collections/ai-fluency) 独立中文整理，每章有原始课程链接。通用原则与具体工具的隐私设置、上下文和计费说明明确区分。
- 早期视频方案的素材保留归档，当前首页不再播放视频。原始地址及光圈测量过程记录在海报目录中的 `视频光圈节奏.json`。缩放曲线基于 0.25 秒采样的可见青色外圈上缘，不是完整椭圆的物理半径。视频持续放大，没有缩小回程；循环淡出后重置。网页视频保留原始分辨率与时长，采用 H.264 CRF20 与 faststart 优化，从约 19 MB 缩至约 7.4 MB，原始文件保留；逐帧 SSIM 为 0.993。
- 水星背景仅复制图片到 `public/backgrounds/mercury.webp`。没有修改原星球项目、原部署目录或源文件。
- 书籍运动几何参考用户指定的本地 `/Users/agnet/foliom-book-marquee/`（线上 `/foliom/`）：22 个槽位、3 组循环、55 秒一轮，与参考保持 34 px/s 桌面速度。封面用图片，斜切、叠层纸页及抬起效果由 CSS 完成；无需重新生图。
- 新版 11 张海报位于 `/Users/agnet/AI学习海报-20260909/新版-主题各异/`，提示词与生成记录保存在同目录。网页使用 WebP 副本，原图保留。
- 知乎创意投稿：https://www.zhihu.com/pin/2080881230841750701

## 进度与笔记

没有账号或后端 AI 调用。练习为固定教学题。进度与笔记只保存在当前设备的 localStorage；其他标签页的更新会同步，写入前会重新合并最新记录，避免覆盖。存储不可用时保留当前页内存内容并显示说明。清除浏览器网站数据会清除本地学习记录。

## 学习复盘

`/review?chapter=1` 是第四级页面，只从课程页进入。记录扩展到原 `ai-learning-atlas:v1` 中，保留旧完成状态、笔记及位置；旧记录不补造时长或分数。

- 活跃时长：课程可见、有焦点且最近 120 秒有操作时累计，每 5 秒结算；睡眠和异常长间隔不补记，按本地午夜拆分日期。支持 Web Locks 时以排他计时锁避免重复标签页累计；不支持时仅当前有焦点的页面计时。
- 测验：仅明确提交时记录，保留每课首次与最新结果。总览按已测验课程计算；七日趋势中的正确率按当天提交次数计算，缺失数据留空。
- 专注投入以记录时长呈现，思考记录以四步填写情况呈现，均不解释为心理能力测量或评级。
- 问题、证据、判断、下一步可逐课填写，自动本地保存。复习卡整理既有课程重点与个人记录，可导出 Markdown 复盘。
- 没有后端 AI 分析调用，也没有虚构多 Agent 分析。当前课程素材来自 Claude Academy；若以知乎内容转化为参赛核心，还需要接入具体且可引用的知乎内容。

## 部署

已上线：[https://47.93.230.221/ai-learning/](https://47.93.230.221/ai-learning/)。当前发布 ID 为 `atlas-20260909-r6`。

跨页面入口统一使用 `app/site-link.tsx` 原生链接并补齐部署前缀，直接访问导出的完整 HTML 页面。Vinext beta.5 构建曾将动态导入的导航模块导出名压缩，导致 Link 的预取与点击导航调用不存在的函数；HTTP 200 不能覆盖此错误。原生链接保留新标签打开、返回、深链接能力；页内轮播、题目与本地学习进度继续由 React 管理。

首页以“同样用 AI，你的答案，值多少钱？”引出任务价值，金额用作提问，不作为课程收益承诺；随后给出 11 关练习路径。Instrument Serif 正体与斜体随网站加载，移除了可能阻塞首屏的 Google Fonts 外部 CSS 请求。字体来自 Google Fonts 官方文件，使用 SIL OFL 1.1 授权，许可保存在 `public/fonts/OFL.txt`。

使用用户已有服务器上的独立项目目录 `/opt/ai-learning-atlas/`；`releases/` 保留发布包，`current` 只在本项目内切换。网站公开目录只包含 `dist/client/` 静态产物，不包括源码、凭据或本地资料。源码归档单独保存在此项目的 `source/` 目录，不能通过网站访问。

独立 Nginx 站点只监听 `127.0.0.1:18425`。已有 IP HTTPS 站点通过独立的 `/etc/nginx/snippets/ai-learning-atlas.conf` 将 `/ai-learning/` 转发至该端口；配置来源是 `deploy/https-prefix.conf`，修改前的 HTTPS 入口配置保存在服务器项目的 `backups/` 中。没有修改 DNS 或增加公开端口。沿用现有 IP HTTPS 证书，已确认服务器配置有 `certbot-ip-renew.timer` 自动续期任务。

HTTP 入口也通过独立的 `ai-learning-atlas-http.conf` 将本项目路径跳转至 HTTPS，保留章节与查询参数，避免误入商城的兜底页面；来源为 `deploy/http-redirect.conf`。原 HTTP 入口配置备份为服务器 `backups/shop.before-atlas-http.conf`。

原站 `/opt/starwreck/current` 及原 Nginx 站点保持不变。发布前后已核对原站 203 个文件与 3 份站点配置，哈希完全一致。

## 验证范围

- 进度合并、重复完成、存储不可用和异常数据的回归测试。
- 类型检查、lint、所有页面的静态预渲染。
- 先前发布已验证外网页面、RSC、静态文件、404 与 Range。本版新增 `/review`，发布后检查所有 14 个 HTML/RSC 页面和首页/星球页入口约束，服务器文件使用 SHA-256 核对。
- 在独立 `localhost:4310` 预览中使用用户的 Chrome 验证真实书封点击、星球海报仅选课、进入课程、首次答错和重试答对、复盘图表、四步记录保存、复习卡翻面和章节选择。测试记录与线上数据按 origin 隔离，未向线上灌入测试数据。已检查桌面视觉，未执行全尺寸视觉回归。
- WebMCP 提供 `read_learning_progress`、`read_learning_chapter`，功能检测后注册，页面关闭时清理。当前环境没有支持的 WebMCP 验证上下文，未声称已验证运行时注册和调用。

生成器自带的未使用 UI 组件有原有 lint 问题，按项目配置排除；类型检查仍覆盖全项目。
