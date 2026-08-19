<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../../assets/logo-light.png" />
    <img src="../../assets/logo-dark.png" alt="MyDevTools 로고" width="80" height="80" />
  </picture>
</p>

<h1 align="center">MyDevTools</h1>

<p align="center">
  <strong>오프라인 개발자 워크스테이션</strong>
</p>

<p align="center">
  80개가 넘는 개발자 도구, API 클라이언트, SQL / MongoDB / Redis 클라이언트, 암호화<br />
  및 생산성 유틸리티 — 모두 내 컴퓨터에서 로컬로 실행됩니다.
</p>

<p align="center">
  <strong>무료 · 오픈 소스 · 오프라인 · 계정 불필요 · 광고 없음</strong>
</p>

<p align="center">
  <a href="https://github.com/mydevtools-tech/mydevtools/releases/latest"><img src="https://img.shields.io/github/v/release/mydevtools-tech/mydevtools?style=flat-square&label=release&color=6d7cf5" alt="최신 릴리스" /></a>
  <a href="https://github.com/mydevtools-tech/mydevtools/actions/workflows/ci.yml"><img src="https://github.com/mydevtools-tech/mydevtools/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI" /></a>
  <a href="https://github.com/mydevtools-tech/mydevtools/releases"><img src="https://img.shields.io/github/downloads/mydevtools-tech/mydevtools/total?style=flat-square&color=22c55e" alt="다운로드 수" /></a>
  <a href="../../LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue?style=flat-square" alt="라이선스 AGPL-3.0" /></a>
  <a href="https://github.com/mydevtools-tech/mydevtools/stargazers"><img src="https://img.shields.io/github/stars/mydevtools-tech/mydevtools?style=flat-square&color=f59e0b" alt="GitHub 스타" /></a>
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
  <a href="https://github.com/mydevtools-tech/mydevtools/releases/latest"><strong>⬇️ 다운로드</strong></a> •
  <a href="https://mydevtools.tech"><strong>🌐 웹사이트</strong></a> •
  <a href="https://mydevtools.tech/help"><strong>📚 문서</strong></a> •
  <a href="../../CHANGELOG.md">📋 변경 내역</a> •
  <a href="../../ROADMAP.md">🗺️ 로드맵</a> •
  <a href="../../CONTRIBUTING.md">🤝 기여하기</a> •
  <a href="https://github.com/mydevtools-tech/mydevtools/discussions">💬 토론</a>
</p>

<!-- hero: drop assets/hero-dark.png + assets/hero-light.png (see assets/SHOT_LIST.md), then uncomment.
<p align="center">
  <img src="../../assets/hero-dark.png#gh-dark-mode-only" alt="MyDevTools desktop app — dashboard (dark)" width="900" />
  <img src="../../assets/hero-light.png#gh-light-mode-only" alt="MyDevTools desktop app — dashboard (light)" width="900" />
</p>
-->

