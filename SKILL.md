---
name: web-ui-just-hermes-agent
description: WEB UI Just Hermes-agent — A handcrafted visual interface for Hermes Agent. Double-click into chat, skills, models, terminal, WeChat, and more. No framework, all hand-rolled.
category: dogfood
---

# WEB UI - Just Hermes-agent

A handcrafted WEB UI for Hermes Agent — ditch the PowerShell black window, double-click into a visual interface with chat, skills, models, terminal, and WeChat. No framework, all hand-rolled.

## Features

- **Visual Chat** — SSE streaming conversation with Hermes Agent
- **Skill Library** — browse all installed skills at a glance, new skills show instantly
- **Model Panel** — switch between models, view active configurations
- **Token Usage** — real-time tracking
- **Terminal Panel** — run shell commands inside the UI
- **WeChat Bridge** — scan QR code to connect WeChat
- **Memory Panel** — per-session isolation, global memory on demand
- **File Browser** — browse and manage project files
- **System Monitor** — real-time CPU / memory monitoring

## Installation

### Prerequisites

- [Hermes Agent](https://hermes-agent.nousresearch.com) running with Gateway enabled (default port: `http://127.0.0.1:8642`)
- A modern browser (Chrome, Edge, Firefox)

### Method 1: Direct Download

1. Download the latest release from GitHub:
   ```
   https://github.com/Shyven2008/WEB-UI-hermes-agent-myshelf/releases
   ```
2. Extract to any folder
3. Double-click `index.html` or set up a desktop shortcut

### Method 2: Clone via Git

```bash
git clone https://github.com/Shyven2008/WEB-UI-hermes-agent-myshelf.git
cd WEB-UI-hermes-agent-myshelf
# Open index.html in browser
```

### Method 3: Hermes Skill Install

```bash
hermes skill install web-ui-just-hermes-agent
```

## Usage

1. Make sure Hermes Gateway is running at `http://127.0.0.1:8642`
2. Open `index.html` in your browser
3. Start chatting, browsing skills, or using any panel

### Desktop Shortcut (Windows)

1. Right-click desktop → New → Shortcut
2. Target: `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app="file:///C:/path/to/just-hermes-agent-webui/index.html`
3. Name: `WEB UI - Just Hermes-agent`

## Project Structure

```
just-hermes-agent-webui/
├── index.html            # HTML skeleton
├── README.md             # Project documentation
├── SKILL.md              # Hermes skill entry point
├── .gitignore            # Git ignore rules
├── assets/
│   └── logo.png          # Brand icon
├── css/
│   └── style.css         # Complete stylesheet (385 lines)
└── js/
    ├── config.js         # Configuration + global state
    ├── utils.js          # Utility functions
    ├── session-store.js  # Session CRUD
    ├── chat.js           # SSE streaming chat
    ├── history-panel.js  # History panel + context menus
    ├── pages.js          # All feature pages
    ├── wechat.js         # WeChat QR login
    ├── navigation.js     # Page switching
    └── app.js            # Entry point + auto-refresh
```

## Roadmap

- [x] Visual chat with SSE streaming
- [x] Skill library browser
- [x] Model panel
- [x] Token usage tracking
- [x] File browser
- [x] WeChat bridge
- [x] Memory panel
- [x] Terminal panel
- [x] System monitor
- [ ] Theme switcher (dark/light)
- [ ] i18n support
- [ ] Mobile responsive layout
- [ ] Custom skill creation from UI

## Credits

Powered by [Hermes Agent](https://hermes-agent.nousresearch.com). Built from scratch, no framework dependencies.
