# 内置「类豆包」全局 AI 助手 · 方案 v1

> 版本基线：develop（`2dd8fec`，2026-09-06 迭代后）
> 决策已锁定：**模型走 DeepSeek（AiGateway 现有通道）· 入口为全局悬浮气泡 + 抽屉 · 本文件为方案 v1**
> 更新日期：2026-09-07

---

## 一、目标与定位

让平台在苏格拉底对话模块之外，有一个**全站随时可唤起的对话助手**——形态与体验对齐「豆包」（即点即聊、边说边出字、记住上下文），但能力收敛到本产品的核心：**教人写好提示词**。

**它是**：一个能答疑（提示词概念 / 平台玩法 / 学习路径）、能基于当前语境干活（分析正在写的提示词、按五要素点评、给改进建议）、记得每一段对话的全局助手。

**它不是**：豆包的全面复刻。一期明确不做——多模态识图、语音输入、联网搜索、插件生态、完整的任务式 Agent 编排。

**产品红线**（与品牌一致）：平台卖点是「提问的深度决定答案的高度」。助手回答必须**克制——优先引导式提问，不直接给成品答案**，避免把苏格拉底教法冲淡。这是与豆包类通用助手拉开差异的关键。

---

## 二、现状盘点（决定可行性的关键事实）

| 项 | 现状 | 影响 |
|---|---|---|
| AI 通道 | `AiGateway` 全站唯一出口：DeepSeek `/chat/completions` + Redis 日配额(50) + Resilience4j 熔断重试 + Prometheus 指标 | 助手直接挂载即继承配额/熔断/监控，**零成本** |
| 流式 | 全链路**非流式**（`AiHttpClient` 同步等整包，超时 30s） | 「边说边出字」的豆包感是**最大缺口** |
| 会话表 | `conversations` 为苏格拉底专属：`original_prompt`/`rating`/`max_rounds` NOT NULL | 通用助手需加类型字段区分，避免硬塞 |
| 消息表 | `messages.content VARCHAR(1000)`，type 仅 question/answer/summary | 助手长回复会超长 → 需扩 TEXT + 新 type |
| 前端结构 | ChatPage 气泡流、HistoryDrawer 抽屉、zustand store 模式成熟 | 浮窗助手全套复刻现有视觉/结构 |
| 上下文资产 | `promptScoring.ts`（五要素引擎）、学习地图/徽章进度 | 助手做「点评一段提示词」直接可用 |
| 页面层级 | 左侧分组导航 + 顶栏模块条；提示词实验室已下线 | 悬浮位独立于模块条，不挤占导航 |

**结论：高可行。** 工作量集中在两块增量（后端流式、前端全局入口），不动任何既有模块主链路。

---

## 三、总体架构

```
┌──────────── 前端（React 18） ────────────┐
│  AppLayout 常驻：FloatingBubble          │
│        └── AssistantDrawer（复刻 HistoryDrawer 结构）│
│            └── chatStore.assistant (zustand)        │
│                 │ POST /api/assistant/chat  (建立/续聊)│
│                 ▼                                     │
│  SSE 逐字渲染（打字机） ← EventSource  /api/assistant/stream │
└──────────────────────────────────────────────────────┘
                          │
┌──────────── 后端（Spring Boot 3 / Java 21） ──────────┐
│ modules/assistant                                    │
│   AssistantController  ── AssistantService           │
│        │                       │ 拼 system prompt     │
│        │                       ▼（含五要素教法/上下文）│
│        └── AiGateway（复用）──> AiHttpClient.chatStream（新增流式）
│                                  │ DeepSeek /chat/completions stream=true
│                                  ▼
│            SSE 解析（java.net.http 流式读行，不加新依赖）
└──────────────────────────────────────────────────────┘
```

