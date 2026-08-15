# Design

<!-- impeccable:design-schema 1 -->

> 记录自 built world（2026-08）。**蓝白配色，与宣传页（landing.html）品牌完全一致**：白/浅蓝底 + 靛蓝 #4B3FE3 主色 + 绿 #00B983 点缀 + 衬线标题 Noto Serif SC + Outfit 正文；融合各轮精修细节（区块渐变图标、火花头像、时间线、动态背景、hover 发光）。

## Visual World

宣传页品牌蓝白语言：浅蓝白底 #F6F7F9 + 白卡 + 靛蓝 #4B3FE3（主色、CTA、指示条、渐变图标）+ 衬线标题（编辑感、宣传页同款）+ 大留白 + 克制动效。温暖、清晰、教育感，与宣传页入口视觉无缝衔接。

## Palette

- 靛蓝（blue 色板，宣传页品牌主色）：600 `#4B3FE3`（主）、500 `#6B5BFF`（亮阶）、700 `#3D31D6`（hover）、400 `#8378EA`、100 `#E7E5FB`
- 靛蓝渐变亮阶（violet）：500 `#7A6FF0`、400 `#8F86F5`、600 `#6B5BFF`
- 语义绿（accent）：500 `#00B983`、600 `#009A6F`、700 `#007A58`
- 浅色语义层（app）：bg `#F6F7F9`、surface `#FFFFFF`、chrome `#F0F1F4`、border `#E5E6EA`、borderStrong `#D6D8DE`、fg `#171717`、t2 `#3A3A3A`、t3 `#737373`、t4 `#A0A0A8`

## Typography

- 标题：**衬线 Noto Serif SC**（宣传页同款），页面标题 font-display font-medium/600 + tracking-tight
- 正文/UI：**Outfit**（宣传页同款），14-16px
- 数字：tabular-nums

## Surfaces & Components

- **卡片** `.wb-card`：白卡 + 发丝线 + 顶部暖光 + 柔和投影；hover 靛蓝边框微光
- **主按钮** `.wb-btn-primary`：靛蓝底白字、hover 加深 + 靛蓝光晕（宣传页 CTA 同色）
- **输入框**：白底，focus 靛蓝 ring
- **徽标**：靛蓝淡底 / 绿淡底
- **导航**：hover 浅靛蓝底，active 靛蓝指示条
- **区块头** `SectionTitle`：靛蓝渐变图标容器（#4B3FE3→#6B5BFF→#7A6FF0）+ 标题
- **AI 头像** `SparkLogo`：靛蓝渐变圆 + 白色火花图形
- **对话气泡**：AI 白卡 + 靛蓝渐变线 + 尾巴；用户淡靛蓝渐变底 + 尾巴
- **学习地图横幅**：靛蓝渐变带（#4B3FE3→#6B5BFF）+ 白字 + 靛蓝光点
- **背景**：浅蓝白画布 + 靛蓝/亮靛/绿光斑漂移 + 点阵网格 + 噪点

## Motion

- 全局 `cubic-bezier(.4,0,.2,1)` 0.2-0.3s；wb-reveal 渐进增强；粒子视差；光斑漂移；气泡滑入；节点脉冲；磁性按钮（宣传页同款）
- 全部尊重 prefers-reduced-motion

## Constraints

- 只改视觉：功能逻辑、模块结构、业务文案保持不变
- 宣传页（landing.html 静态）与工作台配色一致（白底 + 靛蓝 + 衬线标题）
