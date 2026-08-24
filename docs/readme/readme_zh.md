<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../../assets/logo-light.png" />
    <img src="../../assets/logo-dark.png" alt="MyDevTools 徽标" width="80" height="80" />
  </picture>
</p>

<h1 align="center">MyDevTools</h1>

<p align="center">
  <strong>离线开发者工作台</strong>
</p>

<p align="center">
  80+ 个开发者工具、API 客户端，SQL / MongoDB / Redis 客户端、加密<br />
  与效率工具 —— 全部在你自己的机器上本地运行。
</p>

<p align="center">
  <strong>免费 · 开源 · 离线 · 无需账号 · 无广告</strong>
</p>

<p align="center">
  <a href="https://github.com/mydevtools-tech/mydevtools/releases/latest"><img src="https://img.shields.io/github/v/release/mydevtools-tech/mydevtools?style=flat-square&label=release&color=6d7cf5" alt="最新版本" /></a>
  <a href="https://github.com/mydevtools-tech/mydevtools/actions/workflows/ci.yml"><img src="https://github.com/mydevtools-tech/mydevtools/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI" /></a>
  <a href="https://github.com/mydevtools-tech/mydevtools/releases"><img src="https://img.shields.io/github/downloads/mydevtools-tech/mydevtools/total?style=flat-square&color=22c55e" alt="下载量" /></a>
  <a href="../../LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue?style=flat-square" alt="许可证 AGPL-3.0" /></a>
  <a href="https://github.com/mydevtools-tech/mydevtools/stargazers"><img src="https://img.shields.io/github/stars/mydevtools-tech/mydevtools?style=flat-square&color=f59e0b" alt="GitHub star 数" /></a>
</p>

<p align="center">
  <a href="../../README.md">English</a>
  | <a href="readme_zh.md">简体中文</a>
  | <a href="readme_ja.md">日本語</a>
  | <a href="readme_ko.md">한국어</a>
  | <a href="readme_es.md">Español</a>
  | <a href="readme_pt-BR.md">Português (BR)</a>
  | <a href="readme_de.md">Deutsch</a>
  | <a href="readme_fr.md">Français</a>
  | <a href="readme_hi.md">हिन्दी</a>
</p>

<p align="center">
  <a href="https://github.com/mydevtools-tech/mydevtools/releases/latest"><strong>⬇️ 下载</strong></a> •
  <a href="https://mydevtools.tech"><strong>🌐 官网</strong></a> •
  <a href="https://mydevtools.tech/help"><strong>📚 文档</strong></a> •
  <a href="../../CHANGELOG.md">📋 更新日志</a> •
  <a href="../../ROADMAP.md">🗺️ 路线图</a> •
  <a href="../../CONTRIBUTING.md">🤝 参与贡献</a> •
  <a href="https://github.com/mydevtools-tech/mydevtools/discussions">💬 讨论区</a>
</p>

<!-- hero: drop assets/hero-dark.png + assets/hero-light.png (see assets/SHOT_LIST.md), then uncomment.
<p align="center">
  <img src="../../assets/hero-dark.png#gh-dark-mode-only" alt="MyDevTools desktop app — dashboard (dark)" width="900" />
  <img src="../../assets/hero-light.png#gh-light-mode-only" alt="MyDevTools desktop app — dashboard (light)" width="900" />
</p>
-->

