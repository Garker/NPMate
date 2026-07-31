# NPMate Release Notes

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

### 发布前检查

当前文件是本地验证构建，尚未配置品牌图标、Apple Developer ID 签名和 notarization。公开分发前需要补齐这些平台凭据，并在 Windows、Linux 构建机分别生成和验证对应产物。
