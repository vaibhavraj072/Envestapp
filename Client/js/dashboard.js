// ===============================
// EnvestApp Dashboard Controller
// ===============================

const API_BASE = "http://localhost:5000";

const TRACKED_SYMBOLS = [
    'SENSEX', 'NIFTY 50', 'BANK NIFTY',
    'TCS', 'RELIANCE', 'HDFCBANK', 'INFY', 'SBIN',
    'ICICIBANK', 'BHARTIARTL', 'ITC', 'TATAMOTORS'
];

const INDICES = ['SENSEX', 'NIFTY 50', 'BANK NIFTY'];

let activeSymbol = 'SENSEX';
let chart = null;
let lineSeries = null;
let currentCompanyNews = [];
let quoteMemory = {}; // frontend memory cache


// ===============================
// INIT
// ===============================

document.addEventListener('DOMContentLoaded', async () => {
    initChart();
    renderWatchlistSkeleton();

    await updateWatchlistPrices();
    await loadGlobalNews();
    await selectCompany(activeSymbol);

    document.getElementById('analyze-btn').addEventListener('click', handleAnalyze);
});


// ===============================
// API HELPERS
// ===============================

async function fetchStockData(symbol) {
    if (quoteMemory[symbol]) return quoteMemory[symbol];

    try {
        const res = await fetch(`${API_BASE}/api/quote/${encodeURIComponent(symbol)}`);
        if (!res.ok) throw new Error("Quote fetch failed");

        const data = await res.json();
        quoteMemory[symbol] = data; // cache in memory
        return data;
    } catch (err) {
        console.warn("Quote error:", symbol, err.message);
        return { price: 0, change: 0 };
    }
}


// ===============================
// WATCHLIST + TICKERS
// ===============================

async function updateWatchlistPrices() {
    const listContainer = document.getElementById('company-list');
    const tickerIndices = document.getElementById('ticker-indices');
    const tickerCompanies = document.getElementById('ticker-companies');

    listContainer.innerHTML = '';
    tickerIndices.innerHTML = '';
    tickerCompanies.innerHTML = '';

    for (const sym of TRACKED_SYMBOLS) {

        // slight delay to prevent burst
        await new Promise(r => setTimeout(r, 250));

        const data = await fetchStockData(sym);

        listContainer.innerHTML += renderSidebarItem(sym, data);

        if (INDICES.includes(sym)) {
            tickerIndices.innerHTML += renderTickerItem(sym, data, true);
        } else {
            tickerCompanies.innerHTML += renderTickerItem(sym, data, false);
        }
    }
}

function renderTickerItem(symbol, data, isIndex) {
    const isPos = data.change >= 0;
    const color = isPos ? 'text-green-400' : 'text-red-400';
    const icon = isPos ? '▲' : '▼';

    return `
        <div class="flex items-center gap-2 cursor-pointer px-3 py-1 rounded hover:bg-[#21262D]"
             onclick="selectCompany('${symbol}')">
            <span class="font-bold text-xs">${symbol}</span>
            <span class="text-xs ${color}">${data.price.toFixed(2)}</span>
            <span class="text-[10px] ${color}">${icon} ${Math.abs(data.change)}%</span>
        </div>
    `;
}

function renderSidebarItem(symbol, data) {
    const isPos = data.change >= 0;
    const color = isPos ? 'text-green-400' : 'text-red-400';

    return `
        <div id="sidebar-item-${symbol}"
             class="p-3 border-b border-[#30363D] hover:bg-[#21262D] cursor-pointer flex justify-between"
             onclick="selectCompany('${symbol}')">
            <div>
                <div class="text-xs font-bold">${symbol}</div>
            </div>
            <div class="text-right">
                <div class="text-xs">₹${data.price.toLocaleString()}</div>
                <div class="text-[10px] ${color}">
                    ${isPos ? '+' : ''}${data.change}%
                </div>
            </div>
        </div>
    `;
}

function renderWatchlistSkeleton() {
    document.getElementById('company-list').innerHTML =
        `<div class="p-4 text-center text-xs text-gray-500">Loading market data...</div>`;
}


// ===============================
// CHART
// ===============================

