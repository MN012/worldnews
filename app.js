// ===== Configuration =====
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

const CONTINENT_EMOJIS = {
  africa: '🌍',
  asia: '🌏',
  europe: '🌍',
  north_america: '🌎',
  south_america: '🌎',
  oceania: '🌏',
  antarctica: '🧊',
};

const CONTINENT_ORDER = ['africa', 'asia', 'europe', 'north_america', 'south_america', 'oceania', 'antarctica'];

const FEEDS = {
  africa: [
    { name: 'BBC Africa', url: 'https://feeds.bbci.co.uk/news/world/africa/rss.xml', logo: 'BBC' },
    { name: 'Al Jazeera Africa', url: 'https://www.aljazeera.com/xml/rss/all.xml', logo: 'AJ' },
  ],
  asia: [
    { name: 'BBC Asia', url: 'https://feeds.bbci.co.uk/news/world/asia/rss.xml', logo: 'BBC' },
    { name: 'Al Jazeera Asia', url: 'https://www.aljazeera.com/xml/rss/all.xml', logo: 'AJ' },
  ],
  europe: [
    { name: 'BBC Europe', url: 'https://feeds.bbci.co.uk/news/world/europe/rss.xml', logo: 'BBC' },
    { name: 'DW News', url: 'https://rss.dw.com/xml/rss-en-world', logo: 'DW' },
  ],
  north_america: [
    { name: 'BBC North America', url: 'https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml', logo: 'BBC' },
    { name: 'NPR News', url: 'https://feeds.npr.org/1001/rss.xml', logo: 'NPR' },
  ],
  south_america: [
    { name: 'BBC Latin America', url: 'https://feeds.bbci.co.uk/news/world/latin_america/rss.xml', logo: 'BBC' },
    { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', logo: 'AJ' },
  ],
  oceania: [
    { name: 'BBC Asia-Pacific', url: 'https://feeds.bbci.co.uk/news/world/asia/rss.xml', logo: 'BBC' },
    { name: 'ABC Australia', url: 'https://www.abc.net.au/news/feed/2942460/rss.xml', logo: 'ABC' },
  ],
  antarctica: [
    { name: 'BBC Science', url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', logo: 'BBC' },
    { name: 'DW Science', url: 'https://rss.dw.com/xml/rss-en-science', logo: 'DW' },
  ],
};

const REFRESH_INTERVAL = 60 * 1000;

const COUNTRIES_BY_CONTINENT = {
  africa: ['Nigeria','South Africa','Kenya','Egypt','Ethiopia','Ghana','Tanzania','Uganda','Morocco','Algeria','Sudan','Libya','Tunisia','Senegal','Cameroon','Congo','Somalia','Zimbabwe','Mozambique','Angola','Mali','Niger','Rwanda','Ivory Coast','Madagascar'],
  asia: ['China','India','Japan','South Korea','North Korea','Indonesia','Pakistan','Bangladesh','Philippines','Vietnam','Thailand','Myanmar','Malaysia','Taiwan','Iran','Iraq','Syria','Saudi Arabia','Israel','Palestine','Turkey','Afghanistan','Yemen','Lebanon','Jordan',['UAE','United Arab Emirates'],'Qatar','Kuwait','Oman','Nepal','Sri Lanka','Cambodia','Laos','Mongolia','Uzbekistan','Kazakhstan','Singapore','Hong Kong'],
  europe: ['Ukraine','Russia','France','Germany',['UK','Britain','England','Scotland'],'Spain','Italy','Poland','Netherlands','Belgium','Sweden','Norway','Denmark','Finland','Greece','Portugal','Ireland','Austria','Switzerland',['Czech Republic','Czech'],'Romania','Hungary','Serbia','Croatia','Bulgaria','Slovakia','Lithuania','Latvia','Estonia','Moldova','Belarus','Georgia','Albania','Kosovo','Bosnia','Montenegro','Iceland','Luxembourg','Malta','Cyprus'],
  north_america: [['United States','US','USA','America'],'Canada','Mexico','Cuba','Haiti','Jamaica','Dominican Republic','Guatemala','Honduras','El Salvador','Nicaragua','Costa Rica','Panama','Puerto Rico','Trinidad','Bahamas','Barbados'],
  south_america: ['Brazil','Argentina','Colombia','Chile','Peru','Venezuela','Ecuador','Bolivia','Paraguay','Uruguay','Guyana','Suriname'],
  oceania: ['Australia','New Zealand','Fiji','Papua New Guinea','Samoa','Tonga','Solomon Islands','Vanuatu'],
  antarctica: ['Antarctica'],
};

// ===== State =====
let currentContinent = null;
let currentArticles = [];
let displayedArticles = [];
let activeCountryFilter = null;
let activeSearchQuery = '';
let refreshTimer = null;
let refreshBarEl = null;
let refreshStart = 0;
let bookmarks = [];

// In-memory cache
const cache = {};
const CACHE_DURATION = 2 * 60 * 1000;

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', async () => {
  loadTheme();
  loadBookmarks();
  createRefreshBar();
  setupScrollToTop();
  loadContinents();
  setupKeyboardShortcuts();
});

