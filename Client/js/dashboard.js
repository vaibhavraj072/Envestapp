/**
 * EnvestApp Dashboard Logic
 * Handles charts, mock data, and API interactions.
 */

// --- 1. Constants & Mock Data ---

const STOCKS = {
    'SENSEX': { price: 72450.30, change: 0.85, name: 'BSE SENSEX' },
    'NIFTY 50': { price: 21980.15, change: 0.92, name: 'NIFTY 50' },
    'TCS': { price: 3980.50, change: 1.25, name: 'Tata Consultancy Services' },
    'RELIANCE': { price: 2985.60, change: 0.45, name: 'Reliance Industries' },
    'HDFCBANK': { price: 1450.25, change: -0.30, name: 'HDFC Bank' },
    'INFY': { price: 1650.75, change: 1.10, name: 'Infosys' },
    'ICICIBANK': { price: 1085.40, change: 0.60, name: 'ICICI Bank' },
    'SBIN': { price: 765.30, change: 2.15, name: 'State Bank of India' },
    'BHARTIARTL': { price: 1120.50, change: -0.15, name: 'Bharti Airtel' },
    'ITC': { price: 410.20, change: 0.10, name: 'ITC Ltd' },
    'WIPRO': { price: 485.60, change: 0.90, name: 'Wipro' },
    'HCLTECH': { price: 1560.80, change: 1.50, name: 'HCL Technologies' }
};

let activeSymbol = null;
let chart = null;
let lineSeries = null;

// --- 2. Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    initTicker();
    initWatchlist();
    initTopCompanies();
    initChart();

    // Default Load
    loadNewsFeed(); // Right panel

    // Event Listeners
    document.getElementById('analyze-btn').addEventListener('click', handleAnalyze);
    document.getElementById('main-search').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAnalyze();
    });
});

// --- 3. UI Components ---

function initTicker() {
    const container = document.getElementById('ticker-container');
    const items = ['SENSEX', 'NIFTY 50', 'BANK NIFTY', 'TCS', 'RELIANCE'];

    // Duplicate for infinite scroll effect
    const displayItems = [...items, ...items, ...items];

    container.innerHTML = displayItems.map(symbol => {
        const data = STOCKS[symbol] || { price: 0, change: 0 };
        const isPos = data.change >= 0;
        const color = isPos ? 'text-green-400' : 'text-red-400';
        const icon = isPos ? '▲' : '▼';

        return `
            <div class="flex items-center gap-2">
                <span class="font-bold text-gray-300 text-xs">${symbol}</span>
                <span class="text-xs ${color}">${data.price.toFixed(2)}</span>
                <span class="text-[10px] ${color} bg-white/5 px-1 rounded">${icon} ${Math.abs(data.change)}%</span>
            </div>
        `;
    }).join('');
}

function initTopCompanies() {
    const container = document.getElementById('top-companies-scroll');
    const topPicks = ['TCS', 'RELIANCE', 'HDFCBANK', 'INFY', 'SBIN'];

    container.innerHTML = topPicks.map(sym => {
        const data = STOCKS[sym];
        const isPos = data.change >= 0;
        const color = isPos ? 'text-green-400' : 'text-red-400';

        return `
            <div class="min-w-[180px] h-16 bg-[#131B2D] border border-gray-800 rounded-xl p-3 flex flex-col justify-center cursor-pointer hover:border-blue-500/50 transition relative group" onclick="selectCompany('${sym}')">
                <div class="flex justify-between items-center mb-1">
                    <span class="font-bold text-sm text-white">${sym}</span>
                    <span class="text-xs ${color}">${isPos ? '+' : ''}${data.change}%</span>
                </div>
                <div class="text-lg font-mono text-gray-400">₹${data.price}</div>
                <!-- Mini sparkline effect via CSS gradient as placeholder -->
                <div class="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-${isPos ? 'green' : 'red'}-500/20 to-transparent opacity-0 group-hover:opacity-100 transition"></div>
            </div>
        `;
    }).join('');
}