> 이 문서는 [영문 README](../../README.md)의 번역본입니다. 영문판이 원본이며 더
> 최신일 수 있습니다. 수정 제안은 언제든 환영합니다 —
> [Translations](../../CONTRIBUTING.md#translations)를 참고하세요.

---

## MyDevTools란?

MyDevTools는 개발자가 매일 열어 두는 수많은 탭, 일회성 웹사이트, 단일 목적 앱을
대체하는 **데스크톱 애플리케이션**입니다. 포매터, 변환기, 생성기, 암호화
유틸리티, API 클라이언트, SQL / MongoDB / Redis 클라이언트, 노트, 스니펫, 자격
증명 볼트까지 — 앱 하나, 검색창 하나, 단축키 하나로 끝납니다.

모든 처리는 내 컴퓨터에서 이루어집니다. MyDevTools 서버도, 계정도, 동기화도 없습니다.

| 일반적인 환경 | MyDevTools |
|---|---|
| 단일 기능 도구 사이트 탭 십여 개 | 데스크톱 앱 하나, `⌘K`로 어디든 이동 |
| 포맷하겠다고 데이터를 서버로 업로드하는 도구 | 모든 처리는 내 컴퓨터에서 |
| 가입 장벽과 라이선스 키 | 계정 없음, 로그인 없음, 활성화 없음 |
| SQL, MongoDB, Redis마다 별도 앱 | SQL + MongoDB + Redis + S3를 한곳에서 |
| 기본 유틸리티에도 유료 플랜 | 무료 — 모든 도구, 모든 기능 |
| 감사할 수 없는 비공개 소스 도구 | AGPL-3.0, 앱 전체가 이 저장소에 |

---

## 📦 설치

| 플랫폼 | 방법 |
|---|---|
| **macOS** (Apple Silicon + Intel) | [최신 `.dmg` 다운로드](https://github.com/mydevtools-tech/mydevtools/releases/latest) — 유니버설 빌드, 서명 및 공증 완료, 앱 내에서 자동 업데이트 |
| **Windows / Linux** | 아직 배포하지 않았습니다. Tauri 셸은 두 플랫폼 모두에서 빌드됩니다 — [소스에서 빌드하기](../../README.md#%EF%B8%8F-building-from-source)와 [로드맵](../../ROADMAP.md)을 참고하세요. 이 플랫폼에서의 테스트는 첫 기여로 아주 좋습니다 |

실행하고 바로 작업을 시작하면 됩니다. 가입도, 설정도, API 키도 필요 없습니다.

---

## 🧰 도구

사이드바와 같은 방식으로 묶은 80개 이상의 도구입니다. 설명이 포함된 전체 목록은
[영문 README](../../README.md#-tools)에 있습니다.

| 분류 | 예시 |
|---|---|
| 📝 **포매터 및 검증기** | JSON 포맷터, JSON Visualizer, JSON 비교, JSON 스키마 생성기, JSON to Code, YAML 포매터, 포맷 변환기 (JSON / YAML / TOML / XML), SQL Formatter, GraphQL 포매터, 마크다운 미리보기, Diff checker, Regex Tester |
| 🌐 **네트워크 및 API** | API 클라이언트 (컬렉션, 환경, 인증, gRPC, 목 서버 — 브라우저 CORS 제한 없음), cURL to Code, Webhook 테스터, WebSocket 테스터, DNS 조회, Whois 조회, IP / 서브넷 계산기, HTTP 상태 코드, User-Agent Parser |
| 🗄️ **데이터베이스 및 스토리지 클라이언트** | SQL Client (PostgreSQL, MySQL, MariaDB), 데이터베이스 탐색기 (MongoDB), Redis Commander, S3 Drive (AWS S3, DigitalOcean Spaces) — 네이티브 Rust 드라이버로 내 컴퓨터에서 데이터베이스까지 바로 연결 |
| 🔐 **보안 및 암호화** | 비밀번호 관리자, 암호화 연습장 (AES-GCM), JWT 디코더, 해시 생성기, HMAC 생성기, Bcrypt, TOTP / 2FA 코드, SSH / RSA 키 생성기, 인증서 / PEM 디코더, 환경 변수 관리자, 비밀 / API 키 생성기 |
| 🔄 **변환기** | Base64, 이미지를 Base64로, URL Encoder / 파서, Escape / Encode, String Case Converter, String Inspector, Line Sort & Dedupe, CSV / Excel ↔ JSON, 진법 변환기, Timestamp / 시간대 변환기, 단위 변환기, Chmod 계산기, LLM 토큰 카운터 |
| ⚙️ **생성기** | UUID / ULID, 모의 데이터 생성기, Cron Builder, Docker Compose 생성기, .gitignore 생성기, QR 코드 생성기, Markdown 표 생성기, Lorem Ipsum |
| 🎨 **미디어 및 디자인** | Color Picker, 대비 검사기, CSS 그라디언트 빌더, CSS 생성기, 이미지 압축, SVG 최적화, EXIF 뷰어 및 제거, Favicon 생성기, 코드 스크린샷, 키코드 검사기 |
| 📱 **생산성** | Notes, 코드 스니펫, Tasks, 북마크, API Keys, 휴게실 (2048, Sudoku, Snake, Minesweeper, Tetris) |

모든 도구는 하나의 명령 팔레트에서 검색할 수 있으며, 다크/라이트 모드와 27개
언어를 지원합니다.

---

## 🔒 설계에서부터 프라이버시

- **MyDevTools 서버가 없습니다.** 로그인할 백엔드도, 동기화 서비스도, 계정
  시스템도 없습니다. 도구 입력값, 노트, 스니펫, 작업, 북마크는 OS 키체인에
  보관된 키로 암호화된 로컬 SQLCipher 데이터베이스에 저장됩니다.
- **자격 증명은 볼트로 암호화됩니다.** 데이터베이스 비밀번호, API 키, 비밀번호
  관리자 항목은 본인만 아는 마스터 비밀번호로 로컬에서 암호화됩니다.
- **모든 외부 연결은 사용자가 결정합니다.** 앱 자체는 네트워크가 필요 없지만,
  일부 도구는 *사용자가 지정한* 대상과 통신하기 위해 존재합니다. API 클라이언트는
  사용자가 작성한 요청을 보내고, 데이터베이스 클라이언트는 사용자가 설정한 호스트에
  연결하며, DNS / WHOIS 조회는 공개 레지스트리에 질의하고, 업데이터는 GitHub
  릴리스를 확인합니다. 그 외에 나가는 것은 없습니다.
- **사용 통계는 선택 사항이며 익명입니다.** 켜지 않으면 꺼져 있습니다. 켜면 두
  가지 이벤트(`app_started`, `tool_opened`)가 순환 세션 id, 앱 버전, 로케일과 함께
  전송됩니다. 기기 id도, 경로도, 도구에 입력한 내용도 포함되지 않습니다.
- **검증할 수 있습니다.** AGPL-3.0. 위 내용은 모두 이 저장소 안에 있으니 직접 확인해 보세요.

---

## 🏗️ 아키텍처

Tauri v2 셸(`apps/desktop`, Rust) 안에서 동작하는 Next.js 16 / React 19
UI(`apps/desktop-ui`)입니다. 저장소는 OS 키체인에서 키를 받는 SQLCipher이며,
데이터베이스 드라이버, HTTP / gRPC, 목 서버는 네이티브 Rust로 구현되어 있습니다.
웹사이트(`apps/web`)는 마케팅 전용으로, 도구는 그곳에서 실행되지 않습니다.
자세한 내용: [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md).

---

## 🛠️ 소스에서 빌드하기

```bash
git clone https://github.com/mydevtools-tech/mydevtools.git
cd mydevtools
pnpm install
pnpm dev:desktop     # Tauri desktop app in dev mode
pnpm build:desktop   # build the desktop app
```

Node.js ≥ 22, pnpm ≥ 9, 그리고 stable Rust가 필요합니다. 설정 단계는 없습니다 —
API 키도, 계정도, 외부 서비스도 필요 없습니다.

---

## MyDevTools가 다루지 않는 것

- 현재 배포되는 빌드는 **macOS 전용**입니다.
- **데이터베이스 클라이언트는 일상 작업용**이며, 완전한 DBA 도구 모음을 대체하지
  않습니다 — 시각적 스키마 디자이너나 마이그레이션 도구는 없습니다.
- **팀 기능은 없습니다.** 공유 워크스페이스도, 동기화도, 협업 기능도 없습니다.
- **일부 도구는 본질적으로 네트워크가 필요합니다** — DNS, WHOIS, 웹훅, API
  요청, 데이터베이스 연결이 그렇습니다.

---

## 🤝 기여하기

기여는 언제나 환영합니다 — 버그 수정, 새 도구, UI 다듬기, 번역, 문서 모두
좋습니다. [CONTRIBUTING.md](../../CONTRIBUTING.md)부터 시작하세요.
[`good first issue`](https://github.com/mydevtools-tech/mydevtools/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
라벨이 붙은 이슈는 처음 기여하는 분에게 맞게 범위가 정리되어 있습니다.

이 번역이나 `apps/desktop-ui/messages/`의 로케일 파일을 개선하는 데에는 Rust도,
빌드도 필요하지 않습니다.

| | |
|---|---|
| 🐛 버그 신고 · ✨ 기능 제안 | [이슈 템플릿](https://github.com/mydevtools-tech/mydevtools/issues/new/choose) |
| 💬 질문하기 | [Discussions](https://github.com/mydevtools-tech/mydevtools/discussions) · [SUPPORT.md](../../SUPPORT.md) |
| 🔒 취약점 신고 | [SECURITY.md](../../SECURITY.md) — 공개 이슈가 아니라 비공개로 |
| 🗺️ 계획 확인 | [ROADMAP.md](../../ROADMAP.md) |
| 🤝 커뮤니티 규범 | [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md) |

---

## ⭐ 프로젝트 응원하기

MyDevTools는 무료이며, 유료 플랜은 없고 앞으로도 없습니다. 시간을 아껴 주었다면
저장소에 스타를 누르거나, [GitHub에서 후원](https://github.com/sponsors/itsmeakhil)하거나,
동료에게 알려 주세요.

---

## 📄 라이선스

[GNU Affero General Public License v3.0](https://www.gnu.org/licenses/agpl-3.0.html) — [LICENSE](../../LICENSE)를 참고하세요.

<p align="center">
  <a href="https://github.com/itsmeakhil">Akhil</a>과 <a href="https://github.com/mydevtools-tech/mydevtools/graphs/contributors">기여자들</a>이 ❤️를 담아 만들었습니다
</p>
