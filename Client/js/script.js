document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const newsList = document.getElementById('news-list');
    const portfolioForm = document.getElementById('portfolio-form');
    const portfolioInput = document.getElementById('portfolio-input');
    const filteredNewsList = document.getElementById('filtered-news-list');
    const aiAnalysisList = document.getElementById('ai-analysis-list');

    // Add a container for last updated info
    let lastUpdatedDiv = document.getElementById('news-last-updated');
    if (!lastUpdatedDiv) {
        lastUpdatedDiv = document.createElement('div');
        lastUpdatedDiv.id = 'news-last-updated';
        lastUpdatedDiv.style = 'text-align:right;font-size:0.95em;color:#a0cfff;margin-top:0.5rem;';
        newsList.parentNode.appendChild(lastUpdatedDiv);
    }

    // Demo data for initial UI
    const demoNews = [
        { title: 'Sensex surges 500 points as IT stocks rally', source: 'Moneycontrol', url: 'https://www.moneycontrol.com/news/business/markets/', date: null },
        { title: 'Reliance shares hit new high after Q4 results', source: 'Economic Times', url: 'https://economictimes.indiatimes.com/markets', date: null },
        { title: 'TCS announces major hiring plans for 2024', source: 'Business Standard', url: 'https://www.business-standard.com/', date: null },
        { title: 'RBI keeps repo rate unchanged', source: 'Mint', url: 'https://www.livemint.com/', date: null },
    ];

    let currentNews = demoNews; // Will be updated after fetch

    // Helper to format date
    function formatDate(dateStrOrMs) {
        if (!dateStrOrMs) return '';
        if (typeof dateStrOrMs === 'number') {
            const d = new Date(dateStrOrMs);
            return d.toLocaleString();
        }
        // Try to parse date string
        return dateStrOrMs;
    }

    // Render general news headlines (with clickable links and date)
    function renderGeneralNews(newsArray) {
        newsList.innerHTML = '';
        newsArray.forEach(item => {
            const div = document.createElement('div');
            div.className = 'news-item';
            let dateHtml = item.date ? `<span style=\"font-size:0.9em;color:#a0cfff;float:right;\">${formatDate(item.date)}</span>` : '';
            let titleHtml = (item.url && typeof item.url === 'string' && item.url.startsWith('http'))
                ? `<a href=\"${item.url}\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"color:inherit;text-decoration:none;\"><strong>${item.title}</strong></a>`
                : `<strong>${item.title}</strong>`;
            div.innerHTML = `${titleHtml}<br><span style=\"color:#4fc3ff;\">${item.source}</span>${dateHtml}`;
            newsList.appendChild(div);
        });
    }

    // Set last updated info
    function setLastUpdated(lastUpdated) {
        if (lastUpdatedDiv) {
            lastUpdatedDiv.textContent = lastUpdated ? `Last updated: ${formatDate(lastUpdated)}` : '';
        }
    }

    // Fetch general news from backend
    async function fetchGeneralNews() {
        try {
            const res = await fetch('http://localhost:5000/api/news');
            if (!res.ok) throw new Error('Network response was not ok');
            const data = await res.json();
            if (data.news && Array.isArray(data.news)) {
                currentNews = data.news;
                renderGeneralNews(currentNews);
                setLastUpdated(data.lastUpdated);
            } else {
                renderGeneralNews(demoNews);
                setLastUpdated(null);
            }
        } catch (err) {
            console.error('Failed to fetch news from backend:', err);
            renderGeneralNews(demoNews);
            setLastUpdated(null);
        }
    }

    // Filter news by portfolio symbols
    function filterNewsByPortfolio(newsArray, symbols) {
        // Simple filter: check if any symbol is in the headline
        return newsArray.filter(item =>
            symbols.some(sym => item.title.toUpperCase().includes(sym))
        );
    }

    // Render filtered news (with clickable links and date)
    function renderFilteredNews(filteredArray) {
        filteredNewsList.innerHTML = '';
        filteredArray.forEach(item => {
            const div = document.createElement('div');
            div.className = 'filtered-news-item';
            let dateHtml = item.date ? `<span style=\"font-size:0.9em;color:#a0cfff;float:right;\">${formatDate(item.date)}</span>` : '';
            let titleHtml = (item.url && typeof item.url === 'string' && item.url.startsWith('http'))
                ? `<a href=\"${item.url}\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"color:inherit;text-decoration:none;\"><strong>${item.title}</strong></a>`
                : `<strong>${item.title}</strong>`;
            div.innerHTML = `${titleHtml}<br><span style=\"color:#4fc3ff;\">${item.source}</span>${dateHtml}`;
            filteredNewsList.appendChild(div);
        });
    }

    // Fetch AI analysis from backend (real-time, no placeholders)
    async function fetchAIAnalysis(filteredArray, symbols) {
        aiAnalysisList.innerHTML = '<div style="color:#a0cfff;">Analyzing with AI...</div>';
        try {
            const res = await fetch('http://localhost:5000/api/ai-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ news: filteredArray, portfolio: symbols })
            });
            if (!res.ok) throw new Error('AI analysis failed');
            const data = await res.json();
            aiAnalysisList.innerHTML = '';
            if (data.analysis && Array.isArray(data.analysis)) {
                data.analysis.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'ai-analysis-item';
                    let dateHtml = item.date ? `<span style=\"font-size:0.9em;color:#a0cfff;float:right;\">${formatDate(item.date)}</span>` : '';
                    div.innerHTML = `<a href="${item.url}" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:none;"><strong>${item.title}</strong></a><br>
                        <span style=\"color:#4fc3ff;\">${item.source}</span>${dateHtml}<br>
                        <span style=\"color:#ffd700;\">Sentiment: <b>${item.sentiment}</b></span><br>
                        <span style=\"font-size:0.95em;color:#a0cfff;\">${item.reason}</span>`;
                    aiAnalysisList.appendChild(div);
                });
            } else {
                aiAnalysisList.innerHTML = '<div style="color:#ff6666;">No AI analysis available.</div>';
            }
        } catch (err) {
            aiAnalysisList.innerHTML = '<div style="color:#ff6666;">AI analysis failed.</div>';
        }
    }

    // Handle portfolio form submission
    portfolioForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const symbols = portfolioInput.value
            .split(',')
            .map(s => s.trim().toUpperCase())
            .filter(Boolean);
        if (symbols.length === 0) {
            alert('Please enter at least one stock symbol.');
            return;
        }
        // Filter news
        const filtered = filterNewsByPortfolio(currentNews, symbols);
        renderFilteredNews(filtered);
        fetchAIAnalysis(filtered, symbols);
    });

    // Initial load
    fetchGeneralNews();
});