// ===== RSS Fetching (client-side) =====
async function fetchFeed(source) {
  try {
    const res = await fetch(CORS_PROXY + encodeURIComponent(source.url));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'text/xml');

    const items = xml.querySelectorAll('item');
    const articles = [];

    items.forEach((item, i) => {
      if (i >= 10) return;
      const title = item.querySelector('title')?.textContent || 'No title';
      const link = item.querySelector('link')?.textContent || '#';
      const pubDate = item.querySelector('pubDate')?.textContent || new Date().toISOString();
      const description = item.querySelector('description')?.textContent || '';
      const snippet = description.replace(/<[^>]*>/g, '').substring(0, 200);

      // Try to get image
      const enclosure = item.querySelector('enclosure');
      const mediaContent = item.getElementsByTagNameNS('http://search.yahoo.com/mrss/', 'content')[0];
      const image = enclosure?.getAttribute('url') || mediaContent?.getAttribute('url') || null;

      articles.push({
        title,
        link,
        pubDate,
        snippet,
        source: source.name,
        sourceLogo: source.logo,
        image,
      });
    });

    return articles;
  } catch (err) {
    console.error(`Failed to fetch ${source.name}: ${err.message}`);
    return [];
  }
}

async function getNewsForContinent(continent) {
  const now = Date.now();
  if (cache[continent] && (now - cache[continent].timestamp) < CACHE_DURATION) {
    return cache[continent].data;
  }

  const sources = FEEDS[continent];
  if (!sources) return [];

  const results = await Promise.allSettled(sources.map(fetchFeed));
  const articles = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);

  // Sort by date, newest first
  articles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  // Deduplicate by title similarity
  const seen = new Set();
  const unique = articles.filter(article => {
    const key = article.title.toLowerCase().substring(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  cache[continent] = { data: unique, timestamp: now };
  return unique;
}

// ===== Extractive Summary (client-side) =====
const SUMMARY_STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with','by',
  'is','are','was','were','be','been','has','had','have','do','does','did',
  'will','would','could','should','may','might','shall','can','this','that',
  'it','its','from','as','not','no','so','if','than','then','more','also',
  'into','over','after','before','about','up','out','new','says','said','he',
  'she','they','their','his','her','who','what','when','where','how','why',
  'all','been','being','some','any','each','which','us','we','our','you',
]);

function extractKeywords(articles) {
  const freq = {};
  for (const article of articles) {
    const text = `${article.title} ${article.snippet}`.toLowerCase();
    const words = text.match(/[a-z]{3,}/g) || [];
    const seen = new Set();
    for (const word of words) {
      if (SUMMARY_STOP_WORDS.has(word) || seen.has(word)) continue;
      seen.add(word);
      freq[word] = (freq[word] || 0) + 1;
    }
  }
  return Object.entries(freq)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
}

