require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- API KEYS ---
const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CX = process.env.GOOGLE_CX;

// Debug: Check permissions (masked)
console.log("--- CONFIG CHECK ---");
console.log("NEWSAPI_KEY:", NEWSAPI_KEY ? `PRESENT (${NEWSAPI_KEY.length} chars)` : "MISSING");
console.log("FINNHUB_API_KEY:", FINNHUB_API_KEY ? `PRESENT (${FINNHUB_API_KEY.length} chars)` : "MISSING");
console.log("OPENROUTER_API_KEY:", OPENROUTER_API_KEY ? `PRESENT (${OPENROUTER_API_KEY.length} chars)` : "MISSING");
console.log("--------------------");

// --- 1. MARKET DATA (Finnhub) ---

// Cache quotes briefly to avoid hitting rate limits (Finnhub free tier: 60 calls/min)
const quoteCache = {};
const QUOTE_TTL = 30 * 1000; // 30 seconds

app.get('/api/quote/:symbol', async (req, res) => {
  let { symbol } = req.params;
  symbol = symbol.toUpperCase();

  // Map common Indian indices/stocks to Finnhub symbols
  let querySymbol = symbol;
  if (!symbol.includes('.')) {
    querySymbol = `${symbol}.NS`; // Default to NSE
  }
  if (symbol === 'SENSEX') querySymbol = '^BSESN';
  if (symbol === 'NIFTY 50') querySymbol = '^NSEI';
  if (symbol === 'NIFTY_50') querySymbol = '^NSEI';
  if (symbol === 'BANK NIFTY') querySymbol = '^NSEBANK';

  // Check Cache
  if (quoteCache[querySymbol] && (Date.now() - quoteCache[querySymbol].time < QUOTE_TTL)) {
    console.log(`[CACHE] Serving ${symbol}`);
    return res.json(quoteCache[querySymbol].data);
  }

  try {
    console.log(`[API] Fetching Finnhub: ${querySymbol}`);
    const url = `https://finnhub.io/api/v1/quote?symbol=${querySymbol}&token=${FINNHUB_API_KEY}`;
    const response = await axios.get(url);

    const { c: current, d: change, dp: percentChange } = response.data;

    if (current === 0 && change === null) {
      console.warn(`[API] Symbol not found or empty: ${querySymbol}`);
      // Fallthrough to mock
      throw new Error("Symbol not found or returned empty");
    }

    const data = {
      symbol,
      price: current || 0,
      change: percentChange ? parseFloat(percentChange.toFixed(2)) : 0,
      changeAmount: change || 0
    };

    // Update Cache
    quoteCache[querySymbol] = { time: Date.now(), data };
    res.json(data);

  } catch (error) {
    console.error(`[ERROR] Finnhub for ${symbol}:`, error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
    }

    // --- FALLBACK MOCK DATA ---
    // Ensure app works even if API fails
    console.log(`[FALLBACK] Generating mock data for ${symbol}`);

    let basePrice = 1000;
    if (symbol === 'SENSEX') basePrice = 72000;
    if (symbol === 'NIFTY 50' || symbol === '^NSEI') basePrice = 22000;
    if (symbol === 'RELIANCE') basePrice = 2900;
    if (symbol === 'TCS') basePrice = 4000;
    if (symbol === 'HDFCBANK') basePrice = 1450;
    if (symbol === 'SBIN') basePrice = 760;

    // Randomize slightly
    const mockPrice = basePrice + (Math.random() * basePrice * 0.02 * (Math.random() > 0.5 ? 1 : -1));
    const mockChange = (Math.random() * 2 - 1).toFixed(2);

    res.json({
      symbol,
      price: parseFloat(mockPrice.toFixed(2)),
      change: parseFloat(mockChange),
      changeAmount: parseFloat((mockPrice * (mockChange / 100)).toFixed(2)),
      isMock: true
    });
  }
});

// --- 2. NEWS (NewsAPI + Google Custom Search) ---

