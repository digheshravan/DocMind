import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import LegalAnalyzer from './pages/LegalAnalyzer'
import ResearchSynth from './pages/ResearchSynth'
import History from './pages/History'
import ComparisonResults from './pages/ComparisonResults'
import NotFound from './pages/NotFound'
import { AppProvider } from './context/AppContext'

export default function App() {
    return (
        <AppProvider>
        <BrowserRouter>
            <div className="min-h-screen flex flex-col">
                <Navbar />
                <main className="flex-1">
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/legal" element={<LegalAnalyzer />} />
                        <Route path="/legal/compare" element={<ComparisonResults />} />
                        <Route path="/research" element={<ResearchSynth />} />
                        <Route path="/history" element={<History />} />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </main>
            </div>
            <Toaster 
                position="bottom-right"
                toastOptions={{
                    className: 'glass text-slate-100',
                    style: {
                        background: 'rgba(15, 23, 42, 0.9)',
                        color: '#f1f5f9',
                        border: '1px solid rgba(51, 65, 85, 0.6)',
                        backdropFilter: 'blur(12px)',
                    },
                    success: {
                        iconTheme: {
                            primary: '#10b981',
                            secondary: '#0f172a',
                        },
                    },
                    error: {
                        iconTheme: {
                            primary: '#ef4444',
                            secondary: '#0f172a',
                        },
                    },
                }}
            />
        </BrowserRouter>
        </AppProvider>
    )
}