function groupByTheme(articles, keywords) {
  const themes = {};
  const used = new Set();

  for (const keyword of keywords) {
    const matching = articles.filter((a, i) => {
      if (used.has(i)) return false;
      const text = `${a.title} ${a.snippet}`.toLowerCase();
      return text.includes(keyword);
    });
    if (matching.length >= 2) {
      const label = keyword.charAt(0).toUpperCase() + keyword.slice(1);
      themes[label] = matching.slice(0, 4);
      matching.slice(0, 4).forEach(m => {
        used.add(articles.indexOf(m));
      });
    }
  }

  const remaining = articles.filter((_, i) => !used.has(i)).slice(0, 5);
  if (remaining.length > 0) {
    themes['Other Headlines'] = remaining;
  }

  return themes;
}

function buildSummary(articles, continentName) {
  if (articles.length === 0) {
    return 'No articles available to summarize.';
  }

  const keywords = extractKeywords(articles);
  const themes = groupByTheme(articles, keywords);
  const sourceSet = [...new Set(articles.map(a => a.source))];

  let md = `## Today's Briefing: ${continentName}\n\n`;

  for (const [theme, items] of Object.entries(themes)) {
    md += `**${theme}**\n`;
    for (const item of items) {
      const snippet = item.snippet ? ` — ${item.snippet.substring(0, 120)}` : '';
      md += `- ${item.title}${snippet} *(${item.source})*\n`;
    }
    md += '\n';
  }

  md += `**Key Topics:** ${keywords.slice(0, 6).join(', ')}\n\n`;
  md += `*Based on ${articles.length} articles from ${sourceSet.join(', ')}.*`;

  return md;
}

// ===== Theme =====
function loadTheme() {
  const saved = localStorage.getItem('wn-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('wn-theme', next);
  showToast(next === 'dark' ? 'Dark mode enabled' : 'Light mode enabled');
}

// ===== Bookmarks =====
function loadBookmarks() {
  try {
    bookmarks = JSON.parse(localStorage.getItem('wn-bookmarks') || '[]');
  } catch {
    bookmarks = [];
  }
  updateBookmarkCount();
}

function saveBookmarks() {
  localStorage.setItem('wn-bookmarks', JSON.stringify(bookmarks));
  updateBookmarkCount();
}

function updateBookmarkCount() {
  const el = document.getElementById('bookmarkCount');
  if (bookmarks.length > 0) {
    el.textContent = bookmarks.length;
    el.style.display = 'flex';
  } else {
    el.style.display = 'none';
  }
}

function isBookmarked(link) {
  return bookmarks.some(b => b.link === link);
}

function toggleBookmark(link, title, source, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const idx = bookmarks.findIndex(b => b.link === link);
  if (idx >= 0) {
    bookmarks.splice(idx, 1);
    showToast('Removed from saved articles');
  } else {
    bookmarks.push({ link, title, source, savedAt: new Date().toISOString() });
    showToast('Article saved');
  }
  saveBookmarks();
  if (displayedArticles.length > 0) {
    renderArticles(displayedArticles);
  }
  if (document.getElementById('bookmarksPanel').style.display !== 'none') {
    renderBookmarksList();
  }
}

function toggleBookmarks() {
  const panel = document.getElementById('bookmarksPanel');
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    renderBookmarksList();
  } else {
    panel.style.display = 'none';
  }
}

function renderBookmarksList() {
  const list = document.getElementById('bookmarksList');
  if (bookmarks.length === 0) {
    list.innerHTML = '<div class="bookmarks-empty">No saved articles yet. Click the bookmark icon on any article to save it.</div>';
    return;
  }
  list.innerHTML = bookmarks.map(b => `
    <div class="bookmark-item">
      <span class="bookmark-item-source">${escapeHtml(b.source || '')}</span>
      <a href="${escapeHtml(b.link)}" target="_blank" rel="noopener noreferrer" class="bookmark-item-title">${escapeHtml(b.title)}</a>
      <button class="bookmark-item-remove" onclick="toggleBookmark('${escapeHtml(b.link)}', '', '', event)" title="Remove">&times;</button>
    </div>
  `).join('');
}

// ===== Toast =====
let toastTimer = null;
function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  clearTimeout(toastTimer);
  toast.classList.remove('show');
  void toast.offsetWidth;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ===== Scroll to Top =====
