import { Link } from 'react-router-dom'
import { Brain, ArrowLeft } from 'lucide-react'

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
            <div className="w-20 h-20 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-6">
                <Brain className="w-10 h-10 text-slate-600" />
            </div>
            <h1 className="text-6xl font-black text-slate-700 mb-4">404</h1>
            <h2 className="text-2xl font-bold text-slate-300 mb-3">Page Not Found</h2>
            <p className="text-slate-500 mb-8 max-w-sm">The document you're looking for doesn't exist or has been moved.</p>
            <Link to="/" className="btn-primary flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to DocMind
            </Link>
        </div>
    )
}
