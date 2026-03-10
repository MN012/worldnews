<p align="center">
  <img src="https://img.shields.io/badge/%F0%9F%8C%8D-WorldNews-E22222?style=for-the-badge&labelColor=050505" height="60" />
</p>

<h1 align="center">Real-time world news from verified sources</h1>

<p align="center">
  <i>Live news aggregator organized by continent. Glassmorphism UI. Zero framework.</i>
</p>

<br />

<div align="center">

[![Live Demo](https://img.shields.io/badge/Live%20Demo-worldnews-E22222?style=flat-square&logo=vercel&logoColor=white)](https://github.com/MN012/worldnews)
[![GitHub Stars](https://img.shields.io/github/stars/MN012/worldnews?style=flat-square&color=E22222&logo=github)](https://github.com/MN012/worldnews)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A516-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![License](https://img.shields.io/badge/License-MIT-60A5FA?style=flat-square)](LICENSE)

</div>

<br />

<p align="center">
  <b>
    <a href="#-get-started">Get Started</a> &nbsp;&middot;&nbsp;
    <a href="#-features">Features</a> &nbsp;&middot;&nbsp;
    <a href="#-api">API</a> &nbsp;&middot;&nbsp;
    <a href="#-design">Design</a> &nbsp;&middot;&nbsp;
    <a href="#-sources">Sources</a>
  </b>
</p>

<br />

> **WorldNews** pulls real-time articles from 11+ internationally recognized outlets (BBC, Al Jazeera, NPR, France 24, DW, and more), organizes them by continent, and lets you search, bookmark, summarize, and watch live news streams — all from a single glassmorphism-styled page with zero dependencies on any frontend framework.

<br />

## &#x26A1; Get Started

```bash
git clone https://github.com/MN012/worldnews.git
cd worldnews
npm install
npm start
```

Open **[http://localhost:3000](http://localhost:3000)** and you're live.

<br />

## &#x2728; Features

<table>
<tr>
<td width="50%">

### Content
- **7 continents** with dedicated RSS feeds
- **11+ verified sources** (BBC, NPR, Al Jazeera, DW...)
- **Live YouTube streams** that never break
- **AI-powered summaries** with streaming output
- **Auto topic detection** (Politics, Tech, Economy...)
- **Breaking news ticker** with auto-scroll

</td>
<td width="50%">

### Experience
- **Glassmorphism dark mode** (OLED-black)
- **Warm editorial light mode**
- **Country filtering** within each continent
- **Bookmark system** with local storage
- **Full-text search** across all articles
- **Keyboard shortcuts** for power users

</td>
</tr>
</table>

### Keyboard Shortcuts

| Key | Action |
|:---:|--------|
| `1` - `7` | Select continent |
| `/` | Focus search |
| `B` | Toggle bookmarks |
| `S` | Summarize news |
| `Esc` | Close panels |

<br />

## &#x1F4E1; Live Streams

Every continent has curated 24/7 news channels that open directly on YouTube — **links never expire** because they use `@handle/live` routing instead of video IDs.

| Region | Channels |
|--------|----------|
| **Africa** | Al Jazeera, France 24, DW, CGTN, TRT World |
| **Asia** | Al Jazeera, CNA, WION, NHK World, CGTN, TRT World |
| **Europe** | Euronews, France 24, DW, Sky News, TRT World |
| **North America** | NBC News, ABC News, CBS News, Bloomberg, Fox 5 DC |
| **South America** | France 24, DW, Al Jazeera, TRT World |
| **Oceania** | ABC Australia, Al Jazeera, Sky News AU, DW |

<br />

## &#x1F4F0; Sources

All sources are internationally recognized for editorial standards and fact-checking.

<table>
<tr>
<td><b>BBC News</b></td>
<td><b>Al Jazeera</b></td>
<td><b>France 24</b></td>
<td><b>DW News</b></td>
</tr>
<tr>
<td><b>NPR</b></td>
<td><b>CNBC</b></td>
<td><b>Euronews</b></td>
<td><b>CBS News</b></td>
</tr>
<tr>
<td><b>ABC Australia</b></td>
<td><b>CGTN</b></td>
<td><b>Phys.org</b></td>
<td></td>
</tr>
</table>

<br />

## &#x1F527; API

The Express backend exposes a simple REST + SSE interface.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/news/:continent` | Fetch articles for a continent |
| `GET` | `/api/summarize/:continent` | Stream extractive summary (SSE) |
| `GET` | `/api/summarize/:continent?country=X` | Summary filtered by country |
| `GET` | `/api/continents` | List all continents with source info |

```bash
# Fetch European news
curl http://localhost:3000/api/news/europe

# Stream a summary for Asia
curl http://localhost:3000/api/summarize/asia

# Summary for a specific country
curl http://localhost:3000/api/summarize/north_america?country=Canada
```

<br />

## &#x1F3A8; Design

<table>
<tr>
<td width="50%">

### Glassmorphism System
- Semi-transparent `rgba()` backgrounds
- `backdrop-filter: blur(12px) saturate(180%)`
- Surface gradient overlays on cards
- Subtle SVG noise texture on body
- Custom styled scrollbar

</td>
<td width="50%">

### Typography & Color
- **Playfair Display** 800 — headings
- **Inter** 400/500/600 — body text
- Accent `#E22222` with gradient to `#FF6B6B`
- OLED-black `#050505` background
- Green `#34D399` verified badges

</td>
</tr>
<tr>
<td width="50%">

### Animations
- Scroll-reveal with `scale(0.98)` entry
- Spring curves `cubic-bezier(0.34, 1.56, 0.64, 1)`
- Pulsing LIVE dot with red glow
- Card hover lift with accent border
- Title color shift on hover

</td>
<td width="50%">

### Responsive
- Desktop: 3-column card grid
- Tablet (768px): single column, touch targets
- Mobile (480px): bottom-sheet modals, compact nav
- `prefers-reduced-motion` respected
- Safe area insets for notched devices

</td>
</tr>
</table>

<br />

## &#x1F4C1; Project Structure

```
worldnews/
├── server.js            Express server, RSS fetching, summarization API
├── public/
│   ├── index.html       Main HTML (also served from root)
│   ├── app.js           Client-side logic, feeds, rendering, UI
│   └── style.css        Glassmorphism styles
├── index.html           Root HTML entry point
├── app.js               Root JS entry point
├── style.css            Root CSS entry point
└── package.json
```

<br />

## &#x1F6E0; Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vanilla HTML + CSS + JS (zero framework) |
| **Backend** | Node.js + Express |
| **RSS** | `rss-parser` |
| **Fonts** | Google Fonts (Playfair Display + Inter) |
| **Live Streams** | YouTube `@handle/live` (never expire) |
| **Summarization** | Extractive keyword-theme grouping (no AI API needed) |
| **Deployment** | Any Node.js host (Vercel, Railway, Render, VPS) |

<br />

## &#x1F4DC; License

MIT

<br />

<p align="center">
  <sub>Built with verified journalism in mind.</sub>
</p>