function initChart() {
    const container = document.getElementById('main-chart');

    chart = LightweightCharts.createChart(container, {
        layout: { background: { type: 'solid', color: '#161B22' }, textColor: '#8B949E' },
        grid: { vertLines: { color: '#21262D' }, horzLines: { color: '#21262D' } }
    });

    lineSeries = chart.addAreaSeries({
        topColor: 'rgba(41,121,255,0.4)',
        bottomColor: 'rgba(41,121,255,0.0)',
        lineColor: '#2979FF',
        lineWidth: 2,
    });
}

function generateMockChartData(basePrice) {
    const data = [];
    let price = basePrice;

    for (let i = 0; i < 60; i++) {
        price *= (1 + (Math.random() - 0.5) * 0.01);
        data.push({ time: i, value: price });
    }

    return data;
}


// ===============================
// COMPANY SELECTION
// ===============================

async function selectCompany(symbol) {
    activeSymbol = symbol;

    const data = await fetchStockData(symbol);

    document.getElementById('center-company-name').textContent = symbol;
    document.getElementById('center-company-price').textContent =
        '₹' + data.price.toLocaleString();

    const changeEl = document.getElementById('center-company-change');
    changeEl.textContent =
        (data.change >= 0 ? '+' : '') + data.change + '%';

    changeEl.className =
        `text-sm ${data.change >= 0 ? 'text-green-400' : 'text-red-400'}`;

    lineSeries.setData(generateMockChartData(data.price));

    await loadCompanyNews(symbol);
    resetAISection();
}


// ===============================
// NEWS
// ===============================

async function loadGlobalNews() {
    try {
        const res = await fetch(`${API_BASE}/api/market-news`);
        const data = await res.json();

        const container = document.getElementById('global-news-feed');

        if (!data.news) return;

        container.innerHTML = data.news.map(item => `
            <div class="p-3 border-b border-[#30363D]">
                <a href="${item.url}" target="_blank"
                   class="text-xs hover:text-blue-400">${item.title}</a>
            </div>
        `).join('');
    } catch (err) {
        console.error("Global news error:", err);
    }
}

async function loadCompanyNews(symbol) {
    const container = document.getElementById('company-news-container');
    container.innerHTML = '<div class="text-xs text-gray-500">Loading...</div>';

    try {
        const res = await fetch(`${API_BASE}/api/news?q=${encodeURIComponent(symbol)}`);
        const data = await res.json();

        currentCompanyNews = data.news || [];

        if (!currentCompanyNews.length) {
            container.innerHTML =
                '<div class="text-xs text-gray-500">No specific news found.</div>';
            return;
        }

        container.innerHTML = currentCompanyNews.map(item => `
            <div class="p-2 border-b border-[#30363D]">
                <a href="${item.url}" target="_blank"
                   class="text-xs hover:text-blue-400">${item.title}</a>
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML =
            '<div class="text-xs text-gray-500">Failed to load news.</div>';
    }
}


// ===============================
// AI ANALYSIS
// ===============================

async function handleAnalyze() {
    if (!currentCompanyNews.length) return;

    const badge = document.getElementById('ai-badge-status');
    badge.textContent = "ANALYZING...";

    try {
        const res = await fetch(`${API_BASE}/api/ai-analysis`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                news: currentCompanyNews.slice(0, 5),
                portfolio: [activeSymbol]
            })
        });

        const data = await res.json();
        renderAIResult(data.analysis[0]);
    } catch (err) {
        badge.textContent = "ERROR";
    }
}

function renderAIResult(result) {
    const badge = document.getElementById('ai-badge-status');
    badge.textContent = result.sentiment.toUpperCase();

    document.getElementById('ai-content').innerHTML = `
        <p class="text-sm">${result.reason}</p>
        <p class="text-xs mt-2">Confidence: ${result.confidence}%</p>
        <p class="text-xs">Risk: ${result.risk}</p>
    `;
}

function resetAISection() {
    document.getElementById('ai-badge-status').textContent = "IDLE";
    document.getElementById('ai-content').innerHTML =
        '<p class="text-xs text-gray-500">Click Analyze to generate AI insights.</p>';
}