function setupScrollToTop() {
  const btn = document.getElementById('scrollTop');
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  });
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== Refresh Bar =====
function createRefreshBar() {
  refreshBarEl = document.createElement('div');
  refreshBarEl.className = 'refresh-bar';
  refreshBarEl.style.width = '0%';
  document.body.prepend(refreshBarEl);
}

// ===== Keyboard Shortcuts =====
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      if (e.key === 'Escape') {
        e.target.blur();
        clearSearch();
      }
      return;
    }

    const num = parseInt(e.key);
    if (num >= 1 && num <= 7 && CONTINENT_ORDER[num - 1]) {
      e.preventDefault();
      selectContinent(CONTINENT_ORDER[num - 1]);
      return;
    }

    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (!currentContinent) return;
      const idx = CONTINENT_ORDER.indexOf(currentContinent);
      let nextIdx;
      if (e.key === 'ArrowLeft') {
        nextIdx = idx <= 0 ? CONTINENT_ORDER.length - 1 : idx - 1;
      } else {
        nextIdx = idx >= CONTINENT_ORDER.length - 1 ? 0 : idx + 1;
      }
      selectContinent(CONTINENT_ORDER[nextIdx]);
      return;
    }

    if (e.key === '/') {
      e.preventDefault();
      const searchInput = document.getElementById('searchInput');
      if (searchInput) searchInput.focus();
      return;
    }

    if (e.key === 'b' || e.key === 'B') {
      toggleBookmarks();
      return;
    }

    if (e.key === 's' || e.key === 'S') {
      if (currentContinent) summarizeNews();
      return;
    }

    if (e.key === 'Escape') {
      closeSummary();
      const panel = document.getElementById('bookmarksPanel');
      if (panel.style.display !== 'none') panel.style.display = 'none';
    }
  });
}

// ===== Continent Loading =====
function loadContinents() {
  const continents = Object.keys(FEEDS).map(id => ({
    id,
    name: id.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
    sourceCount: FEEDS[id].length,
    sources: FEEDS[id].map(s => s.name),
  }));
  renderContinentNav(continents);
}

function renderContinentNav(continents) {
  const nav = document.getElementById('continentNav');
  nav.innerHTML = '';
  continents.forEach((c, i) => {
    const btn = document.createElement('button');
    btn.className = 'continent-btn';
    btn.dataset.continent = c.id;
    btn.innerHTML = `<span class="emoji">${CONTINENT_EMOJIS[c.id] || '🌐'}</span> ${c.name} <span class="btn-shortcut">${i + 1}</span>`;
    btn.addEventListener('click', () => selectContinent(c.id));
    nav.appendChild(btn);
  });
}

async function selectContinent(continent) {
  document.querySelectorAll('.continent-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.continent === continent);
  });

  currentContinent = continent;
  activeSearchQuery = '';
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';
  document.getElementById('searchClear').style.display = 'none';
  document.getElementById('searchResultsCount').textContent = '';

  await fetchNews(continent);
  startAutoRefresh();
}

// ===== Fetch News =====
async function fetchNews(continent) {
  const container = document.getElementById('newsContainer');
  const badges = document.getElementById('sourceBadges');

  container.innerHTML = buildSkeletonHTML();

  try {
    const articles = await getNewsForContinent(continent);
    const sources = FEEDS[continent].map(s => s.name);

    // Source badges
    badges.innerHTML = sources
      .map(s => `<span class="source-badge">${s}</span>`)
      .join('');

    // Last updated
    document.getElementById('lastUpdated').textContent =
      `Updated ${formatTime(new Date())}`;

    // Store articles
    currentArticles = articles;
    activeCountryFilter = null;

    // Show toolbar, search bar
    document.getElementById('toolbar').style.display = 'flex';
    document.getElementById('searchBar').style.display = 'flex';

    buildCountryFilter(articles);
    buildTrendingTopics(articles);

    if (articles.length === 0) {
      container.innerHTML = `
        <div class="error-msg">
          <p>No articles available right now. Try again shortly.</p>
        </div>
      `;
      updateArticleCount(0);
      return;
    }

    renderArticles(articles);
  } catch (err) {
    console.error('Fetch error:', err);
    container.innerHTML = `
      <div class="error-msg">
        <p>Unable to load news. Please try again.</p>
      </div>
    `;
  }
}

