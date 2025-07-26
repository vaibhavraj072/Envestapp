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

let newsCache = { news: [], lastUpdated: null };
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

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

// ✅ Using OpenRouter instead of OpenAI
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

async function analyzeSentimentWithOpenRouter(headline, portfolio) {
  const prompt = `You are a financial news sentiment analyst. Given the following stock portfolio: [${portfolio.join(', ')}], and this news headline: "${headline}", analyze whether the news is POSITIVE, NEUTRAL, or NEGATIVE for the portfolio. Respond in JSON with keys 'sentiment' (one of: Positive, Neutral, Negative) and 'reason' (a short explanation).`;

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'anthropic/claude-3-haiku', // You can change to other models if needed
        messages: [
          { role: 'system', content: 'You are a financial news sentiment analyst.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 150,
        temperature: 0.2
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'http://localhost:3000', // Change if deployed
          'X-Title': 'Envestapp Sentiment',
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0].message.content;
    let result;
    try {
      result = JSON.parse(content);
    } catch (e) {
      const match = content.match(/sentiment\s*[:=]\s*(Positive|Neutral|Negative)/i);
      const sentiment = match ? match[1] : 'Neutral';
      const reason = content.replace(/.*reason\s*[:=]/i, '').trim();
      result = { sentiment, reason };
    }
    return result;

  } catch (err) {
    console.error('OpenRouter API error:', err.message);
    return { sentiment: 'Unknown', reason: 'OpenRouter API error' };
  }
}

// ✅ Replace with OpenRouter version
app.post('/api/ai-analysis', async (req, res) => {
  const { news, portfolio } = req.body;
  if (!Array.isArray(news) || !Array.isArray(portfolio) || portfolio.length === 0) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  const results = await Promise.all(news.map(async (item) => {
    const analysis = await analyzeSentimentWithOpenRouter(item.title, portfolio);
    return {
      ...item,
      sentiment: analysis.sentiment,
      reason: analysis.reason
    };
  }));
  res.json({ analysis: results });
});

app.get('/api/news', async (req, res) => {
  const now = Date.now();
  if (newsCache.lastUpdated && (now - newsCache.lastUpdated < CACHE_DURATION)) {
    return res.json({ news: newsCache.news, lastUpdated: newsCache.lastUpdated });
  }
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

// Optional: Test endpoint for sentiment check
app.get('/api/test-sentiment', async (req, res) => {
  try {
    const prompt = `Is the Indian stock market sentiment positive today? Respond in JSON with keys 'sentiment' and 'reason'.`;
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'anthropic/claude-3-haiku',
        messages: [
          { role: 'system', content: 'You are a financial sentiment analyst.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 100,
        temperature: 0.2
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Envestapp Sentiment',
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
