# EnvestApp

**EnvestApp** is a smart stock news sentiment analysis platform that allows users to link their stock portfolio and receive relevant news updates analyzed with AI. The app provides sentiment indicators (Positive, Neutral, or Negative) for each stock in the portfolio, even when no direct news is available, by leveraging historical trends and market context.

---

## 🚀 Features

- 🔗 **Portfolio Linking Module** – Input or link your stock portfolio (e.g., TCS, INFY, SBI).
- 📰 **News Scraping Module** – Automatically scrapes relevant news headlines and summaries.
- 🧠 **AI-Powered Sentiment Analysis** – Uses OpenAI to analyze news and provide a concise sentiment.
- 📊 **Fallback Sentiment Estimation** – If no news is available, the app generates likely sentiment based on historical and market behavior.
- 🌙 **Futuristic UI** – Dark mode interface with electric blue theme for a modern experience.

---

## 🧠 How it Works

1. **User submits a list of stocks (portfolio).**
2. **News related to the Indian stock market is scraped or passed to the backend.**
3. **Each news item is matched to a stock (by name or symbol).**
4. **Relevant articles are analyzed using OpenAI GPT-3.5 for sentiment.**
5. **If no news is found for a stock, fallback sentiment is generated using context-based AI prompts.**
6. **Sentiment report is returned for each stock.**

---

## 🛠️ Tech Stack

- **Frontend:** HTML, CSS (Dark Theme with Neon Blue)
- **Backend:** Node.js + Express
- **AI Integration:** OpenAI API (GPT-3.5 Turbo)
- **Data Handling:** Axios for API requests
- **Environment Config:** `.env` for secure API key management

---

---

## 🔧 Setup Instructions

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/yourusername/envestapp.git
   cd envestapp

2. **Install Dependencies:**
   ```bash
   npm install
   
3. **Add your OpenAI API Key:
Create a .env file in the root:

```bash
  OPENAI_API_KEY=your_api_key_here
```
4.Run the Project:
```bash
 npm start
```
##🤝 Contribution
We welcome contributions! Open a pull request or raise an issue if you want to add features or report bugs.

##👤 Author
Made with ❤️ by [Vaibhav Raj](https://vaibhavrajportfolio.vercel.app)


---

Let me know if you want me to include an OpenAI usage guide, a badge section (e.g., version, last commit), or deployment steps.

