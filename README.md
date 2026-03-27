<p align="center">
  <img src="https://mydevtools.tech/favicon.ico" alt="MyDevTools Logo" width="80" height="80" />
</p>

<h1 align="center">MyDevTools.tech</h1>

<p align="center">
  <strong>Your all-in-one, open-source developer toolkit — fast, private, and beautiful.</strong>
</p>

<p align="center">
  <a href="https://mydevtools.tech">🌐 Live App</a> •
  <a href="#-features">✨ Features</a> •
  <a href="#-getting-started">🚀 Get Started</a> •
  <a href="#-contributing">🤝 Contribute</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Firebase-12-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase" />
  <img src="https://img.shields.io/badge/License-GPL_3.0-blue?style=for-the-badge" alt="License" />
</p>

<p align="center">
  <a href="https://www.producthunt.com/products/mydevtools?embed=true&utm_source=badge-featured&utm_medium=badge" target="_blank">
    <img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1041847&theme=neutral&t=1764002797983" alt="MyDevTools on Product Hunt" width="250" height="54" />
  </a>
</p>

---

## 🔥 Why MyDevTools?

Most developer tools are scattered across dozens of tabs, riddled with ads, or send your data to unknown servers. **MyDevTools** changes that:

- ⚡ **Client-side processing** — Your data never leaves your browser
- 🔒 **Privacy-first** — No tracking, no analytics on your data, no ads
- 🎨 **Premium UI** — Dark/light mode, smooth animations, responsive design
- 💯 **Free & open source** — Forever. Built with ❤️ by the community

---

## ✨ Features

### 🧰 Developer Tools

| Tool | Description |
|------|-------------|
| **📡 API Client** | Test & debug REST APIs with a Postman-like interface — headers, params, body, and response inspection |
| **🗄️ NoSQL Explorer** | Connect to and explore MongoDB databases with a visual query builder and data viewer |
| **📧 Email Validator** | Validate email address format and structure instantly |

### 📱 Productivity Apps

| Tool | Description |
|------|-------------|
| **✅ Task Manager** | Organize tasks with priorities, drag-and-drop reordering, and progress tracking |
| **📓 Notes** | Rich-text note-taking powered by Tiptap — headings, lists, code blocks, images & more |
| **🔐 Password Manager** | Store passwords securely with client-side encryption. Your vault, your keys |
| **🔖 Bookmarks** | Save, organize, and manage your favorite links in one central place |

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) |
| **Language** | [TypeScript 5.7](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS 3.4](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/) |
| **State** | [Zustand](https://github.com/pmndrs/zustand) |
| **Editors** | [Monaco Editor](https://microsoft.github.io/monaco-editor/) · [Tiptap](https://tiptap.dev/) |
| **Animations** | [Framer Motion](https://www.framer.com/motion/) |
| **Backend** | [Firebase](https://firebase.google.com/) (Auth, Firestore, Storage) |
| **Analytics** | [Vercel Analytics](https://vercel.com/analytics) + [Speed Insights](https://vercel.com/docs/speed-insights) |
| **Drag & Drop** | [dnd-kit](https://dndkit.com/) |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/itsmeakhil/mydevtools.tech.git
cd mydevtools.tech

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Fill in your Firebase credentials

# Start the development server
pnpm dev
```

The app will be running at **[http://localhost:3000](http://localhost:3000)** 🎉

### Build Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server with Turbopack |
| `pnpm build` | Create production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm clean-install` | Fresh install of dependencies |

---

## 📁 Project Structure

```
mydevtools.tech/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── app/             # All tool pages
│   │   │   ├── api-client/
│   │   │   ├── bookmarks/
│   │   │   ├── email-validator/
│   │   │   ├── nosql-explorer/
│   │   │   ├── notes/
│   │   │   ├── password-manager/
│   │   │   └── to-do/
│   │   ├── dashboard/       # User dashboard
│   │   └── login/           # Authentication
│   ├── components/          # Reusable UI components
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility libraries
│   ├── store/               # Zustand state stores
│   └── utils/               # Helper functions
├── public/                  # Static assets
└── components/              # Shadcn UI components
```

---

## 🤝 Contributing

Contributions are welcome! Whether it's a bug fix, new feature, or documentation improvement — we'd love your help.

1. **Fork** the repository
2. **Create** your feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

---

## 💡 Feature Requests

Have an idea? We'd love to hear it!
[**→ Submit a Feature Request**](https://docs.google.com/forms/d/e/1FAIpQLSfrqN2WWGF6weA_hFPsce9U6wjUpvjZzIF7KZABYMvX4xRW3A/viewform?usp=header)

---

## 🧑‍💻 Contributors

<a href="https://github.com/itsmeakhil/mydevtools.tech/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=itsmeakhil/mydevtools.tech" />
</a>

---

## ⭐ Support

If you find MyDevTools useful, consider giving it a **star** on GitHub — it helps others discover the project!

[![Star on GitHub](https://img.shields.io/github/stars/itsmeakhil/mydevtools.tech?style=social)](https://github.com/itsmeakhil/mydevtools.tech)

---

## 📄 License

Distributed under the **GPL 3.0 License**. See [LICENSE](LICENSE) for details.

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/itsmeakhil">Akhil</a> and <a href="https://github.com/itsmeakhil/mydevtools.tech/graphs/contributors">contributors</a>
</p>