// General Market News (NewsAPI)
app.get('/api/market-news', async (req, res) => {
  try {
    console.log(`[API] Fetching General Market News...`);
    const url = `https://newsapi.org/v2/everything?q="Indian Stock Market"&sortBy=publishedAt&pageSize=10&language=en&apiKey=${NEWSAPI_KEY}`;

    const response = await axios.get(url);

    if (!response.data || !response.data.articles) {
      throw new Error("Invalid NewsAPI response format");
    }

    const articles = response.data.articles.map(a => ({
      title: a.title,
      source: a.source.name,
      url: a.url,
      date: a.publishedAt,
      description: a.description
    })).filter(a => a.url && a.title);

    console.log(`[API] Fetched ${articles.length} articles`);
    res.json({ news: articles });
  } catch (error) {
    console.error("[ERROR] NewsAPI:", error.message);
    // Fallback or empty
    res.json({ news: [] });
  }
});

// Specific Company News (Google Custom Search)
app.get('/api/news', async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.redirect('/api/market-news');
  }

  try {
    console.log(`[API] Fetching News for: ${query}`);

    // Try Google Custom Search first
    if (GOOGLE_API_KEY && GOOGLE_CX) {
      const googleUrl = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query + " stock news India")}&cx=${GOOGLE_CX}&key=${GOOGLE_API_KEY}&num=5&sort=date`;
      const response = await axios.get(googleUrl);

      if (response.data.items) {
        const articles = response.data.items.map(item => ({
          title: item.title,
          source: item.displayLink || 'Google News',
          url: item.link,
          date: new Date().toISOString(),
          snippet: item.snippet
        }));
        return res.json({ news: articles });
      }
    }

    // Fallback to NewsAPI
    const newsApiUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=5&apiKey=${NEWSAPI_KEY}`;
    const response = await axios.get(newsApiUrl);
    const articles = response.data.articles.map(a => ({
      title: a.title,
      source: a.source.name,
      url: a.url,
      date: a.publishedAt
    }));

    res.json({ news: articles });

  } catch (error) {
    console.error("[ERROR] Specific News:", error.message);
    res.json({ news: [] }); // Return empty instead of error to keep UI clean
  }
});

// --- 3. AI ANALYSIS (OpenRouter) ---

app.post('/api/ai-analysis', async (req, res) => {
  const { news, portfolio } = req.body;

  if (!news || !news.length) {
    return res.status(400).json({ error: "No news provided for analysis" });
  }

  const company = portfolio[0];
  const newsContext = news.map((n, i) => `${i + 1}. ${n.title} (${n.source})`).join('\n');

  const prompt = `
    Analyze the sentiment for the stock "${company}" based on the following news headlines:
    ${newsContext}

    Determine if the sentiment is POSITIVE, NEGATIVE, or NEUTRAL.
    Provide a confidence score (0-100%) and a short reasoning paragraph (max 2 sentences).
    Also estimate a risk level (Low, Moderate, High).

    Return ONLY JSON in this format:
    {
        "sentiment": "Positive/Negative/Neutral",
        "confidence": 85,
        "reason": "Analysis explanation here...",
        "risk": "Moderate"
    }
    `;

  try {
    console.log(`[API] Analyzing Sentiment for ${company}...`);
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'anthropic/claude-3-haiku',
        messages: [
          { role: 'system', content: 'You are a financial analyst AI. Output valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5000',
        }
      }
    );

    let content = response.data.choices[0].message.content;
    const jsonResult = JSON.parse(content);
    res.json({ analysis: [jsonResult] });

  } catch (error) {
    console.error("[ERROR] AI API:", error.message);
    // Fallback AI response
    res.json({
      analysis: [{
        sentiment: 'Neutral',
        confidence: 50,
        reason: "AI analysis unavailable. Please try again later.",
        risk: "Moderate"
      }]
    });
  }
});

app.listen(PORT, () => {
  console.log(`EnvestApp Backend running on port ${PORT}`);
});
