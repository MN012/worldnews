# WorldNews

Real-time world news aggregator that pulls from verified, fact-checked sources — organized by continent.

![Dark Theme](https://img.shields.io/badge/theme-dark-000000) ![Light Theme](https://img.shields.io/badge/theme-light-F8F7F4) ![Node.js](https://img.shields.io/badge/node-%3E%3D16-339933) ![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- **7 continents** — Africa, Asia, Europe, North America, South America, Oceania, Antarctica
- **Live news streams** — YouTube live feeds from Al Jazeera, France 24, DW, Euronews, NBC, ABC, CBS, Bloomberg, Sky News, and more
- **AI-powered summaries** — extractive news summarization with streamed word-by-word output
- **Country filtering** — filter articles by country within each continent
- **Bookmark system** — save articles locally for later reading
- **Dark / Light theme** — OLED-black dark mode with glassmorphism, warm editorial light mode
- **Search** — full-text search across all loaded articles
- **Breaking news ticker** — auto-scrolling ticker for the latest headlines
- **Keyboard shortcuts** — `1`-`7` continents, `/` search, `B` bookmarks, `S` summarize, `Esc` close
- **Topic badges** — auto-detected categories (Politics, Tech, Economy, Conflict, Climate, Health, Science, Sports, Culture)
- **Responsive** — works on desktop, tablet, and mobile

## News Sources

All sources are internationally recognized for editorial standards and fact-checking:

| Source | Continents |
|--------|-----------|
| BBC News | All |
| Al Jazeera | Africa, Asia, South America, Oceania |
| France 24 | Africa, Europe, North/South America |
| DW News | Africa, Asia, Europe, South America, Oceania |
| NPR | North America |
| CNBC | Asia, North America |
| Euronews | Europe |
| ABC Australia | Oceania |
| CBS News | North America |
| CGTN | Africa, Asia |
| Phys.org | Antarctica |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 16

### Install & Run

```bash
git clone https://github.com/MN012/worldnews.git
cd worldnews
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
worldnews/
├── server.js          # Express server, RSS fetching, summarization API
├── public/
│   ├── index.html     # Main HTML (also served from root)
│   ├── app.js         # Client-side logic (feeds, rendering, UI)
│   └── style.css      # Styles (also served from root)
├── index.html         # Root HTML entry point
├── app.js             # Root JS entry point
├── style.css          # Root CSS entry point
└── package.json
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/news/:continent` | Fetch articles for a continent |
| `GET` | `/api/summarize/:continent` | Stream an extractive summary (SSE) |
| `GET` | `/api/summarize/:continent?country=X` | Summary filtered by country |
| `GET` | `/api/continents` | List all continents with source info |

## Tech Stack

- **Frontend** — Vanilla HTML, CSS, JavaScript (no framework)
- **Backend** — Node.js + Express
- **RSS Parsing** — `rss-parser`
- **Fonts** — Playfair Display (headings) + Inter (body) via Google Fonts
- **Design** — Glassmorphism, backdrop blur, gradient accents, CSS custom properties
- **Live Streams** — YouTube `@handle/live` links (never expire)

## Design

The UI uses a glassmorphism-meets-editorial style with:

- Semi-transparent card backgrounds with `backdrop-filter: blur()`
- Gradient accent line and red glow effects
- Subtle noise texture overlay
- Spring-curve animations (`cubic-bezier(0.34, 1.56, 0.64, 1)`)
- Scroll-reveal card entrance animations
- Custom styled scrollbar
- Responsive breakpoints at 768px and 480px

## License

MIT
