# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

零基础 AI 学习者，按需求文档 v2.0 画像：职场新人（35%，用 AI 提效写报告/邮件/文案，追求即用即走）、学生群体（25%，辅助学习与写作）、内容创作者（20%，批量产出高质量内容）、自由职业者（10%，提升 AI 接单交付质量）、好奇探索者（10%，系统了解提示词技巧）。共同点：非技术背景、面对 AI 输入框写不出结构化提示词、缺乏即时反馈与刻意练习环境。

## Product Purpose

以"苏格拉底式追问"对话学习模式，让零基础用户在 7 天内建立提示词工程基本认知，能独立写出包含角色设定、任务描述、上下文、输出格式、约束条件五要素的结构化提示词。成功 = 用户完成练习、评分进步、连续学习（次日留存 ≥ 40% 目标）、知识掌握可视化。

## Positioning

与被动接收型的视频课程/图文教程不同：本平台提供"原始提示词 vs AI 优化提示词"对比机制与四维评分反馈，让用户立刻看到差在哪里；以四阶段技能树（入门→进阶→精通→大师）+ 徽章 + 每日挑战赛形成可追踪的成长闭环。"提问的深度，决定答案的高度"。

## Operating Context

登录注册后进入工作台：左侧分组导航（学习/创作/成长）+ 顶部模块条 + 右侧单模块内容区（一次显示一个模块，点击导航切换）。登录页 /login，主页面 /。后端 Java 21 + Spring Boot 3（端口 8080），前端 React 18 + Vite（端口 5173），JWT 鉴权（7 天），统一响应 {success,data,error}。多个业务模块后端接口尚未实现，前端使用 mock 数据（上线前需全量清除 mock）。

## Capabilities and Constraints

- 模块：学习地图（统计卡片 + 四阶段技能树 + 徽章墙）、苏格拉底对话（多轮追问 + 前后对比 + 评分）、作品工厂（模板一键生成）、每日挑战赛（四维评分 + 排行榜）、提示词实验室（积木构建器）、能力雷达（五维画像）。
- 技术栈：React 18.3 + TypeScript 5.8 + Vite 6 + Tailwind 3 + Zustand + React Router + Framer Motion + lucide-react + recharts。
- 约束：本轮改版只做视觉层（排版/配色/字体/间距/留白/动效），功能逻辑、模块结构、业务文案保持不变。
- 动效强度：适中——有质感但不干扰任务操作。

## Brand Commitments

- 品牌名 Spark，宣传语"提问的深度，决定答案的高度"。
- 用户明确要求工作台与宣传页（`project/landing/index.html` / `project/frontend/landing.html`）视觉适配：宣传页是视觉权威。
- 宣传页既定视觉事实（binding）：白底 #FFFFFF / 浅灰 #F5F5F5 交替、主文字近黑 #171717、靛蓝主色 #4B3FE3（hover #3D31D6、亮阶 #6B5BFF）、语义绿 #00B983、圆角 8/16/9999、衬线标题 Noto Serif SC + 无衬线正文 Outfit、大字号大留白、颗粒噪点纹理、磁性按钮、3D 倾斜卡片、粒子背景、模糊高亮渐显、reveal 滚动渐入、prefers-reduced-motion 降级。

## Evidence on Hand

- 宣传页完整实现：`project/landing/index.html`（SITE_CONFIG + 全部样式/动效，49.5KB）。
- 需求文档：`开发需求文档.md`（v2.0，模块布局/交互/字段规则）；`接口文档.md`。
- 前端现状：`project/frontend/src/`（AppLayout/Sidebar/TopBar/TaskList + 六个模块页面 + wb-* 组件类 + tailwind TRAE 色板扩展）。
- 不可虚构：无真实用户数据、无官方 logo 文件（品牌区用字母徽标）、联系邮箱为占位符。

## Product Principles

1. 教与学优先：视觉服务于"看懂进度、完成练习、获得反馈"，Operate 模式先于表现。
2. 品牌一体：应用与宣传页共享同一套设计语言（靛蓝、衬线标题、留白、动效质感），宣传页是唯一视觉权威。
3. 反馈即产品：对比、评分、进度可视化是差异化核心，视觉上要让这些信息可扫读。
4. 克制动效：动效增强质感与引导，不拖慢操作、尊重 prefers-reduced-motion。
5. 生产级细节：间距/圆角/阴影/状态一致，浅色主题下对比度与可访问性达标。

## Accessibility & Inclusion

web 浅色主题；全局 prefers-reduced-motion 降级已在 index.css 中实现，需在新动效中保持一致；键盘焦点环、可读对比度需在实施中保持。
