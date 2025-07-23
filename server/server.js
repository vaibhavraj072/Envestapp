require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
const TOP_HEADLINES_URL = `https://newsapi.org/v2/top-headlines?country=in&pageSize=15&apiKey=${NEWSAPI_KEY}`;
const EVERYTHING_URL = `https://newsapi.org/v2/everything?q=stock%20market%20india&sortBy=publishedAt&pageSize=15&apiKey=${NEWSAPI_KEY}`;

// In-memory cache
let newsCache = {
  news: [],
  lastUpdated: null
};
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

// Fetch news from NewsAPI.org (top-headlines)
async function fetchTopHeadlines() {
  try {
    const { data } = await axios.get(TOP_HEADLINES_URL);
    if (data.status === 'ok' && Array.isArray(data.articles)) {
      return data.articles.map(article => ({
        title: article.title,
        source: article.source.name,
        url: article.url,
        date: article.publishedAt
      })).filter(item => item.title && item.url && item.url.startsWith('http'));
    }
    return [];
  } catch (err) {
    console.error('Error fetching top headlines from NewsAPI:', err.message);
    return [];
  }
}

// Fetch news from NewsAPI.org (everything)
async function fetchEverything() {
  try {
    const { data } = await axios.get(EVERYTHING_URL);
    if (data.status === 'ok' && Array.isArray(data.articles)) {
      return data.articles.map(article => ({
        title: article.title,
        source: article.source.name,
        url: article.url,
        date: article.publishedAt
      })).filter(item => item.title && item.url && item.url.startsWith('http'));
    }
    return [];
  } catch (err) {
    console.error('Error fetching everything from NewsAPI:', err.message);
    return [];
  }
}

// Merge and deduplicate news
function mergeAndDeduplicateNews(arrays, maxCount = 20) {
  const seen = new Set();
  const merged = [];
  for (const arr of arrays) {
    for (const item of arr) {
      const key = item.title.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(item);
        if (merged.length >= maxCount) return merged;
      }
    }
  }
  return merged;
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Utility: Analyze sentiment for a single headline
async function analyzeSentimentWithOpenAI(headline, portfolio) {
  const prompt = `You are a financial news sentiment analyst. Given the following stock portfolio: [${portfolio.join(', ')}], and this news headline: "${headline}", analyze whether the news is POSITIVE, NEUTRAL, or NEGATIVE for the portfolio. Respond in JSON with keys 'sentiment' (one of: Positive, Neutral, Negative) and 'reason' (a short explanation).`;
  try {
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a financial news sentiment analyst.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 100,
        temperature: 0.2
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    // Try to parse JSON from the response
    const content = response.data.choices[0].message.content;
    let result;
    try {
      result = JSON.parse(content);
    } catch (e) {
      // Fallback: try to extract sentiment and reason from text
      const match = content.match(/sentiment\s*[:=]\s*(Positive|Neutral|Negative)/i);
      const sentiment = match ? match[1] : 'Neutral';
      const reason = content.replace(/.*reason\s*[:=]/i, '').trim();
      result = { sentiment, reason };
    }
    return result;
  } catch (err) {
    console.error('OpenAI API error:', err.message);
    return { sentiment: 'Unknown', reason: 'OpenAI API error' };
  }
}

// API endpoint to get general news (with caching)
app.get('/api/news', async (req, res) => {
  const now = Date.now();
  if (newsCache.lastUpdated && (now - newsCache.lastUpdated < CACHE_DURATION)) {
    // Serve from cache
    return res.json({ news: newsCache.news, lastUpdated: newsCache.lastUpdated });
  }
  // Refresh cache
  const [topHeadlines, everything] = await Promise.all([
    fetchTopHeadlines(),
    fetchEverything()
  ]);
  const news = mergeAndDeduplicateNews([topHeadlines, everything]);
  if (news.length > 0) {
    newsCache.news = news;
    newsCache.lastUpdated = Date.now();
    res.json({ news: newsCache.news, lastUpdated: newsCache.lastUpdated });
  } else {
    res.json({ news: [], lastUpdated: Date.now() });
  }
});

// POST /api/ai-analysis
app.post('/api/ai-analysis', async (req, res) => {
  const { news, portfolio } = req.body;
  if (!Array.isArray(news) || !Array.isArray(portfolio) || portfolio.length === 0) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  // For each news item, analyze sentiment
  const results = await Promise.all(news.map(async (item) => {
    const analysis = await analyzeSentimentWithOpenAI(item.title, portfolio);
    return {
      ...item,
      sentiment: analysis.sentiment,
      reason: analysis.reason
    };
  }));
  res.json({ analysis: results });
});

// Temporary test route for OpenAI API
app.get('/api/test-openai', async (req, res) => {
  try {
    const prompt = "Is the Indian stock market sentiment positive today? Respond in JSON with keys 'sentiment' and 'reason'.";
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a financial news sentiment analyst.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 100,
        temperature: 0.2
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    res.json({ result: response.data.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Envestapp backend running on port ${PORT}`);
});