设计要点：
- **厂商隔离**：仍在 `AiGateway` 下扩展流式方法，业务侧不感知厂商。未来切豆包 doubao-pro 仅改配置。
- **流式实现**：DeepSeek 返回 OpenAI 兼容 SSE（`data: {...}` 逐 chunk / `data: [DONE]`）。后端消费侧用 JDK `java.net.http.HttpClient` 按行解析（免引 WebFlux）；下发侧用 Spring MVC `SseEmitter`。熔断作用于**建连**，不回滚到整包。
- **配额**：助手独立记账（可设更高上限），不与苏格拉底抢每日 50 次。

---

## 四、分期规划

### P0 · 一期（MVP，建议先做）
> 目标：一个能聊、能记、能流式出字的全站助手。
- 后端 `modules/assistant`：建会话 / 发消息 / **SSE 流式** / 历史列表 / 删会话。
- 数据：`conversations` 加 `type`，消息表扩 TEXT 与 `chat` 类型。
- 前端：全局 `FloatingBubble` + `AssistantDrawer`（挂 `AppLayout`，全站可用）+ 流式渲染 + 本地持久会话恢复。
- System prompt v1：角色（Spark 学习助手）+ 五要素知识 + **引导优先规则** + 平台玩法说明。
- 验收：任意页面唤起 → 提问 → 字流式出现 → 关窗再开能续聊 → 已评分的提示词可被点评。

**量级：后端 3-4 人日 + 前端 3-4 人日（约 1-1.5 周）**

### P1 · 二期（上下文感知）
- 唤起时自动携带「当前页面/模块 + 正在编辑或刚评分的提示词」，后端注入 system prompt。
- 助手与苏格拉底对话互跳（从助手点评 → 一键进对应知识点练习）。
- 基于用户学习进度，会话内**主动给下一步学习建议**。
- 验收：在灵感广场复制一段提示词，助手能就地讲解怎么改。

**量级：前后端各 2-3 人日**

### P2 · 三期（工具调用，成为真 Agent）
- function calling：读用户作品/进度、触发评分引擎（`promptScoring.ts` 逻辑）等。
- 验收：对「帮我按五要素改这段」能实际产出结构化改进并写回。

**量级：后端 3-5 人日（依赖一期流式 + JSON 模式成熟度）**

### P3 · 看需求
语音输入/朗读、快捷指令（一键"改成营销风"）、多模态。**未排期。**

---

## 五、一期详细设计

### 5.1 数据模型（增量，不破坏苏格拉底）

```sql
-- conversations 增加通用会话类型
ALTER TABLE conversations
  ADD COLUMN conversation_type VARCHAR(20) NOT NULL DEFAULT 'socratic'
    COMMENT 'socratic=苏格拉底 / assistant=全局助手' AFTER user_id,
  ADD COLUMN title VARCHAR(100) NULL COMMENT '助手会话标题（自动生成）' AFTER topic_id,
  -- socratic 专属字段对 assistant 允许为空：放开 NOT NULL 或建独立 assistant_conversations 表（二选一，建议前者+轻约束）
  MODIFY COLUMN original_prompt VARCHAR(500) NULL;

-- messages：长文与类型
ALTER TABLE messages
  MODIFY COLUMN content TEXT NULL COMMENT '消息内容（助手长回复超出1000字）',
  MODIFY COLUMN message_type VARCHAR(20) NOT NULL DEFAULT 'chat' COMMENT 'question/answer/summary/chat';
```

> 备选方案：另建 `assistant_conversations` 独立表（不污染苏格拉底 DDL）。若团队希望两套演进互不干扰，推荐独立表；若想少一张表、走统一会话中心，则用 ALTER。**建议先按 ALTER 最小改动上线，独立表留作 P2 重构项。**

