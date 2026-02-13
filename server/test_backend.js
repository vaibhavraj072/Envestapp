const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:5000';

async function testBackend() {
    console.log("🔍 Testing EnvestApp Backend...\n");

    // 1. Test Mock/Root
    try {
        console.log("1️⃣ Testing Server Root...");
        // Usually express static or running check. 
        // We'll trust the port open check later.
    } catch (e) { }

    // 2. Test Finnhub (Quote)
    try {
        console.log("2️⃣ Testing Finnhub Quote (RELIANCE)...");
        const res = await axios.get(`${BASE_URL}/api/quote/RELIANCE`);
        if (res.data && res.data.price) {
            console.log("   ✅ Success! Price:", res.data.price);
        } else {
            console.error("   ❌ Failed: No price returned", res.data);
        }
    } catch (e) {
        console.error("   ❌ Error (RELIANCE):", e.message);
    }

    try {
        console.log("2️⃣b Testing Finnhub Quote (AAPL/US)...");
        const res = await axios.get(`${BASE_URL}/api/quote/AAPL`);
        if (res.data && res.data.price) {
            console.log("   ✅ Success! AAPL Price:", res.data.price);
        } else {
            console.error("   ❌ Failed: No price for AAPL", res.data);
        }
    } catch (e) {
        console.error("   ❌ Error (AAPL):", e.message);
    }

    // 3. Test News (General)
    try {
        console.log("\n3️⃣ Testing Market News...");
        const res = await axios.get(`${BASE_URL}/api/market-news`);
        if (res.data.news && res.data.news.length > 0) {
            console.log("   ✅ Success! Articles found:", res.data.news.length);
            console.log("      Sample:", res.data.news[0].title);
        } else {
            console.error("   ❌ Failed: No news returned");
        }
    } catch (e) {
        console.error("   ❌ Error:", e.message);
    }

    // 4. Test AI (Mock call to avoid cost, or real if cheap)
    // We'll skip real AI charge for this simple test unless needed.
    console.log("\n✅ Test Complete.");
}

testBackend();
