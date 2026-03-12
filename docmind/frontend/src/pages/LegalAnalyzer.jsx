import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Scale, AlertTriangle, ShieldAlert, CheckCircle, ChevronDown, ChevronUp, Filter, TrendingDown } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts'
import FileUpload from '../components/FileUpload'
import LoadingSpinner from '../components/LoadingSpinner'
import StatusBadge from '../components/StatusBadge'
import ErrorBoundary from '../components/ErrorBoundary'
import client from '../api/client'
import { useAppContext } from '../context/AppContext'

const LEGAL_STEPS = ['Uploading & parsing PDF', 'Extracting clauses', 'Classifying risk (parallel)', 'Generating summary']

// Animated circular risk gauge
function RiskGauge({ score }) {
    const radius = 70
    const circumference = 2 * Math.PI * radius
    const color = score > 70 ? '#ef4444' : score > 40 ? '#f59e0b' : '#10b981'
    const label = score > 70 ? 'HIGH RISK' : score > 40 ? 'MEDIUM RISK' : 'LOW RISK'
    const offset = circumference - (score / 100) * circumference

    return (
        <div className="flex flex-col items-center">
            <div className="relative">
                <svg width="180" height="180" className="-rotate-90">
                    <circle cx="90" cy="90" r={radius} fill="none" stroke="#1e293b" strokeWidth="14" />
                    <circle
                        cx="90" cy="90" r={radius} fill="none"
                        stroke={color} strokeWidth="14"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
                    <span className="text-4xl font-black" style={{ color }}>{Math.round(score)}</span>
                    <span className="text-xs text-slate-400 font-medium">/ 100</span>
                </div>
            </div>
            <span className="text-sm font-bold mt-2" style={{ color }}>{label}</span>
        </div>
    )
}

// Custom tooltip for the risk bar chart
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-[#0f111a]/95 backdrop-blur-md border border-slate-700/80 shadow-lg rounded-xl p-2.5 min-w-[150px]">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: data.fill }}>
                        {label} RISK
                    </p>
                    <span className="text-[9px] font-semibold text-slate-300 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/50">
                        {data.percentage}%
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded bg-slate-800/50 border border-slate-700/50">
                        <span className="text-sm font-bold" style={{ color: data.fill }}>{data.count}</span>
                    </div>
                    <p className="text-xs font-medium text-slate-300">
                        {data.count === 1 ? 'Clause' : 'Clauses'}
                    </p>
                </div>
            </div>
        );
    }
    return null;
}

