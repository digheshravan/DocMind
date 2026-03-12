# DocMind - AI Document Intelligence

DocMind is a unified document intelligence platform that leverages AI to analyze and synthesize complex documents. It features two powerful tools sharing a single backend infrastructure:

1. **Legal Analyzer**: Upload contracts or leases for instant risk analysis, clause breakdown, and plain-english explanations.
2. **Research Synthesizer**: Upload up to 15 academic papers to generate a literature review, detect contradictions between papers, map research gaps, and chat with your documents using RAG (Retrieval-Augmented Generation).

## Features

- **FastAPI Backend**: High-performance async Python backend.
- **React + Vite Frontend**: Modern, responsive, premium dark-mode UI built with Tailwind CSS.
- **ChromaDB Integration**: Local vector database for the Research Synthesizer's RAG capabilities.
- **Groq LLM API**: Powers the reasoning required for legal risk classification and academic synthesis.

## Screenshots

*(Screenshots will be added here post-deployment)*

## Setup Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+
- A Groq API Key

### Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd docmind/backend
   ```
2. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables:
   Copy `.env.example` to `.env` and add your `GROQ_API_KEY`:
   ```env
   GROQ_API_KEY=your-api-key-here
   DATABASE_URL=sqlite+aiosqlite:///./docmind.db
   CHROMA_PATH=./chroma_db
   ```
5. Start the backend server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   The API will be available at `http://localhost:8000`. API documentation is at `http://localhost:8000/docs`.

### Frontend Setup
1. Navigate to the `frontend` directory:
   ```bash
   cd docmind/frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:5173`.

## Architecture

- **Shared Pipeline Engine**: Both features use an orchestrated multi-step pipeline pattern using Python `asyncio` to reduce processing time.
- **Storage**: SQLite for relational data (analysis records, metadata) and ChromaDB for vector embeddings.
- **Frontend State**: `react-hot-toast` for notifications and `@tanstack/react-query` for server state management.
