# Git Hooks 说明

本目录存放仓库共享的 git hooks（随仓库提交，clone 后需启用一次）。

## 启用手动执行一次

```bash
git config core.hooksPath .githooks
```

> `core.hooksPath` 是本地配置，不会随仓库提交，每个克隆者需执行一次。
> 已在本机执行过，可直接使用。

## 包含的 hooks

| Hook | 校验内容 |
|------|---------|
| `commit-msg` | 提交信息格式 `<type>(<scope>): <描述>`，type ∈ feat/fix/docs/style/refactor/test/chore/build/ci |
| `pre-commit` | 禁止在 `master` 分支直接提交；禁止误提交构建产物（target/node_modules/dist/build）与密钥（.env/.jar/.key/.pem/.log） |
| `pre-push` | 禁止直接 push 到 `master` |

## 临时跳过（不推荐）

```bash
git commit --no-verify     # 跳过 commit 钩子
git push --no-verify       # 跳过 push 钩子
```
