// Initial List to Populate (Prices will be fetched)
const TRACKED_SYMBOLS = [
    'SENSEX', 'NIFTY 50', 'BANK NIFTY',
    'TCS', 'RELIANCE', 'HDFCBANK', 'INFY', 'SBIN',
    'ICICIBANK', 'BHARTIARTL', 'ITC', 'TATAMOTORS'
];

let activeSymbol = 'SENSEX';
let chart = null;
let lineSeries = null;

// --- 1. Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    initChart();
    initDashboard();

    // Event Listeners
    document.getElementById('analyze-btn').addEventListener('click', handleAnalyze);
    document.getElementById('main-search').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAnalyze();
    });
});

async function initDashboard() {
    // 1. Render skeletons
    renderWatchlistSkeleton();

    // 2. Fetch Global News
    loadGlobalNews();

    // 3. Fetch Prices for Tracked Symbols
    await updateWatchlistPrices();

    // 4. Load Default Details
    selectCompany('SENSEX');
}

// --- 2. Data Fetching ---

async function fetchStockData(symbol) {
    try {
        const res = await fetch(`http://localhost:5000/api/quote/${encodeURIComponent(symbol)}`);
        if (!res.ok) throw new Error('Failed to fetch');
        return await res.json();
    } catch (e) {
        console.warn(`Could not fetch data for ${symbol}`, e);
        return null;
    }
}

async function updateWatchlistPrices() {
    const listContainer = document.getElementById('company-list');
    const tickerIndices = document.getElementById('ticker-indices');
    const tickerCompanies = document.getElementById('ticker-companies');

    listContainer.innerHTML = '';
    tickerIndices.innerHTML = '';
    tickerCompanies.innerHTML = '';

    const indices = ['SENSEX', 'NIFTY 50', 'BANK NIFTY'];

    for (const sym of TRACKED_SYMBOLS) {
        const data = await fetchStockData(sym) || {
            symbol: sym, price: 0, change: 0, changeAmount: 0
        }; // Fallback if API fails

        // Add to Sidebar
        listContainer.innerHTML += renderSidebarItem(sym, data);

        // Add to Tickers
        if (indices.includes(sym)) {
            tickerIndices.innerHTML += renderTickerItem(sym, data, true);
        } else {
            tickerCompanies.innerHTML += renderTickerItem(sym, data, false);
        }
    }
}

// --- 3. Rendering Helpers ---

function renderTickerItem(symbol, data, isIndex) {
    const isPos = data.change >= 0;
    const color = isPos ? 'text-green-400' : 'text-danger';
    const icon = isPos ? '▲' : '▼';
    const bgHover = isIndex ? 'hover:bg-blue-900/20' : 'hover:bg-[#21262D]';

    return `
        <div class="flex items-center gap-2 cursor-pointer ${bgHover} px-3 py-1 rounded transition shrink-0" onclick="selectCompany('${symbol}')">
            <span class="font-bold ${isIndex ? 'text-blue-100' : 'text-gray-300'} text-xs">${symbol}</span>
            <span class="text-xs ${color}">${data.price.toFixed(2)}</span>
            <span class="text-[10px] ${color} opacity-80">${icon} ${Math.abs(data.change)}%</span>
        </div>
    `;
}

function renderSidebarItem(symbol, data) {
    const isPos = data.change >= 0;
    const color = isPos ? 'text-green-400' : 'text-danger';
    const nameMap = {
        'SENSEX': 'BSE SENSEX', 'NIFTY 50': 'NSE Nifty', 'RELIANCE': 'Reliance Ind.',
        'TCS': 'Tata Consultancy', 'HDFCBANK': 'HDFC Bank', 'SBIN': 'SBI'
    };
    const name = nameMap[symbol] || symbol;

    return `
        <div id="sidebar-item-${symbol}" class="p-3 border-b border-[#30363D] hover:bg-[#21262D] cursor-pointer transition flex justify-between items-center group" onclick="selectCompany('${symbol}')">
            <div>
                <div class="font-bold text-xs text-gray-200 group-hover:text-blue-400 transition">${symbol}</div>
                <div class="text-[10px] text-gray-500 truncate max-w-[100px]">${name}</div>
            </div>
            <div class="text-right">
                <div class="text-xs font-mono text-gray-400">₹${data.price.toLocaleString()}</div>
                <div class="text-[10px] ${color}">${isPos ? '+' : ''}${data.change}%</div>
            </div>
        </div>
    `;
}

function renderWatchlistSkeleton() {
    document.getElementById('company-list').innerHTML = `
        <div class="p-4 text-center text-xs text-gray-500 animate-pulse">
            Loading market data...
        </div>
    `;
}

