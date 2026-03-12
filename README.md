# DocMind - AI Document Intelligence 🚀

DocMind is a unified document intelligence platform that leverages AI to analyze and synthesize complex documents. It features a sophisticated legal suite and a powerful research synthesis engine, all sharing a high-performance backend infrastructure.

## ✨ Core Modules

### 1. ⚖️ Legal Intelligence Suite
- **Interactive Risk Scoreboard**: Visual breakdown of document risk levels with dynamic gauges and distribution charts.
- **Risk Analyzer**: Upload contracts or leases for high-speed parallel clause classification and plain-english explanations.
- **Side-by-Side Comparison**: Pair two legal analyses to detect differences, conflicts, and determine favorability (Document A vs Document B).
- **Conflict Filtering**: Focus exclusively on significant variations and unfavorable terms with a single toggle.
- **Legal Assistant Sidebar**: A RAG-powered chat sidebar for deep-diving into specific clauses and obligations.

### 2. 🔬 Research Synthesizer
- **Automated Literature Review**: Upload up to 15 academic papers to generate a structured synthesis of introduction, findings, and conclusions.
- **Contradiction Detection**: Pairwise analysis across multiple papers to map conflicting findings automatically.
- **Research Gap Mapping**: Identify missing links and future research directions based on your document set.
- **Semantic Data Chat**: Context-aware RAG assistant specifically tuned for academic inquiry.

## 📺 Demo

> [!IMPORTANT]
> **Action Required**: Upload your walkthrough video to YouTube (set to "Unlisted" or "Public"). 
> Once uploaded, replace `YOUR_VIDEO_ID` in the link below!

<div align="center">
  <a href="https://youtu.be/lHGxaPUmmMU">
    <img src="https://youtu.be/lHGxaPUmmMU/maxresdefault.jpg" alt="DocMind Feature Demo" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
  </a>
  <p><i>Click to watch the DocMind platform walkthrough</i></p>
</div>

## 🛠️ Features

- **FastAPI Pro Backend** — Optimized for high-throughput with multi-step pipelines.
- **Sync-over-Async DB** — Robust **SQLAlchemy** backend configured for stability on Windows environments.
- **Premium Analytics UI** — Sophisticated React + Vite interface with glassmorphism, Recharts visualization, and smooth transitions.
- **Llama 3.3 Intelligence** — Powered by **Groq** for lightning-fast inference and analysis (avg. <2s response time).
- **RAG Architecture** — **ChromaDB** ensures all your semantic data stays local and searchable.
- **Cloud-Ready** — Built-in support for Docker and environment-based configuration.

## 🏗️ Architecture

```text
docmind/
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI entry point
│   │   ├── database.py           # Synchronous SQLAlchemy (Windows Optimized)
│   │   ├── routers/              # Feature-based API endpoints
│   │   ├── services/             # Core logic (Groq API, Legal, Research, RAG)
│   │   └── models/               # SQLAlchemy definitions
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/           # Reusable UI (Gauges, Charts, ChatSidebar)
│   │   ├── pages/                # Feature views (Analyzer, Comparator, Synth)
│   │   └── context/              # Global state management
│   └── vite.config.js
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- Groq API Key (from [console.groq.com](https://console.groq.com))

### 1. Clone & Setup
```bash
git clone https://github.com/digheshravan/DocMind.git
cd DocMind/docmind
```

### 2. Configure Environment
Create a `.env` file in `backend/`:
```env
GROQ_API_KEY=your-api-key-here
DATABASE_URL=sqlite:///./docmind.db
CHROMA_PATH=./chroma_db
```

### 3. Run the Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

### 4. Run the Frontend
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) to start exploring.

## 📝 Technical Notes

- **Database Stability**: Moving to a Synchronous SQLite connection ensures full compatibility with the Python `asyncio` loop on Windows systems.
- **AI Performance**: Uses `llama-3.3-70b-versatile` via Groq for high-reliability JSON extraction.
- **Embeddings**: Local processing via `all-MiniLM-L6-v2` ensures data privacy and offline query capability.

---
**Shravan Dige** — [@digheshravan](https://github.com/digheshravan)
