const express = require('express');
const RSSParser = require('rss-parser');
const path = require('path');

const app = express();
const parser = new RSSParser({
  timeout: 10000,
  headers: {
    'User-Agent': 'WorldNews/1.0'
  }
});
const PORT = process.env.PORT || 3000;

// Verified, fact-checked news sources organized by continent
// All sources are internationally recognized for editorial standards
const FEEDS = {
  africa: [
    { name: 'BBC Africa', url: 'https://feeds.bbci.co.uk/news/world/africa/rss.xml', logo: 'BBC' },
    { name: 'Al Jazeera Africa', url: 'https://www.aljazeera.com/xml/rss/all.xml', logo: 'AJ' },
    { name: 'Reuters Africa', url: 'https://www.reutersagency.com/feed/?taxonomy=best-regions&post_type=best&best-regions=africa', logo: 'R' },
  ],
  asia: [
    { name: 'BBC Asia', url: 'https://feeds.bbci.co.uk/news/world/asia/rss.xml', logo: 'BBC' },
    { name: 'Al Jazeera Asia', url: 'https://www.aljazeera.com/xml/rss/all.xml', logo: 'AJ' },
    { name: 'Reuters Asia', url: 'https://www.reutersagency.com/feed/?taxonomy=best-regions&post_type=best&best-regions=asia', logo: 'R' },
  ],
  europe: [
    { name: 'BBC Europe', url: 'https://feeds.bbci.co.uk/news/world/europe/rss.xml', logo: 'BBC' },
    { name: 'Reuters Europe', url: 'https://www.reutersagency.com/feed/?taxonomy=best-regions&post_type=best&best-regions=europe', logo: 'R' },
    { name: 'DW News', url: 'https://rss.dw.com/xml/rss-en-world', logo: 'DW' },
  ],
  north_america: [
    { name: 'BBC North America', url: 'https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml', logo: 'BBC' },
    { name: 'NPR News', url: 'https://feeds.npr.org/1001/rss.xml', logo: 'NPR' },
    { name: 'AP News', url: 'https://rsshub.app/apnews/topics/apf-topnews', logo: 'AP' },
  ],
  south_america: [
    { name: 'BBC Latin America', url: 'https://feeds.bbci.co.uk/news/world/latin_america/rss.xml', logo: 'BBC' },
    { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', logo: 'AJ' },
    { name: 'DW News', url: 'https://rss.dw.com/xml/rss-en-world', logo: 'DW' },
  ],
  oceania: [
    { name: 'BBC Asia-Pacific', url: 'https://feeds.bbci.co.uk/news/world/asia/rss.xml', logo: 'BBC' },
    { name: 'ABC Australia', url: 'https://www.abc.net.au/news/feed/2942460/rss.xml', logo: 'ABC' },
    { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', logo: 'AJ' },
  ],
  antarctica: [
    { name: 'BBC Science', url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', logo: 'BBC' },
    { name: 'DW Science', url: 'https://rss.dw.com/xml/rss-en-science', logo: 'DW' },
  ],
};

// In-memory cache to avoid hammering RSS feeds
const cache = {};
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

async function fetchFeed(source) {
  try {
    const feed = await parser.parseURL(source.url);
    return feed.items.slice(0, 10).map(item => ({
      title: item.title || 'No title',
      link: item.link || '#',
      pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
      snippet: item.contentSnippet
        ? item.contentSnippet.substring(0, 200)
        : (item.content ? item.content.replace(/<[^>]*>/g, '').substring(0, 200) : ''),
      source: source.name,
      sourceLogo: source.logo,
      image: item.enclosure?.url || item['media:content']?.$.url || null,
    }));
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

// --- Smart extractive summary (no AI needed) ---

// Common filler words to ignore when detecting keywords
const STOP_WORDS = new Set([
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
      if (STOP_WORDS.has(word) || seen.has(word)) continue;
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

  // Remaining articles go under "Other Headlines"
  const remaining = articles.filter((_, i) => !used.has(i)).slice(0, 5);
  if (remaining.length > 0) {
    themes['Other Headlines'] = remaining;
  }

  return themes;
}

function buildSummary(articles, continentName) {
  if (articles.length === 0) {
    return 'No articles available to summarize for this continent.';
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

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint
app.get('/api/news/:continent', async (req, res) => {
  const continent = req.params.continent.toLowerCase();
  if (!FEEDS[continent]) {
    return res.status(400).json({ error: 'Invalid continent' });
  }
  try {
    const news = await getNewsForContinent(continent);
    res.json({
      continent,
      lastUpdated: new Date().toISOString(),
      articles: news,
      sources: FEEDS[continent].map(s => s.name),
    });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// Summarize today's news for a continent (extractive, no AI)
app.get('/api/summarize/:continent', async (req, res) => {
  const continent = req.params.continent.toLowerCase();
  if (!FEEDS[continent]) {
    return res.status(400).json({ error: 'Invalid continent' });
  }

  try {
    let articles = await getNewsForContinent(continent);
    const country = req.query.country;

    // If a country filter is provided, only include matching articles
    // Also check common aliases (e.g. "United States" matches "US", "USA", "America")
    const ALIASES = {
      'United States': ['united states','us','usa','america'],
      'UK': ['uk','britain','england','scotland'],
      'UAE': ['uae','united arab emirates'],
      'Czech Republic': ['czech republic','czech'],
    };
    if (country) {
      const terms = ALIASES[country] || [country.toLowerCase()];
      articles = articles.filter(a => {
        const text = `${a.title} ${a.snippet}`.toLowerCase();
        return terms.some(t => text.includes(t));
      });
    }

    const label = country || continent.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
    const summary = buildSummary(articles, label);

    // Stream it word-by-word for the same typing effect
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const words = summary.split(/(?<=\s)|(?=\n)/);
    let i = 0;

    function sendNext() {
      const batchSize = 3;
      let batch = '';
      for (let j = 0; j < batchSize && i < words.length; j++, i++) {
        batch += words[i];
      }
      if (batch) {
        res.write(`data: ${JSON.stringify({ text: batch })}\n\n`);
      }
      if (i < words.length) {
        setTimeout(sendNext, 30);
      } else {
        res.write('data: [DONE]\n\n');
        res.end();
      }
    }

    sendNext();
  } catch (err) {
    console.error('Summary error:', err);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// List available continents
app.get('/api/continents', (req, res) => {
  res.json(Object.keys(FEEDS).map(key => ({
    id: key,
    name: key.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
    sourceCount: FEEDS[key].length,
    sources: FEEDS[key].map(s => s.name),
  })));
});

app.listen(PORT, () => {
  console.log(`\n  WorldNews is running at http://localhost:${PORT}\n`);
});
