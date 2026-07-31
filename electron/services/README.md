# Electron Services

该目录按以下职责拆分：

- `project.service.ts`：项目扫描、元数据读取。（Phase 2 已实现）
- `package-manager.service.ts`：依赖读取、安全子进程执行与统一编排。（Phase 3 已实现）
- `npm.service.ts`：npm 参数映射。（Phase 3 已实现）
- `pnpm.service.ts`：pnpm 参数映射。（Phase 3 已实现）
- `yarn.service.ts`：yarn 参数映射。（Phase 3 已实现）
- `package.service.ts`：npm Registry 搜索、包详情、README、版本与下载统计。（Phase 4 已实现）
- `analysis.service.ts`：升级检查、依赖树、体积排行和重复依赖分析。（Phase 5 已实现）
- `environment.service.ts`：工具链检测与 Registry 管理。（Phase 7 已实现）
- `history.service.ts`：包管理操作历史持久化。（Phase 7 已实现）
- `ai.service.ts`：模型配置、加密凭据、多 Provider 与只读 Package Assistant Agent。（Phase 6 已实现）

所有命令均通过参数数组调用 `spawn`，不启用 shell。Registry 与 AI 逻辑仍保持阶段占位。