function initWatchlist() {
    const container = document.getElementById('watchlist-container');
    const symbols = Object.keys(STOCKS).filter(s => s !== 'SENSEX' && s !== 'NIFTY 50');

    container.innerHTML = symbols.map(sym => {
        const data = STOCKS[sym];
        const isPos = data.change >= 0;
        const colorClass = isPos ? 'text-green-400' : 'text-red-400';

        return `
            <div class="p-4 border-b border-gray-800 hover:bg-[#131B2D] cursor-pointer transition flex justify-between items-center group" onclick="selectCompany('${sym}')">
                <div>
                    <div class="font-bold text-sm text-gray-200 group-hover:text-blue-400 transition">${sym}</div>
                    <div class="text-[10px] text-gray-500">${data.name}</div>
                </div>
                <div class="text-right">
                    <div class="text-sm font-mono text-gray-300">₹${data.price}</div>
                    <div class="text-[10px] ${colorClass}">${isPos ? '+' : ''}${data.change}%</div>
                </div>
            </div>
        `;
    }).join('');
}

// --- 4. Chart Logic (Lightweight Charts) ---

function initChart() {
    const chartContainer = document.getElementById('main-chart');
    chart = LightweightCharts.createChart(chartContainer, {
        layout: {
            background: { type: 'solid', color: '#131B2D' },
            textColor: '#94A3B8',
        },
        grid: {
            vertLines: { color: '#1E293B' },
            horzLines: { color: '#1E293B' },
        },
        width: chartContainer.clientWidth,
        height: chartContainer.clientHeight,
        timeScale: {
            timeVisible: true,
            secondsVisible: false,
        },
    });

    lineSeries = chart.addAreaSeries({
        topColor: 'rgba(41, 121, 255, 0.56)',
        bottomColor: 'rgba(41, 121, 255, 0.04)',
        lineColor: 'rgba(41, 121, 255, 1)',
        lineWidth: 2,
    });

    window.addEventListener('resize', () => {
        chart.resize(chartContainer.clientWidth, chartContainer.clientHeight);
    });
}

function updateChartData(symbol) {
    // Generate mock intraday data
    const data = [];
    let price = STOCKS[symbol]?.price || 1000;
    const now = new Date();
    now.setHours(9, 15, 0, 0); // Market Open

    for (let i = 0; i < 100; i++) {
        price = price * (1 + (Math.random() - 0.5) * 0.01);
        data.push({
            time: now.getTime() / 1000 + i * 300, // 5 min intervals
            value: price
        });
    }

    lineSeries.setData(data);
    chart.timeScale().fitContent();
}

// --- 5. Core Interaction Logic ---

function selectCompany(symbol) {
    if (!STOCKS[symbol]) return;
    activeSymbol = symbol;

    // Update Header
    document.getElementById('active-company-name').textContent = symbol;
    document.getElementById('active-company-price').textContent = '₹' + STOCKS[symbol].price.toFixed(2);

    const change = STOCKS[symbol].change;
    const changeEl = document.getElementById('active-company-change');
    changeEl.textContent = (change >= 0 ? '+' : '') + change + '%';
    changeEl.className = `text-sm font-medium ${change >= 0 ? 'text-green-400' : 'text-red-400'}`;

    // Show Panel
    document.getElementById('welcome-state').classList.add('hidden');
    document.getElementById('company-header').classList.remove('hidden');
    document.getElementById('ai-analysis-container').classList.remove('hidden');

    // Update Chart
    updateChartData(symbol);

    // Reset AI Section
    document.getElementById('ai-sentiment-badge').className = 'px-3 py-1 rounded-full text-xs font-bold bg-gray-700 text-gray-300';
    document.getElementById('ai-sentiment-badge').textContent = 'READY TO ANALYZE';
    document.getElementById('ai-reason-text').innerHTML = 'Click the <b>"Analyze"</b> button above to run real-time AI sentiment analysis on the latest news for this stock.';
}

