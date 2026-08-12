# 零基础学AI平台 · 开发进度对接

> 本文档仅记录**当前开发进展**与联调信息，供前后端协作使用。

---

## 一、后端进度（Java 21 + Spring Boot 3，端口 8080）

### 1.1 当前已完成

| 功能 | 说明 |
|------|------|
| auth | 注册 / 登录 / JWT 签发 / 登录失败锁定（连续 5 次锁 15 分钟） |
| health | 健康检查（数据库 / Redis / DeepSeek 状态） |
| 基础能力 | 统一响应 `{success,data,error}`、全局异常、JWT 鉴权、Redis 限流、AI 网关（日配额 / 熔断重试） |

### 1.2 待开发模块（按实施顺序）

| 阶段 | 模块 | 状态 |
|------|------|------|
| 2 | chat（苏格拉底对话）、learning（学习地图） | ⏳ 未开始 |
| 3 | works（作品工厂）、templates（积木模板）、share（作品分享） | ⏳ 未开始 |
| 4 | badges（徽章）、compare（智能对比） | ⏳ 未开始 |
| 5 | lab（提示词实验室）、profile（个人资料） | ⏳ 未开始 |

### 1.3 接口现状（前端当前可联调的）

**已可用：**

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/api/auth/register` | 否 | 注册，返回 `{user, token}` |
| POST | `/api/auth/login` | 否 | 登录，返回 `{user, token}` |
| GET | `/api/health` | 否 | 健康检查 |

**未实现：** 其余 27 个接口（完整契约见根目录《接口文档.md》第十三章「接口总览」）。

### 1.4 联调约定

- **Base URL**：`http://localhost:8080`
- **鉴权方式**：请求头 `Authorization: Bearer <token>`（token 由注册/登录返回，有效期 7 天）
- **统一响应**：`{ "success": boolean, "data": object|null, "error": string|null }`
- **错误码**：`400` 参数错误 / `401` 未登录或过期 / `403` 越权 / `404` 资源不存在 / `429` 限流 / `500` 服务器异常
- **CORS**：已放行 `http://localhost:5173`（前端开发端口）

### 1.5 后端启动方式（联调前）

```bash
# 1. 启动 MySQL + Redis（已提供 docker-compose）
docker-compose up -d mysql redis

# 2. 配置环境变量
export DEEPSEEK_API_KEY=sk-xxxx            # AI 功能必需
export JWT_SECRET=<至少32位随机字符串>

# 3. 启动后端（含自带的 Maven Wrapper，无需全局 Maven）
./mvnw spring-boot:run        # Windows：mvnw.cmd spring-boot:run

# 4. 验证
curl http://localhost:8080/api/health
```

---

## 二、前端进度（React 18 + Vite + TS，端口 5173）

### 2.1 当前状态

- **前端工程尚未创建**，无任何代码。
- 规划技术栈：React 18 + TypeScript + Vite + Tailwind CSS + Zustand + React Router。

### 2.2 前端待建（对接后端时参照）

| 页面/模块 | 依赖的后端接口 | 备注 |
|-----------|--------------|------|
| 登录 / 注册页 | `/api/auth/register`、`/api/auth/login` | 可先行联调（后端已就绪） |
| 学习地图（首页） | `/api/learning/progress`（未实现） | 待后端阶段 2 |
| 苏格拉底对话 | `/api/chat/*`（未实现） | 待后端阶段 2，核心模块 |
| 作品工厂 | `/api/works/*`（未实现） | 待后端阶段 3 |
| 积木构建器 | `/api/templates/*`（未实现） | 待后端阶段 3 |
| 个人中心 | `/api/profile`、`/api/badges`（未实现） | 待后端阶段 4-5 |

### 2.3 前端对接待办

- [ ] 初始化 React + Vite 工程
- [ ] 封装统一请求层（axios + 拦截器：自动携带 token、统一错误提示、401 跳登录）
- [ ] 联调登录 / 注册（后端已可用）

---

> 更新日期：2026-08-12