### 5.2 接口草案

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/assistant/conversations` | 新建助手会话（可带首条消息，返回 conv + 消息） |
| GET | `/api/assistant/conversations?status=` | 历史会话列表（复刻苏格拉底 history） |
| GET | `/api/assistant/conversations/{id}` | 单会话全量（回看用） |
| POST | `/api/assistant/stream` | 发消息并 **SSE 流式**返回（EventSource 兼容） |
| DELETE | `/api/assistant/conversations/{id}` | 删除（豆包式「新对话」需要清理） |

鉴权：复用 JWT 拦截链；游客可选「临时会话（不落库）」——与现有游客模式一致的降级。

### 5.3 System prompt v1 骨架

```
你是 Spark 平台的全局学习助手「提问导师」。
职责边界：
1) 讲解提示词概念、平台各模块玩法、四阶段学习路径。
2) 基于五要素（角色/任务/上下文/格式/约束）点评用户给出的提示词，指出缺失要素与改进方向。
3) 【红线】引导式教学：优先用提问促使用户自己想出答案，不直接给完整成品；
   仅在用户明确要成品、或连续引导无效时给「一版参考 + 为什么这样改」。
4) 上下文：若收到用户当前页面/正在编辑的提示词，先复述理解再点评。
5) 诚实：涉及平台未开放能力时明说不支持，不编造。
```

### 5.4 前端骨架

- `components/assistant/AssistantDrawer.tsx` + `FloatingBubble.tsx`（视觉复刻 HistoryDrawer / Spark 品牌）。
- `store/assistantStore.ts`（zustand）：会话列表 / 流式缓冲（拼接 SSE chunk）/ sending / error。
- 流式渲染：先渲染空气泡，SSE chunk 追加到可见文本（替代原 `sleep(700)` 假思考）。
- 入口：`AppLayout` 层右下角气泡；打开即历史会话列表（同苏格拉底）。
- **mock 边界**：助手**只走真实后端、不做 demo 模拟**，避免与 chatStore 里 demo-token 的本地模拟纠缠；游客给临时会话降级。

---

## 六、风险与对策

| 风险 | 说明 | 对策 |
|---|---|---|
| 配额耗尽 | 助手全局放开后，单日 50 次不够 | 为 assistant 类型独立配额项（`ai.assistant-daily-limit`，如 100+），Redis 同构 |
| 上下文无限膨胀 | 通用对话无 max_rounds 上限 | 服务端做窗口截断 + 超长摘要（摘要走一次廉价调用），控制 token 成本 |
| 回复超长 | 1000 字消息列溢出 | 一期 ALTER 扩 TEXT（见 5.1） |
| 内容合规/滥用 | 自由对话放大审核面 | 复用全站过滤思路 + 助手免责边界；不承诺事实性断言 |
| 流式稳定性 | 断连/熔断难回滚 | 熔断作用于建连；前端断线重连 + 手动重试，错误降级提示 |
| 教法冲淡 | 助手直接给成品，损害定位 | 红线写进 system prompt + 验收项含「引导优先」抽样检查 |
| 学习地图/雷达同步口径 | 与苏格拉底评分写回解耦 | 助手点评只读引擎(`promptScoring`)，不擅自写用户进度（P2 再做） |

---

## 七、依赖与前置

- 本方案与昨日迭代零冲突：不碰苏格拉底主链路、不依赖灵感广场接后端（上下文感知 P1 时才需要「当前提示词」来源稳定）。
- P1「当前提示词」来源建议优先取**苏格拉底对话中已评分的提示词**（已有实时面板），灵感广场投稿尚未落库，做上下文注入前需先接后端（见《版本迭代记录》遗留项）。

---

## 八、开放问题（开工前需你确认）

1. 助手是否给**游客**用？——建议给「临时会话、不落库」以保增长入口，但增加一条鉴权分支。
2. 「新对话」行为：历史清空即弃（豆包式）还是要「删除」语义？——建议前端只有「新对话」，删除接口留后端备查。
3. 助手会话是否需要接入学习地图的**徽章/成就**（如「首次求助助手」）？——建议 P1 再接。
