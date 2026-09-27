# Antigravity IDE Windows 配置迁移指南

本目录包含从当前 macOS 环境提取的 Antigravity IDE 核心配置，可直接迁移至 Windows 系统。

## 1. 配置文件放置路径

在 Windows 上，按下 `Win + R` 键，输入 `%APPDATA%\Antigravity IDE\User` 并回车，将本目录下的以下文件复制进去覆盖即可：

- `keybindings.json` → `%APPDATA%\Antigravity IDE\User\keybindings.json`
- `settings.json` → `%APPDATA%\Antigravity IDE\User\settings.json`

> **提示**：如果对应目录或文件不存在，直接新建即可。

---

## 2. 快捷键生效说明

- **Markdown 预览切换**：按 `Ctrl + Q`（Windows 下就是标准的 `Ctrl + Q`）
  - 源码状态下按 `Ctrl + Q`：直接切到预览。
  - 预览状态下按 `Ctrl + Q`：直接切回源码。

---

## 3. 插件安装方式

### 方式 A：在 Antigravity IDE 扩展市场搜索安装（推荐）
在左侧扩展面板搜索并安装以下核心插件：
- `bierner.markdown-mermaid` (Markdown Preview Mermaid Support)
- `mechatroner.rainbow-csv` (Rainbow CSV / TSV 高亮)
- `anthropic.claude-code` (Claude Code)
- `ms-ceintl.vscode-language-pack-zh-hans` (中文语言包)

### 方式 B：PowerShell 批量安装
在 Windows 命令行/PowerShell 中执行（需确保命令行中有 `antigravity` 或通过 IDE 集成终端）：
```powershell
Get-Content extensions.txt | Where-Object { $_ -notmatch '^#' -and $_.Trim() -ne '' } | ForEach-Object {
    antigravity --install-extension $_
}
```
