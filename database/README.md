# Database

Phase 2 已接入 SQLite 与 Drizzle ORM，用于保存项目扫描结果。

数据库文件在运行时创建于 Electron `userData` 目录，不写入源码目录。

后续阶段将在现有 schema 上增加模型配置和操作历史表。
## 数据表

- `projects`：项目扫描结果与软删除状态。
- `ai_settings`：Provider、Model、Base URL、Temperature 与加密后的 API Key。
- `operation_history`：安装、卸载、升级命令、退出码与截断后的执行输出。

API Key 只由 Electron 主进程通过 `safeStorage` 加解密，renderer 不读取明文。
