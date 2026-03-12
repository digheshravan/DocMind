import { Link, NavLink } from 'react-router-dom'
import { Scale, BookOpen, History, Zap } from 'lucide-react'

export default function Navbar() {
    const linkClass = ({ isActive }) =>
        `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
            ? 'bg-brand-600/30 text-brand-300 border border-brand-600/40'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
        }`

    return (
        <nav className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/90 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2 group">
                        <img src="/open_paws.png" alt="DocMind" className="h-9 w-auto object-contain transition-transform group-hover:scale-105" />
                        <span className="text-xl font-bold bg-gradient-to-r from-brand-400 to-purple-400 bg-clip-text text-transparent">
                            DocMind
                        </span>
                        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-950/60 border border-brand-700/40 text-brand-400 text-xs font-medium">
                            <Zap className="w-3 h-3" /> AI
                        </span>
                    </Link>

                    {/* Nav links */}
                    <div className="flex items-center gap-1">
                        <NavLink to="/legal" className={linkClass}>
                            <Scale className="w-4 h-4" />
                            <span className="hidden sm:inline">Legal</span>
                        </NavLink>
                        <NavLink to="/research" className={linkClass}>
                            <BookOpen className="w-4 h-4" />
                            <span className="hidden sm:inline">Research</span>
                        </NavLink>
                        <NavLink to="/history" className={linkClass}>
                            <History className="w-4 h-4" />
                            <span className="hidden sm:inline">History</span>
                        </NavLink>
                    </div>
                </div>
            </div>
        </nav>
    )
}
