import { Link } from 'react-router-dom'
import { Scale, BookOpen, Clock, ArrowRight, Zap, Shield, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import client from '../api/client'
import { useEffect } from 'react'
import { useAppContext } from '../context/AppContext'

function FeatureCard({ icon: Icon, title, description, badge, to, color }) {
    return (
        <Link to={to} className="group block">
            <div className={`glass-card h-full border transition-all duration-300 group-hover:border-opacity-80 group-hover:shadow-2xl group-hover:-translate-y-1 ${color.border}`}>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${color.icon} shadow-lg transition-transform duration-300 group-hover:scale-105`}>
                    <Icon className="w-7 h-7 text-white" />
                </div>
                <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-xl font-bold text-slate-100">{title}</h2>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color.badge}`}>{badge}</span>
                </div>
                <p className="text-slate-400 leading-relaxed mb-6">{description}</p>
                <div className={`inline-flex items-center gap-2 font-semibold text-sm transition-colors duration-200 ${color.text}`}>
                    Get started <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                </div>
            </div>
        </Link>
    )
}

export default function Home() {
    const { resetAll } = useAppContext()

    useEffect(() => {
        resetAll()
    }, [resetAll])

    const { data: historyData } = useQuery({
        queryKey: ['history-recent'],
        queryFn: async () => {
            const res = await client.get('/history')
            return res.data
        },
        retry: false,
    })

    const recent = historyData?.history?.slice(0, 3) || []

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            {/* Hero */}
            <div className="text-center mb-20 fade-in-up">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-950/60 border border-brand-700/40 text-brand-400 text-sm font-medium mb-6">
                    <Zap className="w-4 h-4" />
                    AI-Powered Document Intelligence
                </div>
                <h1 className="text-5xl sm:text-6xl font-extrabold mb-6 leading-tight">
                    <span className="bg-gradient-to-r from-white via-brand-200 to-purple-300 bg-clip-text text-transparent">
                        Understand Every
                    </span>
                    <br />
                    <span className="bg-gradient-to-r from-brand-400 to-purple-400 bg-clip-text text-transparent">
                        Document, Instantly
                    </span>
                </h1>
                <p className="text-slate-400 text-xl max-w-2xl mx-auto leading-relaxed">
                    DocMind uses Grok AI to analyze legal contracts and synthesize academic research — surfacing insights that would take hours to find manually.
                </p>
            </div>

            {/* Feature cards */}
            <div className="grid md:grid-cols-2 gap-6 mb-16 stagger-children">
                <FeatureCard
                    icon={Scale}
                    title="Legal Analyzer"
                    description="Upload any contract, lease, or terms-of-service PDF. AI extracts every clause, classifies risk as HIGH/MEDIUM/LOW, and gives you plain-English summaries with recommended actions."
                    badge="Single PDF"
                    to="/legal"
                    color={{
                        border: 'border-red-800/40 hover:border-red-600/60',
                        icon: 'bg-gradient-to-br from-red-600 to-rose-700',
                        badge: 'bg-red-950/60 text-red-400 border border-red-800/40',
                        text: 'text-red-400 hover:text-red-300',
                    }}
                />
                <FeatureCard
                    icon={BookOpen}
                    title="Research Synthesizer"
                    description="Upload 5–15 academic PDFs on any topic. AI chunks and embeds them, then generates a structured literature review, detects contradictions between papers, and maps research gaps."
                    badge="Up to 15 PDFs"
                    to="/research"
                    color={{
                        border: 'border-brand-800/40 hover:border-brand-600/60',
                        icon: 'bg-gradient-to-br from-brand-600 to-purple-700',
                        badge: 'bg-brand-950/60 text-brand-400 border border-brand-800/40',
                        text: 'text-brand-400 hover:text-brand-300',
                    }}
                />
            </div>

            {/* Capabilities strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
                {[
                    { icon: Shield, label: 'Risk Classification', desc: 'HIGH / MEDIUM / LOW' },
                    { icon: Search, label: 'RAG Chat', desc: 'Cite across all papers' },
                    { icon: Zap, label: 'Parallel AI', desc: 'asyncio.gather speed' },
                    { icon: BookOpen, label: 'Gap Mapping', desc: '4–6 research gaps' },
                ].map(({ icon: Icon, label, desc }) => (
                    <div key={label} className="glass rounded-xl p-4 text-center border border-slate-700/40">
                        <Icon className="w-5 h-5 text-brand-400 mx-auto mb-2" />
                        <p className="text-slate-200 text-sm font-medium">{label}</p>
                        <p className="text-slate-500 text-xs">{desc}</p>
                    </div>
                ))}
            </div>

            {/* Recent activity */}
            {recent.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-slate-400" />
                            Recent Activity
                        </h2>
                        <Link to="/history" className="text-sm text-brand-400 hover:text-brand-300 font-medium">
                            View all →
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {recent.map((item) => (
                            <Link
                                key={item.id}
                                to={item.type === 'legal' ? '/legal' : '/research'}
                                className="flex items-center justify-between p-4 glass rounded-xl hover:border-slate-600 transition-all duration-200 border border-slate-700/60"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.type === 'legal' ? 'bg-red-950/60' : 'bg-brand-950/60'}`}>
                                        {item.type === 'legal' ? <Scale className="w-4 h-4 text-red-400" /> : <BookOpen className="w-4 h-4 text-brand-400" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-200 truncate max-w-xs">{item.name}</p>
                                        <p className="text-xs text-slate-500">{item.type === 'legal' ? 'Legal Analysis' : 'Research Session'}</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${item.status === 'complete' ? 'bg-emerald-950/60 text-emerald-400' : 'bg-amber-950/60 text-amber-400'}`}>
                                    {item.status}
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
