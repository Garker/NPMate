# NPMate Release Notes

## 0.1.4

- 修复从 Finder 等图形界面启动时无法找到 nvm、fnm 或 Volta 管理的 Node.js/npm，导致依赖分析报 `spawn npm ENOENT` 的问题。
- “设置 → Node 环境 → 重新检测”现在会刷新登录 Shell 环境并正确显示工具版本。
- 包安装、升级、卸载与依赖树分析统一使用恢复后的命令环境。

## 0.1.3

- 新增 Bun 项目识别与安装、升级、卸载命令支持。
- 修复包管理页面在较窄工作区内标题和筛选控件布局错乱的问题。
- 已保存为 `unknown` 的项目会在启动时重新检测包管理器。
- 移除独立的“项目”导航页面，继续通过项目栏添加和切换项目。

## 0.1.1

- 修复 macOS 安装包启动时因 LangGraph SDK 嵌套依赖未被收集而出现的 `ERR_MODULE_NOT_FOUND`。
- 将 `langchain` 内联到 Electron 主进程 bundle，避免运行时依赖包管理器的私有目录结构。

## 自动发布流程

GitHub Actions 会在推送 `v*` 标签时，分别在 macOS、Windows 和 Linux runner 上构建安装包，生成 `electron-updater` 所需的 `latest*.yml` 与差分下载元数据、生成 `SHA256SUMS.txt`，然后创建 GitHub Release 并上传全部文件。

发布新版本：

```bash
# 先更新 package.json 中的 version 并合并到 main
git tag v0.2.0
git push origin v0.2.0
```

标签必须与 `package.json` 版本一致，否则构建会失败。也可以在 Actions 页面手动运行 Release 工作流，只构建并保留安装包 artifact，不创建正式 Release。

已安装的正式版本会在启动 5 秒后检查 GitHub Releases。发现新版本后，可在“设置 → 应用更新”中下载，并在下载完成后重启安装。开发模式不会访问更新服务。

> macOS 自动更新要求应用已使用 Developer ID 签名；未签名的本地构建只能用于验证界面与发布元数据。

### 代码签名

默认工作流显式关闭自动证书发现，产物不带商业代码签名。要公开提供已签名/公证的安装包，需要在仓库 Secrets 中配置 Apple Developer ID、公证凭据和 Windows 代码签名证书，并相应扩展 Release 工作流。

## 0.1.0

Phase 1–7 的本地桌面功能已经完成，并生成 macOS arm64 验证产物。

### 当前产物

- `release/NPMate-0.1.0-mac-arm64.dmg`
- `release/NPMate-0.1.0-mac-arm64.zip`
- `release/mac-arm64/NPMate.app`

### SHA-256

```text
3c3390698208a5b1c06bb72f4648aed06a2078277f344e8e8570dde2ab680f85  NPMate-0.1.0-mac-arm64.dmg
298c711ecd5b1b2dad370889e4e62d7a1e4f9d92e871555d59b071b2ec4d8f0c  NPMate-0.1.0-mac-arm64.zip
```

### 历史构建说明

当前文件是本地验证构建，尚未配置品牌图标、Apple Developer ID 签名和 notarization。公开分发前需要补齐这些平台凭据，并在 Windows、Linux 构建机分别生成和验证对应产物。