> 本文是 [英文 README](../../README.md) 的翻译版本，英文版为准，且可能更新更及时。
> 欢迎提交修正 —— 参见
> [翻译说明](../../CONTRIBUTING.md#translations)。

---

## MyDevTools 是什么？

MyDevTools 是一款**桌面应用**，用来取代开发者每天打开的一堆标签页、临时工具站
和单一用途的小应用。格式化工具、转换器、生成器、加密工具、API 客户端，
SQL / MongoDB / Redis 客户端、笔记、代码片段和凭据保险库 —— 一个应用、
一个搜索框、一个快捷键。

它运行在你自己的机器上。没有 MyDevTools 服务器，没有账号，也没有云同步。

| 通常的做法 | MyDevTools |
|---|---|
| 十几个单一用途工具站的标签页 | 一个桌面应用，`⌘K` 直达任意工具 |
| 只为格式化就把数据上传到服务器的工具 | 处理全部在你的机器上完成 |
| 注册墙和许可证密钥 | 无需账号、无需登录、无需激活 |
| SQL、MongoDB 和 Redis 各装一个应用 | SQL + MongoDB + Redis + S3 集中在一处 |
| 基础工具还要按档位付费 | 完全免费 —— 每个工具、每项功能 |
| 无法审计的闭源工具 | AGPL-3.0，整个应用都在这个仓库里 |

---

## 📦 安装

| 平台 | 方式 |
|---|---|
| **macOS**（Apple Silicon + Intel） | [下载最新的 `.dmg`](https://github.com/mydevtools-tech/mydevtools/releases/latest) —— 通用版本，已签名并公证，支持应用内自动更新 |
| **Linux**(x86_64) | [下载 `.deb`](https://github.com/mydevtools-tech/mydevtools/releases/latest/download/MyDevTools-amd64.deb)(Debian / Ubuntu 22.04+)或 [AppImage](https://github.com/mydevtools-tech/mydevtools/releases/latest/download/MyDevTools-x86_64.AppImage)(免安装、随处运行)—— 与 macOS 同一发布、同一版本。暂无应用内更新；参见 [Linux 安装指南](https://mydevtools.tech/linux-builds) |
| **Windows** | 暂不提供构建。Tauri 外壳可在 Windows 上编译 —— 参见[从源码构建](../../README.md#%EF%B8%8F-building-from-source)和[路线图](../../ROADMAP.md) |

打开即用：无需注册、无需配置、无需 API 密钥。

---

## 🧰 工具

80+ 个工具，按侧边栏的分组方式排列。带说明的完整列表见
[英文 README](../../README.md#-tools)。

| 分类 | 示例 |
|---|---|
| 📝 **格式化与校验** | JSON 格式化器、JSON Visualizer、JSON 对比、JSON 模式生成器、JSON to Code、YAML 格式化工具、格式转换器（JSON / YAML / TOML / XML）、SQL Formatter、GraphQL 格式化、Markdown 预览、Diff checker、Regex Tester |
| 🌐 **网络与 API** | API 客户端（集合、环境、鉴权、gRPC、mock 服务器 —— 不受浏览器 CORS 限制）、cURL to Code、Webhook 测试器、WebSocket 测试器、DNS 查询、Whois 查询、IP / 子网计算器、HTTP 状态码、User-Agent Parser |
| 🗄️ **数据库与存储客户端** | SQL Client（PostgreSQL、MySQL、MariaDB）、数据库浏览器（MongoDB）、Redis Commander、S3 Drive（AWS S3、DigitalOcean Spaces）—— 原生 Rust 驱动，从你的机器直连数据库 |
| 🔐 **安全与加密** | 密码管理器、加密演练场（AES-GCM）、JWT 解码器、哈希生成器、HMAC 生成器、Bcrypt、TOTP / 2FA 验证码、SSH / RSA 密钥生成器、证书 / PEM 解码器、环境管理、密钥 / API 密钥 |
| 🔄 **转换器** | Base64、图像转 Base64、URL Encoder / 解析器、Escape / Encode、String Case Converter、String Inspector、Line Sort & Dedupe、CSV / Excel ↔ JSON、进制转换、Timestamp / 时区转换器、单位换算器、Chmod 计算器、LLM Token 计数器 |
| ⚙️ **生成器** | UUID / ULID、模拟数据生成器、Cron Builder、Docker Compose 生成器、.gitignore 生成器、二维码生成器、Markdown 表格、Lorem Ipsum |
| 🎨 **媒体与设计** | Color Picker、对比度检查、CSS 渐变生成器、CSS 生成器、图片压缩、SVG 优化、EXIF 查看器与清除、Favicon 生成器、代码截图、键码检查器 |
| 📱 **效率工具** | Notes、代码片段、Tasks、书签、API Keys、休闲角（2048、数独、Snake、Minesweeper、Tetris） |

所有工具都能在同一个命令面板中搜索，支持深色 / 浅色主题，提供 27 种语言。

---

## 🔒 隐私优先的设计

- **没有 MyDevTools 服务器。** 没有需要登录的后端，没有同步服务，也没有账号
  体系。工具输入、笔记、代码片段、任务和书签都写入本地 SQLCipher 数据库，
  密钥保存在操作系统钥匙串中加密。
- **凭据由保险库加密。** 数据库密码、API 密钥和密码管理器条目，都用只有你知道
  的主密码在本地加密。
- **每一次对外连接都由你决定。** 应用本身不需要网络，但有些工具的职责就是访问
  *你的*目标：API 客户端发送你写的请求，数据库客户端连接你配置的主机，
  DNS / WHOIS 查询公共注册局，更新器检查 GitHub releases。除此之外没有任何数据外发。
- **可选的匿名使用统计。** 默认关闭，除非你主动开启。开启后只发送两个事件
  （`app_started`、`tool_opened`），附带轮换的会话 id、应用版本和语言环境。
  没有设备 id，没有路径，也没有你在工具里输入的任何内容。
- **可审计。** AGPL-3.0。上面这些说法的依据都在这个仓库里 —— 自己读。

---

## 🏗️ 架构

Tauri v2 外壳（`apps/desktop`，Rust）内运行 Next.js 16 / React 19 编写的界面
（`apps/desktop-ui`）。存储使用 SQLCipher，密钥来自操作系统钥匙串；数据库驱动、
HTTP / gRPC 和 mock 服务器均为原生 Rust 实现。官网（`apps/web`）只做市场推广，
工具不在那里运行。
详见 [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md)。

---

## 🛠️ 从源码构建

```bash
git clone https://github.com/mydevtools-tech/mydevtools.git
cd mydevtools
pnpm install
pnpm dev:desktop     # Tauri desktop app in dev mode
pnpm build:desktop   # build the desktop app
```

需要 Node.js ≥ 22、pnpm ≥ 9 和 stable Rust。没有任何配置步骤 —— 不需要
API 密钥、账号或外部服务。

---

## MyDevTools 的边界

- 目前发布的版本**仅支持 macOS**。
- **数据库客户端面向日常工作**，不是完整 DBA 套件的替代品 —— 没有可视化表结构
  设计器，也没有迁移工具。
- **没有团队功能。** 没有共享工作区，没有同步，没有协作。
- **有些工具天然需要网络** —— DNS、WHOIS、webhook、API 请求、数据库连接。

---

## 🤝 参与贡献

欢迎各种形式的贡献 —— 修复 bug、新增工具、打磨界面、翻译和文档都算。
先看 [CONTRIBUTING.md](../../CONTRIBUTING.md)；标记为
[`good first issue`](https://github.com/mydevtools-tech/mydevtools/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
的 issue 专为新人准备。

改进这份翻译，或是 `apps/desktop-ui/messages/` 里的某个语言文件，
既不需要 Rust，也不需要构建。

| | |
|---|---|
| 🐛 报告 bug · ✨ 提交功能建议 | [Issue 模板](https://github.com/mydevtools-tech/mydevtools/issues/new/choose) |
| 💬 提问 | [讨论区](https://github.com/mydevtools-tech/mydevtools/discussions) · [SUPPORT.md](../../SUPPORT.md) |
| 🔒 报告安全漏洞 | [SECURITY.md](../../SECURITY.md) —— 请私下报告，切勿发公开 issue |
| 🗺️ 查看规划 | [ROADMAP.md](../../ROADMAP.md) |
| 🤝 社区准则 | [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md) |

---

## ⭐ 支持项目

MyDevTools 是免费的，没有付费档位，将来也不会有。如果它帮你省下了时间，
可以给仓库点个 star、[在 GitHub 上赞助](https://github.com/sponsors/itsmeakhil)，
或者推荐给同事。

---

## 📄 许可证

[GNU Affero 通用公共许可证 v3.0](https://www.gnu.org/licenses/agpl-3.0.html) —— 参见 [LICENSE](../../LICENSE)。

<p align="center">
  由 <a href="https://github.com/itsmeakhil">Akhil</a> 和<a href="https://github.com/mydevtools-tech/mydevtools/graphs/contributors">贡献者们</a>用 ❤️ 打造
</p>
