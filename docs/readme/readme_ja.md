<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../../assets/logo-light.png" />
    <img src="../../assets/logo-dark.png" alt="MyDevTools ロゴ" width="80" height="80" />
  </picture>
</p>

<h1 align="center">MyDevTools</h1>

<p align="center">
  <strong>オフラインで動く開発者ワークステーション</strong>
</p>

<p align="center">
  80 以上の開発者ツール、API クライアント、SQL / MongoDB / Redis クライアント、<br />
  暗号化ツール、生産性ユーティリティ — すべてあなたのマシン上でローカルに動作します。
</p>

<p align="center">
  <strong>無料 · オープンソース · オフライン · アカウント不要 · 広告なし</strong>
</p>

<p align="center">
  <a href="https://github.com/mydevtools-tech/mydevtools/releases/latest"><img src="https://img.shields.io/github/v/release/mydevtools-tech/mydevtools?style=flat-square&label=release&color=6d7cf5" alt="最新リリース" /></a>
  <a href="https://github.com/mydevtools-tech/mydevtools/actions/workflows/ci.yml"><img src="https://github.com/mydevtools-tech/mydevtools/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI" /></a>
  <a href="https://github.com/mydevtools-tech/mydevtools/releases"><img src="https://img.shields.io/github/downloads/mydevtools-tech/mydevtools/total?style=flat-square&color=22c55e" alt="ダウンロード数" /></a>
  <a href="../../LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue?style=flat-square" alt="ライセンス AGPL-3.0" /></a>
  <a href="https://github.com/mydevtools-tech/mydevtools/stargazers"><img src="https://img.shields.io/github/stars/mydevtools-tech/mydevtools?style=flat-square&color=f59e0b" alt="GitHub スター" /></a>
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
  <a href="https://github.com/mydevtools-tech/mydevtools/releases/latest"><strong>⬇️ ダウンロード</strong></a> •
  <a href="https://mydevtools.tech"><strong>🌐 ウェブサイト</strong></a> •
  <a href="https://mydevtools.tech/help"><strong>📚 ドキュメント</strong></a> •
  <a href="../../CHANGELOG.md">📋 変更履歴</a> •
  <a href="../../ROADMAP.md">🗺️ ロードマップ</a> •
  <a href="../../CONTRIBUTING.md">🤝 コントリビュート</a> •
  <a href="https://github.com/mydevtools-tech/mydevtools/discussions">💬 ディスカッション</a>
</p>

<!-- hero: drop assets/hero-dark.png + assets/hero-light.png (see assets/SHOT_LIST.md), then uncomment.
<p align="center">
  <img src="../../assets/hero-dark.png#gh-dark-mode-only" alt="MyDevTools desktop app — dashboard (dark)" width="900" />
  <img src="../../assets/hero-light.png#gh-light-mode-only" alt="MyDevTools desktop app — dashboard (light)" width="900" />
</p>
-->

