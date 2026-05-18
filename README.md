# WEB UI - Just Hermes-agent

A handcrafted WEB UI for Hermes Agent — ditch the PowerShell black window, double-click into a visual interface with chat, skills, models, terminal, and WeChat. No framework, all hand-rolled.

## Why This Exists

Hermes Agent ships as CLI-first — PowerShell black window, typed commands, raw text output. High friction for daily use. So I built this WEB UI: double-click a desktop icon and you're in. Visual, interactive, hassle-free.

## Quick Start

1. Make sure Hermes Gateway is running at `http://127.0.0.1:8642`
2. Open `index.html` in any browser
3. Or use the desktop shortcut launcher

## Features

- Visual chat with SSE streaming
- Skill library — browse installed skills at a glance
- Model panel — switch models, view config
- Token usage — real-time tracking
- In-browser terminal
- WeChat QR login bridge
- Per-session isolated memory — no cross-context bleed
- File browser, system monitor, log viewer

## Four Eyes

Each skill opens an "eye" capability — web search, multi-platform collection, full-domain capture, real browser engine.

## Project Structure

```
just-hermes-agent-webui/
├── index.html
├── README.md
├── .gitignore
├── assets/
│   └── logo.png
├── css/
│   └── style.css
└── js/
    ├── config.js
    ├── utils.js
    ├── session-store.js
    ├── chat.js
    ├── history-panel.js
    ├── pages.js
    ├── wechat.js
    ├── navigation.js
    └── app.js
```

## Roadmap

- [x] Chat, Skills, Models, Tokens, Terminal, WeChat, Memory
- [ ] Dark theme variants
- [ ] Mobile responsive layout
- [ ] Multi-language support

Built from scratch, no framework dependencies. Powered by [Hermes Agent](https://hermes-agent.nousresearch.com).
