import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { Scale, AlertTriangle, CheckCircle, ChevronLeft, ArrowRight, ShieldAlert, Filter, Info, Zap } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import client from '../api/client'
import StatusBadge from '../components/StatusBadge'

export default function ComparisonResults() {
    const location = useLocation()
    const navigate = useNavigate()
    const queryParams = new URLSearchParams(location.search)
    const idA = queryParams.get('idA')
    const idB = queryParams.get('idB')
    const [showDiffsOnly, setShowDiffsOnly] = useState(false)

    const { data, isLoading, isError } = useQuery({
        queryKey: ['comparison', idA, idB],
        queryFn: async () => {
            const cleanIdA = idA.includes('_') ? idA.split('_')[1] : idA
            const cleanIdB = idB.includes('_') ? idB.split('_')[1] : idB
            const res = await client.post('/legal/compare', {
                analysis_id_a: parseInt(cleanIdA),
                analysis_id_b: parseInt(cleanIdB)
            })
            return res.data
        },
        enabled: !!idA && !!idB
    })

    if (!idA || !idB) return <div className="p-10 text-center text-slate-400">Invalid comparison IDs provided.</div>
    if (isLoading) return <div className="max-w-4xl mx-auto py-20 px-4"><LoadingSpinner message="Generating side-by-side comparison..." subMessage="Pairing clauses and analyzing favorable terms" /></div>
    if (isError) return <div className="p-10 text-center text-red-400">Comparison failed. Ensure both analyses exist.</div>

    const { overall, clause_comparisons: comparisons, doc_a, doc_b } = data
    
    const filteredComparisons = showDiffsOnly 
        ? comparisons.filter(c => !c.comparison.is_equivalent)
        : comparisons

    const getScoreColor = (score) => {
        if (score > 60) return 'text-red-400 bg-red-400'
        if (score > 30) return 'text-amber-400 bg-amber-400'
        return 'text-emerald-400 bg-emerald-400'
    }

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8 fade-in-up pb-32">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800/60 pb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/history')} className="p-2.5 hover:bg-slate-800 rounded-xl text-slate-400 transition-all border border-transparent hover:border-slate-700">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 text-[10px] font-bold uppercase tracking-widest border border-brand-500/20">Legal Suite</span>
                        </div>
                        <h1 className="text-3xl font-black text-slate-100 tracking-tight">Contract Comparison</h1>
                        <p className="text-slate-400 text-sm font-medium">Doc A vs Doc B Differential Intelligence</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setShowDiffsOnly(!showDiffsOnly)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                            showDiffsOnly 
                            ? 'bg-brand-500 text-white border-brand-400 shadow-lg shadow-brand-500/20' 
                            : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500'
                        }`}
                    >
                        <Filter className="w-4 h-4" />
                        {showDiffsOnly ? 'Showing Conflicts Only' : 'Show All Clauses'}
                    </button>
                </div>
            </div>

            {/* Overall Comparison & Scoreboard */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Scoreboard */}
                <div className="glass-card p-6 flex flex-col justify-between overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <Scale className="w-20 h-20 text-slate-400 rotate-12" />
                    </div>
                    
                    <div className="relative z-10 space-y-8">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Risk Scoreboard</h3>
                        
                        <div className="space-y-6">
                            {/* Doc A */}
                            <div className="space-y-2 text-left">
                                <div className="flex justify-between items-end">
                                    <span className="text-sm font-bold text-slate-200">Document A</span>
                                    <span className={`text-2xl font-black ${getScoreColor(doc_a.score).split(' ')[0]}`}>{Math.round(doc_a.score)}<span className="text-xs font-normal text-slate-500 ml-0.5">/100</span></span>
                                </div>
                                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div className={`h-full transition-all duration-1000 ${getScoreColor(doc_a.score).split(' ')[1]}`} style={{ width: `${doc_a.score}%` }} />
                                </div>
                            </div>

                            {/* VS Divider */}
                            <div className="flex items-center justify-center">
                                <span className="bg-slate-900 border border-slate-700 text-slate-500 text-[10px] px-2 py-0.5 rounded-md font-black italic">VS</span>
                            </div>

                            {/* Doc B */}
                            <div className="space-y-2 text-right">
                                <div className="flex justify-between items-end flex-row-reverse">
                                    <span className="text-sm font-bold text-slate-200">Document B</span>
                                    <span className={`text-2xl font-black ${getScoreColor(doc_b.score).split(' ')[0]}`}>{Math.round(doc_b.score)}<span className="text-xs font-normal text-slate-500 ml-0.5">/100</span></span>
                                </div>
                                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div className={`h-full transition-all duration-1000 ${getScoreColor(doc_b.score).split(' ')[1]}`} style={{ width: `${doc_b.score}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Executive Summary */}
                <div className="lg:col-span-2 glass-card bg-brand-950/20 border-brand-800/40 p-8 flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-brand-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-100">Executive Briefing</h3>
                    </div>
                    <div className="prose prose-invert prose-sm max-w-none">
                        <p className="text-slate-300 leading-relaxed text-base italic">
                            {overall.executive_summary}
                        </p>
                    </div>
                    {overall.key_variations?.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-brand-800/40 flex flex-wrap gap-2">
                             {overall.key_variations.map((v, i) => (
                                <span key={i} className="px-3 py-1 rounded-lg bg-slate-900/60 border border-slate-700/40 text-[11px] font-bold text-slate-300">
                                   {v}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Clause Comparison Table */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                        <Scale className="w-5 h-5 text-slate-400" />
                        <h2 className="text-xl font-black text-slate-200 uppercase tracking-tight">Clause-by-Clause Analysis</h2>
                    </div>
                    <span className="text-xs font-bold text-slate-500">{filteredComparisons.length} {showDiffsOnly ? 'Conflicts' : 'Pairs'} found</span>
                </div>

                <div className="space-y-8">
                    {filteredComparisons.map((item, idx) => (
                        <div 
                            key={idx} 
                            className={`glass-card p-0 overflow-hidden border-2 transition-all duration-300 ${
                                item.comparison.is_equivalent 
                                ? 'border-transparent opacity-80' 
                                : 'border-amber-500/10 shadow-xl shadow-amber-950/5'
                            }`}
                        >
                            {/* Header Strip */}
                            <div className="bg-slate-900/80 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <span className="px-3 py-1 rounded-lg bg-slate-800 text-xs font-black text-slate-300 uppercase tracking-widest">{item.clause_a.clause_type}</span>
                                    {item.comparison.is_equivalent ? (
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                            Equivalent Terms
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-500 uppercase tracking-widest">
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                            Significant Variation
                                        </div>
                                    )}
                                </div>
                                {!item.comparison.is_equivalent && item.comparison.favorability !== 'NEUTRAL' && (
                                    <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight ${
                                        item.comparison.favorability === 'DOCUMENT_A' ? 'bg-amber-950/60 text-amber-400 border border-amber-900/40' : 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/40'
                                    }`}>
                                        Favors {item.comparison.favorability.replace('DOCUMENT_', 'Doc ')}
                                    </div>
                                )}
                            </div>

                            {/* Side by Side Content */}
                            <div className="grid md:grid-cols-2 divide-x divide-slate-800/60 relative">
                                {!item.comparison.is_equivalent && (
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 border border-slate-700 shadow-xl">
                                         <ArrowRight className="w-4 h-4 text-slate-500" />
                                    </div>
                                )}
                                
                                {/* Side A */}
                                <div className={`p-6 bg-gradient-to-br transition-colors duration-500 ${
                                    item.comparison.favorability === 'DOCUMENT_A' ? 'from-amber-500/[0.03] to-transparent' : 'from-transparent to-transparent'
                                }`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Source Alpha</span>
                                        <StatusBadge level={item.clause_a.risk_level} />
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-100 mb-2 truncate" title={item.clause_a.clause_title}>{item.clause_a.clause_title}</h4>
                                    <div className="relative group">
                                        <div className="text-sm text-slate-400 leading-relaxed bg-slate-950/40 p-4 rounded-xl border border-slate-800/50 max-h-40 overflow-y-auto custom-scrollbar italic font-serif">
                                            "{item.clause_a.clause_text}"
                                        </div>
                                    </div>
                                </div>

                                {/* Side B */}
                                <div className={`p-6 bg-gradient-to-br transition-colors duration-500 ${
                                    item.comparison.favorability === 'DOCUMENT_B' ? 'from-emerald-500/[0.03] to-transparent' : 'from-transparent to-transparent'
                                }`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Source Beta</span>
                                        <StatusBadge level={item.clause_b.risk_level} />
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-100 mb-2 truncate" title={item.clause_b.clause_title}>{item.clause_b.clause_title}</h4>
                                    <div className="relative group">
                                        <div className="text-sm text-slate-400 leading-relaxed bg-slate-950/40 p-4 rounded-xl border border-slate-800/50 max-h-40 overflow-y-auto custom-scrollbar italic font-serif">
                                            "{item.clause_b.clause_text}"
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Analysis Bridge */}
                            <div className="bg-slate-900/40 p-8 border-t border-slate-800/60 relative">
                                <div className="absolute top-0 right-10 -translate-y-1/2">
                                     <div className="px-4 py-1.5 rounded-full bg-slate-900 border border-slate-700 text-[10px] font-black text-slate-500 uppercase tracking-widest shadow-xl">
                                         Counsel Analysis
                                     </div>
                                </div>
                                
                                <div className="flex flex-col lg:flex-row gap-8 lg:items-center">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-widest">
                                            <Info className="w-3.5 h-3.5" />
                                            Context & Delta
                                        </div>
                                        <p className="text-slate-200 text-sm leading-relaxed">{item.comparison.summary_of_difference}</p>
                                    </div>
                                    
                                    <div className="lg:w-1/3 p-4 rounded-xl bg-brand-500/5 border border-brand-500/10 shadow-inner">
                                        <div className="flex items-center gap-2 text-brand-400 font-bold text-[10px] uppercase tracking-widest mb-2">
                                            <Zap className="w-3.5 h-3.5" />
                                            Recommended Strategy
                                        </div>
                                        <p className="text-slate-200 text-[13px] font-medium leading-relaxed italic">
                                            "{item.comparison.recommendation}"
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