// Expandable clause card
function ClauseCard({ clause }) {
    const [open, setOpen] = useState(false)
    const typeColors = {
        liability: 'bg-red-950/60 text-red-400',
        termination: 'bg-orange-950/60 text-orange-400',
        payment: 'bg-yellow-950/60 text-yellow-400',
        IP: 'bg-purple-950/60 text-purple-400',
        privacy: 'bg-blue-950/60 text-blue-400',
        dispute: 'bg-indigo-950/60 text-indigo-400',
        penalty: 'bg-rose-950/60 text-rose-400',
        other: 'bg-slate-800 text-slate-400',
    }

    return (
        <div className={`border rounded-xl overflow-hidden transition-all duration-200 ${clause.risk_level === 'HIGH' ? 'border-red-800/60' :
            clause.risk_level === 'MEDIUM' ? 'border-amber-800/60' :
                clause.risk_level === 'LOW' ? 'border-yellow-800/60' :
                    'border-slate-700/60'
            }`}>
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-800/60 transition-colors text-left"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <StatusBadge level={clause.risk_level} />
                    <span className="text-sm font-medium text-slate-200 truncate">{clause.clause_title}</span>
                    <span className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[clause.clause_type] || typeColors.other}`}>
                        {clause.clause_type}
                    </span>
                </div>
                {open ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
            </button>
            {open && (
                <div className="border-t border-slate-800 p-4 space-y-4 fade-in-up">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Original Text</p>
                        <p className="text-sm text-slate-400 bg-slate-900/60 rounded-lg p-3 leading-relaxed">{clause.clause_text}</p>
                    </div>
                    {clause.plain_english && (
                        <div>
                            <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1">Plain English</p>
                            <p className="text-sm text-blue-300 bg-blue-950/30 border border-blue-800/40 rounded-lg p-3 leading-relaxed">{clause.plain_english}</p>
                        </div>
                    )}
                    {clause.recommended_action && (
                        <div>
                            <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wide mb-1">Recommended Action</p>
                            <p className="text-sm text-emerald-300 bg-emerald-950/30 border border-emerald-800/40 rounded-lg p-3 leading-relaxed">{clause.recommended_action}</p>
                        </div>
                    )}
                    {clause.risk_reason && (
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Risk Reason</p>
                            <p className="text-sm text-slate-400">{clause.risk_reason}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default function LegalAnalyzer() {
    const { legalState, setLegalState } = useAppContext()
    const { files, analysis, riskFilter, step } = legalState
    const setFiles = (f) => setLegalState(s => ({ ...s, files: typeof f === 'function' ? f(s.files) : f }))
    const setAnalysis = (a) => setLegalState(s => ({ ...s, analysis: typeof a === 'function' ? a(s.analysis) : a }))
    const setRiskFilter = (r) => setLegalState(s => ({ ...s, riskFilter: typeof r === 'function' ? r(s.riskFilter) : r }))
    const setStep = (st) => setLegalState(s => ({ ...s, step: typeof st === 'function' ? st(s.step) : st }))
    const [resetKey, setResetKey] = useState(0)

    const handleReset = () => {
        setLegalState(s => ({ ...s, analysis: null, files: [] }))
        setResetKey(prev => prev + 1)
    }


    const DEMO = {
        status: 'complete', overall_risk_score: 72,
        summary_text: 'This agreement contains several high-risk clauses that significantly favor the lessor. The liability indemnification is broad and one-sided, and the automatic renewal clause may bind you without notice. Review all HIGH-risk items with a legal professional before signing.',
        red_flags: ['Broad indemnification clause favors landlord heavily', 'Automatic 12-month renewal with only 30 days notice', 'Tenant responsible for all repairs including structural'],
        missing_protections: ['No habitability warranty', 'No security deposit cap', 'No dispute resolution procedure'],
        clauses: [
            { id: 1, clause_title: 'Indemnification', clause_text: 'Tenant shall indemnify and hold harmless Landlord from any and all claims, damages, losses...', clause_type: 'liability', risk_level: 'HIGH', plain_english: 'You are responsible for protecting the landlord from any legal claims, even those not caused by your actions.', recommended_action: 'Negotiate to limit indemnification to damages caused solely by tenant negligence.', risk_reason: 'Extremely broad, one-sided indemnification creates unlimited personal financial exposure.' },
            { id: 2, clause_title: 'Automatic Renewal', clause_text: 'This lease shall automatically renew for successive one-year terms unless written notice is given 30 days prior...', clause_type: 'termination', risk_level: 'MEDIUM', plain_english: 'Your lease renews automatically every year. You must give 30 days notice or get locked in for another year.', recommended_action: 'Set a calendar reminder 60 days before lease end. Negotiate for 60-day notice period.', risk_reason: 'Short notice period for major financial commitment.' },
            { id: 3, clause_title: 'Repair Responsibility', clause_text: 'Tenant shall maintain premises in good condition and bear cost of all repairs...', clause_type: 'other', risk_level: 'HIGH', plain_english: 'You must pay for all repairs, including structural issues that are normally the landlord\'s responsibility.', recommended_action: 'Negotiate to limit tenant repairs to damage caused by tenant misuse only.', risk_reason: 'Structural repairs should be landlord\'s responsibility by law.' },
            { id: 4, clause_title: 'Rent Payment Terms', clause_text: 'Rent is due on the 1st of each month. Late fee of $50 applies after the 5th.', clause_type: 'payment', risk_level: 'LOW', plain_english: 'Pay rent by the 1st of each month. A $50 late fee applies if paid after the 5th.', recommended_action: 'No action needed — standard and reasonable terms.', risk_reason: 'Standard payment terms with reasonable grace period.' },
        ],
    }

    const analyzeMutation = useMutation({
        mutationFn: async () => {
            setStep(0)
            const form = new FormData()
            form.append('file', files[0])
            const uploadRes = await client.post('/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
            const docId = uploadRes.data.document_id
            setStep(1)
            const analyzeRes = await client.post(`/legal/analyze/${docId}`)
            setStep(2)
            const fullRes = await client.get(`/legal/analysis/${docId}`)
            setStep(3)
            return fullRes.data
        },
        onSuccess: (data) => {
            setAnalysis(data)
            toast.success('Analysis complete!')
        },
        onError: (err) => {
            toast.error(err.response?.data?.detail || err.message || 'Analysis failed')
        }
    })

    const filtered = analysis
        ? (riskFilter === 'ALL' ? analysis.clauses : analysis.clauses.filter(c => c.risk_level === riskFilter))
        : []

    const totalClauses = analysis?.clauses.length || 0
    const chartData = analysis
        ? ['HIGH', 'MEDIUM', 'LOW'].map(l => {
            const count = analysis.clauses.filter(c => c.risk_level === l).length
            return {
                name: l,
                count: count,
                percentage: totalClauses > 0 ? Math.round((count / totalClauses) * 100) : 0,
                fill: l === 'HIGH' ? '#ef4444' : l === 'MEDIUM' ? '#f59e0b' : '#eab308',
            }
        })
        : []

    if (analyzeMutation.isPending) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-16">
                <LoadingSpinner
                    message="Analyzing your document..."
                    subMessage="Claude AI is extracting and classifying all clauses in parallel"
                    steps={LEGAL_STEPS}
                    currentStep={step}
                />
            </div>
        )
    }

    if (!analysis) {
        return (
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 fade-in-up">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center shadow-lg">
                        <Scale className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">Legal Analyzer</h1>
                        <p className="text-slate-400 text-sm">Upload a contract or lease PDF for AI risk analysis</p>
                    </div>
                </div>

                <div className="glass-card space-y-6">
                    <FileUpload key={resetKey} onFiles={setFiles} multiple={false} />
                    <div className="flex gap-3">
                        <button
                            id="analyze-btn"
                            onClick={() => analyzeMutation.mutate()}
                            disabled={!files || files.length === 0 || analyzeMutation.isPending}
                            className="btn-primary flex-1"
                        >
                            Analyze Document
                        </button>
                        <button
                            id="demo-btn"
                            onClick={() => setAnalysis(DEMO)}
                            className="btn-secondary"
                        >
                            Load Demo
                        </button>
                    </div>
                    {analyzeMutation.isError && (
                        <div className="flex items-center gap-2 p-3 bg-red-950/60 border border-red-800/60 rounded-xl text-red-300 text-sm">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            {analyzeMutation.error?.message}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <ErrorBoundary>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8 fade-in-up">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Scale className="w-6 h-6 text-red-400" />
                        <h1 className="text-xl font-bold text-slate-100">Legal Analysis Results</h1>
                    </div>
                    <button onClick={handleReset} className="btn-secondary text-sm py-2">
                        ← Analyze Another
                    </button>
                </div>

                {/* Section A: Risk Dashboard */}
                <div className="glass-card">
                    <h2 className="section-header flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-red-400" /> Risk Dashboard</h2>
                    <div className="grid md:grid-cols-2 gap-8 items-start">
                        <div className="flex flex-col items-center">
                            <RiskGauge score={analysis.overall_risk_score} />
                            <p className="text-slate-400 text-sm mt-3 text-center max-w-xs">{analysis.summary_text?.split('\n')[0]}</p>
                        </div>
                        <div className="space-y-4">
                            <div className="h-60 relative bg-gradient-to-br from-slate-900/90 to-slate-950 border border-slate-700/50 rounded-2xl p-5 shadow-xl">
                                <div className="absolute top-4 left-5 flex items-center gap-2.5">
                                    <div className="w-2 h-2 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(139,92,246,0.8)] animate-pulse" />
                                    <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Risk Distribution</p>
                                </div>
                                <div className="mt-8 h-[80%]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -25 }}>
                                            <defs>
                                                <linearGradient id="colorHIGH" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9} />
                                                    <stop offset="95%" stopColor="#991b1b" stopOpacity={0.9} />
                                                </linearGradient>
                                                <linearGradient id="colorMEDIUM" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9} />
                                                    <stop offset="95%" stopColor="#b45309" stopOpacity={0.9} />
                                                </linearGradient>
                                                <linearGradient id="colorLOW" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.9} />
                                                    <stop offset="95%" stopColor="#a16207" stopOpacity={0.9} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                                            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} dy={8} />
                                            <YAxis tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} allowDecimals={false} dx={-5} />
                                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#cbd5e1', opacity: 0.05 }} />
                                            <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48} className="hover:filter hover:brightness-125 transition-all duration-300 cursor-pointer">
                                                {chartData.map((d, i) => <Cell key={i} fill={`url(#color${d.name})`} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            {/* Red flags */}
                            {analysis.red_flags?.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" /> Top Red Flags
                                    </p>
                                    <ul className="space-y-1">
                                        {analysis.red_flags.map((flag, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                                <span className="text-red-400 mt-0.5">•</span>{flag}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {/* Missing protections */}
                            {analysis.missing_protections?.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                                        <TrendingDown className="w-3 h-3" /> Missing Protections
                                    </p>
                                    <ul className="space-y-1">
                                        {analysis.missing_protections.map((p, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                                <span className="text-amber-400 mt-0.5">○</span>{p}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Section B: Clause Explorer */}
                <div className="glass-card">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                        <h2 className="section-header flex items-center gap-2 mb-0"><Filter className="w-5 h-5 text-slate-400" /> Clause Explorer</h2>
                        <div className="flex gap-2 flex-wrap">
                            {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(level => (
                                <button
                                    key={level}
                                    onClick={() => setRiskFilter(level)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${riskFilter === level
                                        ? 'bg-brand-600 border-brand-500 text-white'
                                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                                        }`}
                                >
                                    {level} {level !== 'ALL' && `(${analysis.clauses.filter(c => c.risk_level === level).length})`}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-3">
                        {filtered.length === 0
                            ? <p className="text-slate-500 text-center py-8">No clauses match this filter.</p>
                            : filtered.map(c => <ClauseCard key={c.id} clause={c} />)
                        }
                    </div>
                </div>

                {/* Section C: Document Summary */}
                {analysis.summary_text && (
                    <div className="glass-card">
                        <h2 className="section-header flex items-center gap-2"><CheckCircle className="w-5 h-5 text-emerald-400" /> Document Summary</h2>
                        <div className="text-slate-300 leading-relaxed space-y-4">
                            {analysis.summary_text.split('\n\n').map((para, i) => (
                                <p key={i}>{para}</p>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </ErrorBoundary>
    )
}