async function handleAnalyze() {
    const searchVal = document.getElementById('main-search').value.trim().toUpperCase();
    const symbol = searchVal || activeSymbol;

    if (!symbol) {
        alert("Please search for a stock or select one from the list.");
        return;
    }

    // If searched manually, try to select/mock it
    if (!activeSymbol || activeSymbol !== symbol) {
        // Mock add if not exists
        if (!STOCKS[symbol]) {
            STOCKS[symbol] = { price: 1000 + Math.random() * 2000, change: (Math.random() - 0.5) * 2, name: symbol };
        }
        selectCompany(symbol);
    }

    // AI Loading State
    const badge = document.getElementById('ai-sentiment-badge');
    badge.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> ANALYZING...';
    badge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/50';

    try {
        // 1. Fetch News First (to send to AI)
        // In this demo, we use the backend 'everything' or just headlines
        const res = await fetch('http://localhost:5000/api/news');
        const data = await res.json();

        // Filter news for this stock locally
        const relevantNews = (data.news || []).filter(n =>
            n.title.toLowerCase().includes(symbol.toLowerCase()) ||
            n.title.toLowerCase().includes('market') // Fallback context
        ).slice(0, 5); // Take top 5

        if (relevantNews.length === 0) {
            badge.textContent = 'NO NEWS FOUND';
            badge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-gray-700 text-gray-300';
            document.getElementById('ai-reason-text').textContent = "No recent specific news found to analyze. Market context is neutral.";
            return;
        }

        // 2. Send to AI Analysis
        const aiRes = await fetch('http://localhost:5000/api/ai-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ news: relevantNews, portfolio: [symbol] })
        });

        const aiData = await aiRes.json();

        if (aiData.analysis && aiData.analysis.length > 0) {
            // Aggregate sentiment (simple majority logic for demo)
            const sentiments = aiData.analysis.map(a => a.sentiment);
            const pos = sentiments.filter(s => s === 'Positive').length;
            const neg = sentiments.filter(s => s === 'Negative').length;

            let finalSentiment = 'Neutral';
            if (pos > neg) finalSentiment = 'Positive';
            if (neg > pos) finalSentiment = 'Negative';

            // Update UI
            updateSentimentUI(finalSentiment, aiData.analysis[0].reason); // Show reason from first relevant article
        }

    } catch (err) {
        console.error(err);
        badge.textContent = 'ERROR';
        badge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400';
    }
}

function updateSentimentUI(sentiment, reason) {
    const badge = document.getElementById('ai-sentiment-badge');

    let colorClass, bgClass;
    if (sentiment === 'Positive') {
        colorClass = 'text-green-400';
        bgClass = 'bg-green-500/20 border-green-500/50';
    } else if (sentiment === 'Negative') {
        colorClass = 'text-red-400';
        bgClass = 'bg-red-500/20 border-red-500/50';
    } else {
        colorClass = 'text-yellow-400';
        bgClass = 'bg-yellow-500/20 border-yellow-500/50';
    }

    badge.className = `px-3 py-1 rounded-full text-xs font-bold border ${bgClass} ${colorClass}`;
    badge.innerHTML = `${sentiment.toUpperCase()} <i class="fa-solid ${sentiment === 'Positive' ? 'fa-arrow-trend-up' : (sentiment === 'Negative' ? 'fa-arrow-trend-down' : 'fa-minus')}"></i>`;

    document.getElementById('ai-reason-text').textContent = reason || "AI analysis completed based on recent market news.";
}

// --- 6. Market News Feed ---

async function loadNewsFeed() {
    const container = document.getElementById('news-feed-container');
    try {
        const res = await fetch('http://localhost:5000/api/news');
        const data = await res.json();

        if (data.news && data.news.length) {
            container.innerHTML = data.news.map(item => `
                <div class="bg-[#131B2D] p-3 rounded-lg border border-gray-800 hover:border-gray-700 transition group">
                    <div class="flex justify-between items-start mb-2">
                        <span class="text-[10px] text-blue-400 font-bold bg-blue-500/10 px-1.5 py-0.5 rounded">${item.source}</span>
                        <span class="text-[10px] text-gray-500">${new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <a href="${item.url}" target="_blank" class="text-sm font-medium text-gray-300 group-hover:text-blue-400 transition line-clamp-2 leading-snug">
                        ${item.title}
                    </a>
                </div>
            `).join('');
        }
    } catch (e) {
        container.innerHTML = '<div class="text-red-500 text-xs text-center">Failed to load news</div>';
    }
}