// ===== Skeleton Loading =====
function buildSkeletonHTML() {
  const cards = Array.from({ length: 6 }, () => `
    <div class="skeleton-card">
      <div class="skeleton-line header"></div>
      <div class="skeleton-line title long"></div>
      <div class="skeleton-line medium"></div>
      <div class="skeleton-line long"></div>
      <div class="skeleton-line short"></div>
    </div>
  `).join('');
  return `<div class="skeleton-grid">${cards}</div>`;
}

// ===== Render Articles =====
function renderArticles(articles) {
  displayedArticles = articles;
  const container = document.getElementById('newsContainer');
  updateArticleCount(articles.length);

  if (articles.length === 0) {
    container.innerHTML = `
      <div class="error-msg">
        <p>No articles match this filter.</p>
      </div>`;
    return;
  }
  container.innerHTML = `<div class="news-grid">${
    articles.map((article, i) => renderCard(article, i)).join('')
  }</div>`;
}

function renderCard(article, index) {
  const logoClass = article.sourceLogo?.toLowerCase() || '';
  const timeAgo = getTimeAgo(new Date(article.pubDate));
  const isBreaking = isBreakingNews(new Date(article.pubDate));
  const saved = isBookmarked(article.link);
  const escapedLink = escapeHtml(article.link);
  const escapedTitle = escapeHtml(article.title).replace(/'/g, "\\'");

  return `
    <a href="${escapedLink}" target="_blank" rel="noopener noreferrer"
       class="news-card" style="animation-delay: ${index * 0.04}s">
      <div class="card-source">
        <div class="source-tag">
          <div class="source-logo ${logoClass}">${escapeHtml(article.sourceLogo || '?')}</div>
          <span class="source-name">${escapeHtml(article.source)}</span>
        </div>
        <div class="card-meta">
          ${isBreaking ? '<span class="badge-breaking">BREAKING</span>' : ''}
          <span class="card-time">${timeAgo}</span>
        </div>
      </div>
      <h3 class="card-title">${escapeHtml(article.title)}</h3>
      ${article.snippet ? `<p class="card-snippet">${escapeHtml(article.snippet)}</p>` : ''}
      <div class="card-footer">
        <div class="card-verified">
          <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
            <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm11.78-1.72a.75.75 0 0 0-1.06-1.06L7.25 8.69 5.28 6.72a.75.75 0 0 0-1.06 1.06l2.5 2.5a.75.75 0 0 0 1.06 0l4-4z"/>
          </svg>
          Verified source
        </div>
        <div class="card-actions">
          <button class="card-action-btn ${saved ? 'bookmarked' : ''}"
                  onclick="toggleBookmark('${escapedLink}', '${escapedTitle}', '${escapeHtml(article.source)}', event)"
                  title="${saved ? 'Remove bookmark' : 'Save article'}">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="${saved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
          <button class="card-action-btn" onclick="shareArticle('${escapedLink}', '${escapedTitle}', event)" title="Share">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </button>
        </div>
      </div>
    </a>
  `;
}

function isBreakingNews(pubDate) {
  const hourAgo = Date.now() - (60 * 60 * 1000);
  return pubDate.getTime() > hourAgo;
}

function updateArticleCount(count) {
  const el = document.getElementById('articleCount');
  el.textContent = `${count} article${count !== 1 ? 's' : ''}`;
}

// ===== Share =====
function shareArticle(link, title, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  if (navigator.share) {
    navigator.share({ title, url: link }).catch(() => {});
  } else {
    navigator.clipboard.writeText(link).then(() => {
      showToast('Link copied to clipboard');
    }).catch(() => {});
  }
}

// ===== Search =====
function handleSearch(query) {
  activeSearchQuery = query.trim().toLowerCase();
  const clearBtn = document.getElementById('searchClear');
  clearBtn.style.display = activeSearchQuery ? 'block' : 'none';
  applyFilters();
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  document.getElementById('searchClear').style.display = 'none';
  document.getElementById('searchResultsCount').textContent = '';
  activeSearchQuery = '';
  applyFilters();
}

function applyFilters() {
  let filtered = currentArticles;

  if (activeCountryFilter) {
    const aliases = getAliasesFor(activeCountryFilter).map(a => a.toLowerCase());
    filtered = filtered.filter(article => {
      const text = `${article.title} ${article.snippet}`.toLowerCase();
      return aliases.some(alias => text.includes(alias));
    });
  }

  if (activeSearchQuery) {
    filtered = filtered.filter(article => {
      const text = `${article.title} ${article.snippet} ${article.source}`.toLowerCase();
      return text.includes(activeSearchQuery);
    });
    document.getElementById('searchResultsCount').textContent = `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`;
  } else {
    document.getElementById('searchResultsCount').textContent = '';
  }

  renderArticles(filtered);
}

// ===== Trending Topics =====
const STOP_WORDS = new Set([
  'the','that','this','with','from','have','been','were','will','would','could','should',
  'what','when','where','which','their','there','they','them','than','then','into','over',
  'after','before','about','also','more','some','other','just','says','said','over','under',
  'people','first','last','year','years','time','news','world','back','make','many','most',
]);

function buildTrendingTopics(articles) {
  const bar = document.getElementById('trendingBar');
  const container = document.getElementById('trendingTopics');

  if (articles.length < 3) {
    bar.style.display = 'none';
    return;
  }

  const freq = {};
  for (const article of articles) {
    const text = `${article.title}`.toLowerCase();
    const words = text.match(/[a-z]{4,}/g) || [];
    const seen = new Set();
    for (const word of words) {
      if (STOP_WORDS.has(word) || seen.has(word)) continue;
      seen.add(word);
      freq[word] = (freq[word] || 0) + 1;
    }
  }

  const topics = Object.entries(freq)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));

  if (topics.length === 0) {
    bar.style.display = 'none';
    return;
  }

  bar.style.display = 'flex';
  container.innerHTML = topics.map(t =>
    `<button class="trending-topic" onclick="searchTopic('${escapeHtml(t)}')">${escapeHtml(t)}</button>`
  ).join('');
}