// --- 4. Chart Logic ---

function initChart() {
    const chartContainer = document.getElementById('main-chart');
    chart = LightweightCharts.createChart(chartContainer, {
        layout: { background: { type: 'solid', color: '#161B22' }, textColor: '#8B949E' },
        grid: { vertLines: { color: '#21262D' }, horzLines: { color: '#21262D' } },
        rightPriceScale: { borderColor: '#30363D' },
        timeScale: { borderColor: '#30363D', timeVisible: true, secondsVisible: false },
    });

    if (!chart) {
        console.error("Failed to create chart instance.");
        return;
    }

    try {
        console.log("Initializing Chart Series...");
        lineSeries = chart.addAreaSeries({
            topColor: 'rgba(41, 121, 255, 0.4)',
            bottomColor: 'rgba(41, 121, 255, 0.0)',
            lineColor: '#2979FF',
            lineWidth: 2,
        });
    } catch (err) {
        console.error("Error adding area series:", err);
        console.log("Available chart methods:", Object.keys(chart));
    }

    new ResizeObserver(entries => {
        if (entries.length === 0 || entries[0].target !== chartContainer) return;
        const newRect = entries[0].contentRect;
        chart.applyOptions({ width: newRect.width, height: newRect.height });
    }).observe(chartContainer);
}

function generateMockChartData(basePrice) {
    const data = [];
    let price = basePrice;
    const now = new Date();
    now.setHours(9, 15, 0, 0);
    for (let i = 0; i < 100; i++) {
        price = price * (1 + (Math.random() - 0.5) * 0.01);
        data.push({ time: now.getTime() / 1000 + i * 300, value: price });
    }
    return data;
}

// --- 5. User Interaction ---

async function selectCompany(symbol) {
    activeSymbol = symbol;

    // Highlight Sidebar
    document.querySelectorAll('[id^="sidebar-item-"]').forEach(el =>
        el.classList.remove('bg-[#21262D]', 'border-l-4', 'border-blue-500'));

    const activeItem = document.getElementById(`sidebar-item-${symbol}`);
    if (activeItem) {
        activeItem.classList.add('bg-[#21262D]', 'border-l-4', 'border-blue-500');
    }

    // Fetch Latest Data for Header
    const data = await fetchStockData(symbol) || { price: 0, change: 0 };

    document.getElementById('center-company-name').textContent = symbol;
    document.getElementById('center-company-price').textContent = '₹' + data.price.toLocaleString();
    const changeEl = document.getElementById('center-company-change');
    changeEl.textContent = (data.change >= 0 ? '+' : '') + data.change + '%';
    changeEl.className = `text-sm font-medium ${data.change >= 0 ? 'text-green-400' : 'text-danger'}`;

    // Update Chart (Mock history for now since Finnhub candle data requires more parsing)
    lineSeries.setData(generateMockChartData(data.price));
    chart.timeScale().fitContent();

    // Fetch News
    loadCompanyNews(symbol);

    // Reset AI
    resetAISection();
}

