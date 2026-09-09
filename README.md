# AI 学习图鉴

首页 → 学习地图 → 11 个独立学习章节。首页沿用用户指定的视频和液态玻璃方向，海报根据视频的实际播放时间同步放大；每轮淡出后更换一组海报。学习地图以复制来的水星图片为固定背景，用滚轮、方向键和拖动切换章节。学习页提供讲解、判断题和练习笔记。

## 运行与检查

```sh
npm install
npm run dev
node --experimental-strip-types --test scripts/progress.test.mjs
npm run lint
npx tsc --noEmit
npm run build
node scripts/prepare-release.mjs
```

技术栈为 React、TypeScript、Vinext/Vite、Tailwind CSS、Lucide。保留项目生成器的依赖与锁文件；产品界面不使用额外的 UI 组件库。`dist/client/` 是可部署的纯静态产物，包含首页、章节选择页、11 个学习页及各页 RSC 数据。

本机 Vinext beta.5 的静态导出暂不启用 `trailingSlash`，避免预渲染被 308 重定向中断。Nginx 需要将带 `RSC: 1` 的页面请求映射到 `.rsc` 文件，并返回本次构建的 compatibility ID；发布准备脚本根据 `deploy/release.json` 中的发布 ID 自动生成配置，并核对客户端产物。代码升级发布时应更新该 ID，避免旧浏览器混用不兼容的章节数据。

## 内容与素材来源

- 11 章依据 [Claude Academy AI Fluency](https://academy.claude.com/collections/ai-fluency) 独立中文整理，每章有原始课程链接。通用原则与具体工具的隐私设置、上下文和计费说明明确区分。
- 视频由用户提供，原始地址及光圈测量过程记录在海报目录中的 `视频光圈节奏.json`。缩放曲线基于 0.25 秒采样的可见青色外圈上缘，不是完整椭圆的物理半径。视频持续放大，没有缩小回程；循环淡出后重置。
- 水星背景仅复制图片到 `public/backgrounds/mercury.webp`。没有修改原星球项目、原部署目录或源文件。
- 新版 11 张海报位于 `/Users/agnet/AI学习海报-20260909/新版-主题各异/`，提示词与生成记录保存在同目录。网页使用 WebP 副本，原图保留。
- 知乎创意投稿：https://www.zhihu.com/pin/2080881230841750701

## 进度与笔记

没有账号或后端 AI 调用。练习为固定教学题。进度与笔记只保存在当前设备的 localStorage；其他标签页的更新会同步，写入前会重新合并最新记录，避免覆盖。存储不可用时保留当前页内存内容并显示说明。清除浏览器网站数据会清除本地学习记录。

## 部署

目标为用户已有服务器上的独立项目目录 `/opt/ai-learning-atlas/`；`releases/` 保留发布包，`current` 只在本项目内切换。上传内容只限 `dist/client/`，不包括服务器中间文件、凭据或本地资料。`deploy/nginx-template.conf` 使用内部验证端口，公开监听或域名在最终发布时指定。

原站 `/opt/starwreck/current` 及原 Nginx 站点保持不变。发布前后对原站文件清单和配置做哈希核对。

## 验证范围

- 进度合并、重复完成、存储不可用和异常数据的回归测试。
- 类型检查、lint、所有页面的静态预渲染。
- 服务器页面/RSC响应、深链接、404、视频Range和静态文件完整性校验。
- 未执行浏览器视觉或交互自动化测试。
- WebMCP 提供 `read_learning_progress`、`read_learning_chapter`，功能检测后注册，页面关闭时清理。当前环境没有支持的 WebMCP 验证上下文，未声称已验证运行时注册和调用。

生成器自带的未使用 UI 组件有原有 lint 问题，按项目配置排除；类型检查仍覆盖全项目。