function searchTopic(topic) {
  const searchInput = document.getElementById('searchInput');
  searchInput.value = topic;
  handleSearch(topic);
  searchInput.focus();
}

// ===== Country Filtering =====
function detectCountries(articles) {
  const entries = COUNTRIES_BY_CONTINENT[currentContinent] || [];
  const found = {};
  const normalized = entries.map(e => Array.isArray(e) ? e : [e]);

  for (const article of articles) {
    const text = `${article.title} ${article.snippet}`.toLowerCase();
    for (const aliases of normalized) {
      const displayName = aliases[0];
      if (found[displayName] === undefined) found[displayName] = 0;
      const matched = aliases.some(alias => text.includes(alias.toLowerCase()));
      if (matched) found[displayName]++;
    }
  }

  return Object.entries(found)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
}

function buildCountryFilter(articles) {
  const filterBar = document.getElementById('filterBar');
  const chipsContainer = document.getElementById('countryChips');
  const detected = detectCountries(articles);

  if (detected.length === 0) {
    filterBar.style.display = 'none';
    return;
  }

  filterBar.style.display = 'flex';
  let html = `<button class="country-chip active" onclick="filterByCountry(null)">All</button>`;
  for (const { name, count } of detected) {
    html += `<button class="country-chip" onclick="filterByCountry('${escapeHtml(name)}')">${escapeHtml(name)} <span class="chip-count">${count}</span></button>`;
  }
  chipsContainer.innerHTML = html;
}

function getAliasesFor(countryName) {
  const entries = COUNTRIES_BY_CONTINENT[currentContinent] || [];
  for (const entry of entries) {
    if (Array.isArray(entry) && entry[0] === countryName) return entry;
  }
  return [countryName];
}

function filterByCountry(country) {
  activeCountryFilter = country;

  document.querySelectorAll('.country-chip').forEach(chip => {
    const isAll = !country && chip.textContent.trim().startsWith('All');
    const isMatch = country && chip.textContent.trim().startsWith(country);
    chip.classList.toggle('active', isAll || isMatch);
  });

  applyFilters();
}

