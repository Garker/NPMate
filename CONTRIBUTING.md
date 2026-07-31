# Contributing to NPMate

感谢你参与 NPMate。

## 开发环境

- Node.js 20 或更高版本
- [Bun](https://bun.sh/) 1.1 或更高版本

```bash
git clone https://github.com/Garker/NPMate.git
cd NPMate
bun install --frozen-lockfile
bun run dev
```

提交改动前请运行：

```bash
bun run typecheck
bun run lint
bun run build
```

## Pull Request

1. 从 `main` 创建功能分支。
2. 每个 PR 聚焦于一个明确问题，并说明行为变化和验证方法。
3. UI 变更请附截图；关联已有 Issue 时请在描述中引用。
4. 不要提交 API Key、数据库、`out/`、`release/` 或其他构建产物。

提交贡献即表示你同意按项目的 [MIT License](LICENSE) 授权你的贡献。
