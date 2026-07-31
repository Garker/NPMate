# Renderer Services

该目录仅放置 renderer 可调用的类型安全服务封装。

任何文件系统、命令执行、数据库与密钥操作都不得在 renderer 中直接实现，必须通过 preload + IPC。

- `projects.service.ts`：项目管理 IPC 封装。
- `packages.service.ts`：依赖读取和包管理命令 IPC 封装。
- `registry.service.ts`：npm Registry 搜索与包详情 IPC 封装。
- `analysis.service.ts`：升级、依赖图和 node_modules 分析 IPC 封装。
- `ai.service.ts`：AI 配置、连接测试与 Assistant IPC 封装。
- `system.service.ts`：环境、Registry 与操作历史 IPC 封装。