// ===== Auto Refresh =====
function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshStart = Date.now();
  animateRefreshBar();

  refreshTimer = setInterval(async () => {
    if (currentContinent) {
      // Clear cache to force fresh fetch
      delete cache[currentContinent];
      refreshStart = Date.now();
      await fetchNews(currentContinent);
      showToast('News refreshed');
    }
  }, REFRESH_INTERVAL);
}

function animateRefreshBar() {
  function tick() {
    if (!currentContinent) return;
    const elapsed = Date.now() - refreshStart;
    const pct = Math.min((elapsed / REFRESH_INTERVAL) * 100, 100);
    if (refreshBarEl) refreshBarEl.style.width = pct + '%';
    requestAnimationFrame(tick);
  }
  tick();
}

// ===== Time Helpers =====
function getTimeAgo(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ===== Summarization (client-side, typing effect) =====
async function summarizeNews() {
  if (!currentContinent) return;

  const btn = document.getElementById('summarizeBtn');
  const overlay = document.getElementById('summaryOverlay');
  const body = document.getElementById('summaryBody');
  const label = document.getElementById('summaryContinentLabel');

  btn.disabled = true;
  btn.innerHTML = `<div class="spinner-small"></div> Generating summary...`;

  const continentName = currentContinent.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  const summaryLabel = activeCountryFilter
    ? `${CONTINENT_EMOJIS[currentContinent] || '🌐'} ${activeCountryFilter}`
    : `${CONTINENT_EMOJIS[currentContinent] || '🌐'} ${continentName}`;
  label.textContent = summaryLabel;
  body.innerHTML = `<div class="summary-loading"><div class="spinner"></div><p>Analyzing today's headlines...</p></div>`;
  overlay.style.display = 'flex';

  try {
    // Get articles, optionally filtered by country
    let articles = currentArticles;
    if (activeCountryFilter) {
      const ALIASES = {
        'United States': ['united states','us','usa','america'],
        'UK': ['uk','britain','england','scotland'],
        'UAE': ['uae','united arab emirates'],
        'Czech Republic': ['czech republic','czech'],
      };
      const terms = ALIASES[activeCountryFilter] || [activeCountryFilter.toLowerCase()];
      articles = articles.filter(a => {
        const text = `${a.title} ${a.snippet}`.toLowerCase();
        return terms.some(t => text.includes(t));
      });
    }

    const labelText = activeCountryFilter || continentName;
    const summary = buildSummary(articles, labelText);

    // Simulate streaming typing effect
    body.innerHTML = '';
    const words = summary.split(/(?<=\s)|(?=\n)/);
    let fullText = '';
    let i = 0;

    await new Promise((resolve) => {
      function typeNext() {
        const batchSize = 3;
        for (let j = 0; j < batchSize && i < words.length; j++, i++) {
          fullText += words[i];
        }
        body.innerHTML = renderMarkdown(fullText) + '<span class="cursor"></span>';
        body.scrollTop = body.scrollHeight;

        if (i < words.length) {
          setTimeout(typeNext, 30);
        } else {
          body.innerHTML = renderMarkdown(fullText);
          resolve();
        }
      }
      typeNext();
    });
  } catch {
    body.innerHTML = `<div class="summary-error">Unable to generate summary. Please try again.</div>`;
  }

  resetSummarizeBtn();
}

function resetSummarizeBtn() {
  const btn = document.getElementById('summarizeBtn');
  btn.disabled = false;
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
    Summarize Today's News`;
}

function closeSummary(event) {
  if (event && event.target !== event.currentTarget) return;
  document.getElementById('summaryOverlay').style.display = 'none';
}

// ===== Markdown Renderer =====
function renderMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/^[-•] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>')
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<h[234]>)/g, '$1')
    .replace(/(<\/h[234]>)<\/p>/g, '$1')
    .replace(/<p>(<ul>)/g, '$1')
    .replace(/(<\/ul>)<\/p>/g, '$1');
}

// ===== Utilities =====
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