async function loadGlobalNews() {
    const container = document.getElementById('global-news-feed');
    try {
        const res = await fetch('http://localhost:5000/api/market-news');
        const data = await res.json();

        if (data.news && data.news.length) {
            container.innerHTML = data.news.map(item => `
                <div class="p-3 border-b border-[#30363D] hover:bg-[#21262D] transition group block">
                    <div class="flex justify-between items-start mb-1">
                        <span class="text-[10px] text-blue-400 font-bold max-w-[50%] truncate">${item.source}</span>
                        <span class="text-[10px] text-gray-600">${new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <a href="${item.url}" target="_blank" class="text-xs font-medium text-gray-300 group-hover:text-blue-400 leading-snug line-clamp-3 mb-1 block">
                        ${item.title}
                    </a>
                </div>
            `).join('');
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = '<div class="p-4 text-center text-xs text-danger">Failed to load market news</div>';
    }
}

async function loadCompanyNews(symbol) {
    const container = document.getElementById('company-news-container');
    container.innerHTML = '<div class="text-center py-4"><div class="loader mx-auto"></div></div>';

    try {
        const res = await fetch(`http://localhost:5000/api/news?q=${encodeURIComponent(symbol)}`);
        const data = await res.json();

        if (data.news && data.news.length) {
            container.innerHTML = data.news.map(item => `
                <div class="bg-[#21262D] p-3 rounded border border-[#30363D] hover:border-gray-500 transition">
                    <a href="${item.url}" target="_blank" class="text-xs text-gray-300 font-medium mb-2 hover:text-blue-400 block line-clamp-2">${item.title}</a>
                    <div class="flex justify-between items-center text-[10px] text-gray-500 mt-2">
                        <span class="bg-[#30363D] px-1.5 py-0.5 rounded text-gray-400">${item.source}</span>
                        <span>${new Date(item.date).toLocaleDateString()}</span>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="text-xs text-gray-500 text-center">No specific news found.</div>';
        }

    } catch (e) {
        container.innerHTML = '<div class="text-xs text-gray-500 text-center">Failed to load details.</div>';
    }
}

async function handleAnalyze() {
    const aiContainer = document.getElementById('ai-content');
    const badge = document.getElementById('ai-badge-status');
    const symbol = activeSymbol;

    badge.className = 'px-2 py-0.5 rounded text-[10px] bg-blue-900/40 text-blue-400 animate-pulse';
    badge.textContent = 'ANALYZING...';

    aiContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full gap-3">
            <div class="loader"></div>
            <span class="text-xs text-blue-400 animate-pulse">AI is reading news for ${symbol}...</span>
        </div>
    `;

    try {
        // 1. Fetch Company News first
        const newsRes = await fetch(`http://localhost:5000/api/news?q=${encodeURIComponent(symbol)}`);
        const newsData = await newsRes.json();
        const relevantNews = (newsData.news || []).slice(0, 5);

        if (relevantNews.length === 0) {
            throw new Error("No news to analyze");
        }

        // 2. Send to AI
        const aiRes = await fetch('http://localhost:5000/api/ai-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ news: relevantNews, portfolio: [symbol] })
        });
        const aiData = await aiRes.json();

        if (aiData.analysis && aiData.analysis.length > 0) {
            const result = aiData.analysis[0];
            renderAIResult(result);
        } else {
            throw new Error("AI returned no results");
        }

    } catch (err) {
        console.error(err);
        badge.textContent = 'ERROR';
        badge.className = 'px-2 py-0.5 rounded text-[10px] bg-red-900/40 text-red-500';
        aiContainer.innerHTML = '<div class="text-center text-xs text-danger mt-10">Analysis Failed: ' + err.message + '</div>';
    }
}

function renderAIResult(result) {
    const aiContainer = document.getElementById('ai-content');
    const badge = document.getElementById('ai-badge-status');
    const { sentiment, confidence, reason, risk } = result;

    let color = 'text-neutral';
    let bgConfig = 'bg-yellow-900/20 border-yellow-700/50';

    if (sentiment.toLowerCase().includes('positive')) { color = 'text-success'; bgConfig = 'bg-green-900/20 border-green-700/50'; }
    if (sentiment.toLowerCase().includes('negative')) { color = 'text-danger'; bgConfig = 'bg-red-900/20 border-red-700/50'; }

    badge.className = `px-2 py-0.5 rounded text-[10px] ${bgConfig.split(' ')[0]} ${color} border border-transparent`;
    badge.textContent = sentiment.toUpperCase();

    // Risk Meter width calculated
    let riskWidth = '50%';
    if (risk.toLowerCase() === 'low') riskWidth = '25%';
    if (risk.toLowerCase() === 'high') riskWidth = '85%';

    aiContainer.innerHTML = `
        <div class="text-left animate-fade-in w-full h-full flex flex-col">
            <div class="flex items-center justify-between mb-3 pb-2 border-b border-[#30363D]">
                <span class="text-xs text-gray-400">Confidence</span>
                <span class="text-xs font-mono text-white">${confidence}%</span>
            </div>
            
            <div class="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                <p class="text-sm font-medium ${color} mb-2 flex items-center gap-2">
                    <i class="fa-solid fa-circle text-[8px]"></i> Outlook: ${sentiment}
                </p>
                <p class="text-xs text-gray-400 leading-relaxed mb-4">
                    ${reason}
                </p>
                
                <div class="bg-[#0E1117] p-2 rounded border border-[#30363D]">
                    <span class="text-[10px] text-gray-500 uppercase font-bold block mb-1">Risk Level: ${risk}</span>
                    <div class="w-full h-1.5 bg-[#30363D] rounded-full overflow-hidden">
                        <div class="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500" style="width: ${riskWidth}"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function resetAISection() {
    const aiContainer = document.getElementById('ai-content');
    const badge = document.getElementById('ai-badge-status');

    badge.className = 'px-2 py-0.5 rounded text-[10px] bg-gray-700 text-gray-300';
    badge.textContent = 'IDLE';

    aiContainer.innerHTML = `
        <i class="fa-solid fa-robot text-gray-700 text-3xl mb-3"></i>
        <p class="text-gray-500 text-xs text-center px-4">Click "Analyze" to generate AI insights based on real-time news for ${activeSymbol}</p>
    `;
}