> これは [英語版 README](../../README.md) の翻訳です。英語版が正式版であり、
> より新しい内容を含んでいる場合があります。修正は歓迎します —
> [Translations](../../CONTRIBUTING.md#translations) をご覧ください。

---

## MyDevTools とは？

MyDevTools は、開発者が毎日開く大量のタブ、単機能のウェブサイト、用途ごとのアプリ
をまとめて置き換える**デスクトップアプリケーション**です。フォーマッター、
コンバーター、ジェネレーター、暗号ユーティリティ、API クライアント、
SQL / MongoDB / Redis クライアント、ノート、スニペット、認証情報の保管庫 —
1 つのアプリ、1 つの検索ボックス、1 つのキーボードショートカットで完結します。

動作するのはあなたのマシン上です。MyDevTools のサーバーも、アカウントも、同期もありません。

| よくある構成 | MyDevTools |
|---|---|
| 単機能ツールサイトのタブが十数個 | デスクトップアプリ 1 つ、`⌘K` でどこへでも |
| 整形するためにデータをサーバーへ送信するツール | 処理はあなたのマシン上で完結 |
| 会員登録の壁とライセンスキー | アカウントなし、サインインなし、アクティベーションなし |
| SQL・MongoDB・Redis で別々のアプリ | SQL + MongoDB + Redis + S3 を 1 か所で |
| 基本的なユーティリティにも有料プラン | 無料 — すべてのツール、すべての機能 |
| 監査できないクローズドソースのツール | AGPL-3.0、アプリ全体がこのリポジトリにあります |

---

## 📦 インストール

| プラットフォーム | 方法 |
|---|---|
| **macOS**（Apple Silicon + Intel） | [最新の `.dmg` をダウンロード](https://github.com/mydevtools-tech/mydevtools/releases/latest) — ユニバーサルビルド、署名・公証済み、アプリ内で自動更新 |
| **Linux** (x86_64) | [`.deb` をダウンロード](https://github.com/mydevtools-tech/mydevtools/releases/latest/download/MyDevTools-amd64.deb)(Debian / Ubuntu 22.04 以降)または [AppImage](https://github.com/mydevtools-tech/mydevtools/releases/latest/download/MyDevTools-x86_64.AppImage)(インストール不要でどこでも動作)— macOS と同じリリース・同じバージョンです。アプリ内アップデートは未対応。[Linux インストールガイド](https://mydevtools.tech/linux-builds) を参照 |
| **Windows** | 当面ビルドは提供しません。Tauri シェルは Windows でもコンパイルできます — [ソースからのビルド](../../README.md#%EF%B8%8F-building-from-source) と [ロードマップ](../../ROADMAP.md) を参照してください |

開いたらすぐに使えます。会員登録も設定も API キーも不要です。

---

## 🧰 ツール

80 以上のツールを、サイドバーと同じグループに分けて掲載しています。説明付きの
完全な一覧は [英語版 README](../../README.md#-tools) にあります。

| カテゴリ | 例 |
|---|---|
| 📝 **フォーマッター & バリデーター** | JSON フォーマッター、JSON Visualizer、JSON 差分、JSONスキーマジェネレーター、JSON to Code、YAMLフォーマッター、フォーマット変換（JSON / YAML / TOML / XML）、SQL Formatter、GraphQL フォーマッター、Markdownプレビュー、Diff checker、Regex Tester |
| 🌐 **ネットワーク & API** | APIクライアント（コレクション、環境、認証、gRPC、モックサーバー — ブラウザの CORS 制限なし）、cURL to Code、Webhook テスター、WebSocket テスター、DNS ルックアップ、Whois 検索、IP／サブネット計算、HTTPステータスコード、User-Agent Parser |
| 🗄️ **データベース & ストレージクライアント** | SQL Client（PostgreSQL、MySQL、MariaDB）、データベースエクスプローラー（MongoDB）、Redis Commander、S3 Drive（AWS S3、DigitalOcean Spaces） — ネイティブ Rust ドライバーで、あなたのマシンからデータベースへ直接つながります |
| 🔐 **セキュリティ & 暗号** | パスワードマネージャー、暗号化プレイグラウンド（AES-GCM）、JWTデコーダー、ハッシュ生成、HMACジェネレーター、Bcrypt、TOTP / 2FA コード、SSH / RSAキージェネレーター、証明書 / PEM デコーダ、環境変数マネージャー、シークレット / APIキー |
| 🔄 **コンバーター** | Base64、画像をBase64に変換、URL Encoder / URL パーサー、Escape / Encode、String Case Converter、String Inspector、Line Sort & Dedupe、CSV / Excel ↔ JSON、基数変換、Timestamp Converter / タイムゾーン変換、単位変換器、Chmod 計算機、LLM トークンカウンター |
| ⚙️ **ジェネレーター** | UUID / ULID、モックデータジェネレーター、Cron Builder、Docker Compose ジェネレーター、.gitignore ジェネレーター、QRコード生成、Markdown テーブル、Lorem Ipsum |
| 🎨 **メディア & デザイン** | Color Picker、コントラストチェッカー、CSS グラデーション ビルダー、CSS ジェネレーター、画像圧縮、SVG 最適化、EXIF ビューアー & リムーバー、Favicon ジェネレーター、コードスクリーンショット、キーコードインスペクター |
| 📱 **生産性** | Notes、コードスニペット、Tasks、ブックマーク、API Keys、休憩室（2048、Sudoku、Snake、Minesweeper、Tetris） |

すべて 1 つのコマンドパレットから検索でき、ダーク / ライトモード、27 言語に対応しています。

---

## 🔒 設計段階からのプライバシー

- **MyDevTools のサーバーはありません。** サインインするバックエンドも、同期
  サービスも、アカウントの仕組みもありません。ツールの入力、ノート、スニペット、
  タスク、ブックマークはローカルの SQLCipher データベースに書き込まれ、OS の
  キーチェーンが保持する鍵で暗号化されます。
- **認証情報は保管庫で暗号化されます。** データベースのパスワード、API キー、
  パスワードマネージャーの項目は、あなただけが知るマスターパスワードでローカルに
  暗号化されます。
- **外部への通信はすべてあなたが選びます。** アプリ自体はネットワークを必要と
  しませんが、一部のツールは *あなたの* 接続先と通信するために存在します。API
  クライアントはあなたが書いたリクエストを送信し、データベースクライアントは
  あなたが設定したホストへ接続し、DNS / WHOIS ルックアップは公開レジストリへ
  問い合わせ、アップデーターは GitHub のリリースを確認します。それ以外は何も
  外に出ません。
- **利用統計は任意・匿名です。** 自分でオンにしない限り無効です。オンの場合は
  2 つのイベント（`app_started`、`tool_opened`）が、ローテーションするセッション
  ID、アプリのバージョン、ロケールとともに送信されます。デバイス ID も、パスも、
  ツールに入力した内容も送りません。
- **監査できます。** AGPL-3.0。ここに書いた内容はすべてこのリポジトリにあります —
  実際に読んで確かめてください。

---

## 🏗️ アーキテクチャ

Tauri v2 シェル（`apps/desktop`、Rust）の中で動く Next.js 16 / React 19 の UI
（`apps/desktop-ui`）です。ストレージは OS キーチェーン由来の鍵で保護された
SQLCipher、データベースドライバー、HTTP / gRPC、モックサーバーはネイティブ Rust
です。ウェブサイト（`apps/web`）はマーケティング専用で、ツールはそこでは動きません。
詳細: [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md)。

---

## 🛠️ ソースからのビルド

```bash
git clone https://github.com/mydevtools-tech/mydevtools.git
cd mydevtools
pnpm install
pnpm dev:desktop     # Tauri desktop app in dev mode
pnpm build:desktop   # build the desktop app
```

Node.js ≥ 22、pnpm ≥ 9、安定版の Rust が必要です。設定作業はありません — API
キーもアカウントもサービスも不要です。

---

## MyDevTools がカバーしない範囲

- 公開しているビルドは今のところ **macOS のみ** です。
- **データベースクライアントは日常業務向け**であり、本格的な DBA スイートの
  代わりにはなりません — ビジュアルなスキーマデザイナーもマイグレーションツール
  もありません。
- **チーム向け機能はありません。** 共有ワークスペースも、同期も、共同編集も
  ありません。
- **性質上ネットワークが必要なツールもあります** — DNS、WHOIS、Webhook、API
  リクエスト、データベース接続。

---

## 🤝 コントリビューション

コントリビューションを歓迎します — バグ修正、新しいツール、UI の改善、翻訳、
ドキュメント、どれも大歓迎です。まずは [CONTRIBUTING.md](../../CONTRIBUTING.md)
から。[`good first issue`](https://github.com/mydevtools-tech/mydevtools/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
ラベルの付いた issue は、初めての方向けに範囲を絞ってあります。

この翻訳や `apps/desktop-ui/messages/` のロケールファイルの改善には、Rust も
ビルドも必要ありません。

| | |
|---|---|
| 🐛 バグを報告 · ✨ 機能をリクエスト | [Issue テンプレート](https://github.com/mydevtools-tech/mydevtools/issues/new/choose) |
| 💬 質問する | [Discussions](https://github.com/mydevtools-tech/mydevtools/discussions) · [SUPPORT.md](../../SUPPORT.md) |
| 🔒 脆弱性を報告 | [SECURITY.md](../../SECURITY.md) — 公開 issue ではなく、非公開で |
| 🗺️ 今後の予定を見る | [ROADMAP.md](../../ROADMAP.md) |
| 🤝 コミュニティの行動指針 | [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md) |

---

## ⭐ プロジェクトを支援する

MyDevTools は無料で、有料プランはなく、今後も作りません。時間の節約になったら、
リポジトリにスターを付ける、[GitHub でスポンサーになる](https://github.com/sponsors/itsmeakhil)、
チームメイトに教える — どれでも力になります。

---

## 📄 ライセンス

[GNU Affero General Public License v3.0](https://www.gnu.org/licenses/agpl-3.0.html) — [LICENSE](../../LICENSE) を参照してください。

<p align="center">
  <a href="https://github.com/itsmeakhil">Akhil</a> と <a href="https://github.com/mydevtools-tech/mydevtools/graphs/contributors">コントリビューター</a> が ❤️ を込めて作りました
</p>
