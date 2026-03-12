
import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { BookOpen, AlertTriangle, Send, MessageSquare, X, ChevronDown, Brain } from 'lucide-react'
import FileUpload from '../components/FileUpload'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBoundary from '../components/ErrorBoundary'
import client from '../api/client'
import { useAppContext } from '../context/AppContext'

const RESEARCH_STEPS = ['Uploading PDFs', 'Chunking & embedding into ChromaDB', 'Extracting paper metadata', 'Generating literature review', 'Detecting contradictions', 'Mapping research gaps']

const DEMO = {
    session_id: 'demo-session',
    review: {
        review_text: '## Introduction\nThis literature review synthesizes findings from five papers on transformer-based NLP models.\n\n## Methodology\nThe reviewed papers employ a mix of supervised fine-tuning, few-shot prompting, and RLHF to align large language models with human preferences.\n\n## Findings\nKey findings include that larger models do not always generalize better on domain-specific tasks, and that data quality often outweighs quantity in fine-tuning scenarios.\n\n## Conclusion\nFuture research should focus on efficient adaptation techniques and robust evaluation benchmarks for specialized domains.',
        key_themes: ['Transformer architecture', 'Few-shot learning', 'RLHF alignment', 'Evaluation benchmarks'],
    },
    contradictions: [
        { id: 1, title: 'Model Size vs Specialization', description: 'Paper A argues larger models generalize better. Paper B shows that a 7B fine-tuned model outperforms GPT-4 on domain tasks.', paper_a_id: 1, paper_b_id: 2, severity: 'HIGH' },
        { id: 2, title: 'Data Quantity vs Quality', description: 'Paper C advocates for massive pre-training datasets, while Paper D demonstrates higher performance with curated, high-quality corpora 10x smaller.', paper_a_id: 3, paper_b_id: 4, severity: 'MEDIUM' },
    ],
    gaps: [
        { id: 1, title: 'Cross-lingual Transfer Evaluation', description: 'No paper evaluates how fine-tuning on English-only data impacts performance on low-resource languages.', suggested_approach: 'Benchmark fine-tuned models on multilingual test sets including languages not in training data.' },
        { id: 2, title: 'Catastrophic Forgetting in RLHF', description: 'The long-term impact of RLHF on the model\'s general capabilities is understudied.', suggested_approach: 'Longitudinal study measuring core benchmarks pre- and post-RLHF alignment.' },
        { id: 3, title: 'Compute Efficiency Tradeoffs', description: 'No systematic comparison of compute costs versus performance gains for different adaptation strategies.', suggested_approach: 'Pareto-frontier analysis of cost vs accuracy across LoRA, full fine-tuning, and prompting.' },
        { id: 4, title: 'Robustness to Distribution Shift', description: 'Evaluation sets closely mirror training distribution; real-world deployment performance is unknown.', suggested_approach: 'Adversarial test sets constructed to maximize distribution gap from training data.' },
    ],
    papers: [
        { id: 1, filename: 'scaling_laws.pdf', title: 'Scaling Laws for Neural Language Models', authors: 'Kaplan et al.', abstract: 'Study of how model performance scales with compute, data, and parameters.', page_count: 21 },
        { id: 2, filename: 'llama_finetuning.pdf', title: 'Efficient Fine-Tuning of Large Language Models', authors: 'Hu et al.', abstract: 'Low-rank adaptation (LoRA) enables efficient fine-tuning with minimal parameter updates.', page_count: 14 },
    ],
}

// GAP type colors
const GAP_COLORS = {
    methodological: 'border-purple-700/60 bg-purple-950/40',
    empirical: 'border-blue-700/60 bg-blue-950/40',
    theoretical: 'border-indigo-700/60 bg-indigo-950/40',
    applied: 'border-teal-700/60 bg-teal-950/40',
}

// RAG Chat panel (Sidebar version)
function ChatPanel({ sessionId }) {
    const { researchState, setResearchState } = useAppContext()
    const { chatQuestion: question, chatMessages: messages, isChatExpanded: isExpanded } = researchState
    const setQuestion = (q) => setResearchState(s => ({ ...s, chatQuestion: typeof q === 'function' ? q(s.chatQuestion) : q }))
    const setMessages = (m) => setResearchState(s => ({ ...s, chatMessages: typeof m === 'function' ? m(s.chatMessages) : m }))
    const setIsExpanded = (e) => setResearchState(s => ({ ...s, isChatExpanded: typeof e === 'function' ? e(s.isChatExpanded) : e }))

    const bottomRef = useRef(null)

    const queryMutation = useMutation({
        mutationFn: async (q) => {
            if (sessionId === 'demo-session') {
                return { answer: `Based on Papers #3, #7, and #12, the primary gap lies in energy-efficient inference for edge devices...`, citations: [] }
            }
            const res = await client.post(`/research/query/${sessionId}`, { question: q })
            return res.data
        },
        onSuccess: (data) => {
            const timeInfo = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            setMessages(m => [...m, { role: 'assistant', content: data.answer, citations: data.citations, time: timeInfo }])
        },
    })

    const send = () => {
        if (!question.trim()) return
        const timeInfo = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        setMessages(m => [...m, { role: 'user', content: question, time: timeInfo }])
        queryMutation.mutate(question)
        setQuestion('')
    }

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

    return (
        <div className={`relative overflow-hidden flex-shrink-0 bg-[#0f111a] border-r border-slate-800/60 flex flex-col h-full transition-[width] duration-300 ease-in-out ${isExpanded ? 'w-[380px]' : 'w-20'}`}>

            {/* Minimized View Header */}
            <div className={`absolute inset-x-0 top-0 flex flex-col items-center py-6 gap-4 transition-opacity duration-300 ${isExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100 delay-150'}`}>
                <button onClick={() => setIsExpanded(true)} className="p-3 rounded-xl bg-brand-900/40 text-brand-400 hover:bg-brand-800/50 transition-colors" title="Expand Chat">
                    <MessageSquare className="w-6 h-6" />
                </button>
            </div>

            {/* Expanded Content Wrapper (Fixed Width to prevent squishing during animation) */}
            <div className={`absolute top-0 left-0 w-[380px] flex flex-col h-full transition-opacity duration-300 ${isExpanded ? 'opacity-100 delay-150' : 'opacity-0 pointer-events-none invisible'}`}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/60">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#a78bfa]/20 border border-[#a78bfa]/30 flex items-center justify-center shadow-inner">
                            <MessageSquare className="w-4 h-4 text-[#a78bfa]" />
                        </div>
                        <span className="font-bold text-slate-100 text-lg tracking-wide">RAG Chat</span>
                    </div>
                    <button onClick={() => setIsExpanded(false)} className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-md hover:bg-slate-800/60">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Active Session Status */}
                <div className="px-6 py-3 flex items-center justify-between border-b border-slate-800/60 bg-slate-900/30">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                        <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Active Session</span>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                    {messages.map((m, i) => (
                        <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${m.role === 'user'
                                ? 'bg-[#8b5cf6] text-white rounded-br-sm shadow-md'
                                : 'bg-slate-800/80 text-slate-200 rounded-bl-sm shadow-sm'
                                }`}>
                                {m.content}
                                {m.citations?.length > 0 && (
                                    <div className="mt-3 space-y-1.5 border-t border-slate-700/50 pt-2">
                                        {m.citations.map((c, ci) => (
                                            <span key={ci} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/80 border border-slate-700/50 rounded-md text-xs text-brand-300 mr-1.5">
                                                [{c.paper}{c.page ? `, p.${c.page}` : ''}]
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <span className="text-[10px] text-slate-500 mt-1.5 px-1 font-medium">
                                {m.role === 'assistant' ? 'AI' : 'You'} · {m.time}
                            </span>
                        </div>
                    ))}
                    {queryMutation.isPending && (
                        <div className="flex flex-col items-start">
                            <div className="bg-slate-800/80 rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm">
                                <div className="flex gap-1.5">
                                    {[0, 1, 2].map(d => <div key={d} className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />)}
                                </div>
                            </div>
                            <span className="text-[10px] text-slate-500 mt-1.5 px-1 font-medium">AI · Typings...</span>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-slate-800/60 bg-[#0f111a]">
                    <div className="relative flex items-center bg-slate-800/60 rounded-xl border border-slate-700/50 focus-within:border-brand-500/50 focus-within:ring-1 focus-within:ring-brand-500/50 transition-all shadow-inner">
                        <input
                            type="text"
                            value={question}
                            onChange={e => setQuestion(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && send()}
                            placeholder="Ask about the papers..."
                            className="w-full bg-transparent border-none text-slate-200 text-sm py-3.5 pl-4 pr-12 focus:outline-none placeholder-slate-500"
                        />
                        <button
                            onClick={send}
                            disabled={!question.trim() || queryMutation.isPending}
                            className="absolute right-1.5 p-2 bg-[#a78bfa] hover:bg-[#8b5cf6] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function ResearchSynth() {
    const { researchState, setResearchState } = useAppContext()
    const { files, topic, result, step, isChatExpanded } = researchState
    const setFiles = (f) => setResearchState(s => ({ ...s, files: typeof f === 'function' ? f(s.files) : f }))
    const setTopic = (t) => setResearchState(s => ({ ...s, topic: typeof t === 'function' ? t(s.topic) : t }))
    const setResult = (r) => setResearchState(s => ({ ...s, result: typeof r === 'function' ? r(s.result) : r }))
    const setStep = (st) => setResearchState(s => ({ ...s, step: typeof st === 'function' ? st(s.step) : st }))
    const setIsChatExpanded = (e) => setResearchState(s => ({ ...s, isChatExpanded: typeof e === 'function' ? e(s.isChatExpanded) : e }))
    const [resetKey, setResetKey] = useState(0)

    const handleReset = () => {
        setResearchState(s => ({
            ...s,
            result: null,
            files: [],
            topic: '',
            step: 0,
            chatMessages: [{ role: 'assistant', content: "I've analyzed the papers. How can I help you navigate the synthesis today?", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }],
            chatQuestion: ''
        }))
        setResetKey(prev => prev + 1)
    }


    const synthMutation = useMutation({
        mutationFn: async () => {
            setStep(0)
            const form = new FormData()
            files.forEach(f => form.append('files', f))
            if (topic) form.append('topic_description', topic)
            const uploadRes = await client.post('/research/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
            const sessionId = uploadRes.data.session_id
            setStep(1)
            await client.post(`/research/synthesize/${sessionId}`)
            setStep(2)
            const [reviewRes, contRes, gapRes, sessionRes] = await Promise.all([
                client.get(`/research/review/${sessionId}`),
                client.get(`/research/contradictions/${sessionId}`),
                client.get(`/research/gaps/${sessionId}`),
                client.get(`/research/session/${sessionId}`),
            ])
            setStep(5)
            return {
                session_id: sessionId,
                review: reviewRes.data,
                contradictions: contRes.data.contradictions,
                gaps: gapRes.data.gaps,
                papers: sessionRes.data.papers,
            }
        },
        onSuccess: (d) => {
            setResult(d)
            toast.success('Research synthesis complete!')
        },
        onError: (err) => {
            toast.error(err.response?.data?.detail || err.message || 'Synthesis failed')
        }
    })

    if (synthMutation.isPending) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-16">
                <LoadingSpinner
                    message="Synthesizing your research..."
                    subMessage="This takes 1–3 minutes depending on the number of papers"
                    steps={RESEARCH_STEPS}
                    currentStep={step}
                />
            </div>
        )
    }

    if (!result) {
        return (
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 fade-in-up">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-600 to-purple-700 flex items-center justify-center shadow-lg">
                        <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100">Research Synthesizer</h1>
                        <p className="text-slate-400 text-sm">Upload 1–15 academic PDFs to generate a literature review</p>
                    </div>
                </div>
                <div className="glass-card space-y-6">
                    <FileUpload key={resetKey} onFiles={setFiles} multiple={true} maxFiles={15} />
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Research Topic <span className="text-slate-500">(optional context for AI)</span></label>
                        <textarea
                            value={topic}
                            onChange={e => setTopic(e.target.value)}
                            placeholder="e.g., Transformer-based NLP models for domain-specific tasks"
                            className="input-field resize-none h-24 text-sm"
                        />
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => synthMutation.mutate()} disabled={files.length === 0} className="btn-primary flex-1">
                            Synthesize Research ({files.length} paper{files.length !== 1 ? 's' : ''})
                        </button>
                        <button onClick={() => setResult(DEMO)} className="btn-secondary">Load Demo</button>
                    </div>
                    {synthMutation.isError && (
                        <div className="flex items-center gap-2 p-3 bg-red-950/60 border border-red-800/60 rounded-xl text-red-300 text-sm">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            {synthMutation.error?.message}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <ErrorBoundary>
            <div className={`h-[calc(100vh-4rem)] flex overflow-hidden relative ${result ? 'bg-[#0b0c10]' : ''}`}>
                {/* Section E: RAG Chat Sidebar (Left) */}
                {result && (
                    <ChatPanel sessionId={result.session_id} />
                )}

                {/* Main Content Area (Right) */}
                <div className="flex-1 overflow-y-auto w-full">
                    <div className={`max-w-5xl mx-auto px-6 py-10 space-y-8 pb-32 fade-in-up ${!result && 'max-w-2xl mt-12 px-4 shadow-none bg-transparent'}`}>
                        {/* Header */}
                        {result && (
                            <div className="flex items-center justify-between border-b border-slate-800/60 pb-6 mb-8 pt-2">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Research Synthesis Results</h1>
                                        <span className="px-3 py-1 bg-[#2e1d5e] text-[#a78bfa] text-xs font-bold rounded-full border border-[#4c2d96]/50">
                                            {result.papers?.length || 0} Papers
                                        </span>
                                    </div>
                                    <p className="text-slate-400 text-sm">Compiled analysis from your latest document set</p>
                                </div>
                                <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 font-medium text-sm rounded-xl border border-slate-700/50 transition-colors">
                                    ← New Synthesis
                                </button>
                            </div>
                        )}

                        {/* Section A: Literature Review */}
                        <div className="glass-card">
                            <h2 className="section-header">📄 Literature Review</h2>
                            {result.review?.key_themes?.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {result.review.key_themes.map((t, i) => (
                                        <span key={i} className="px-3 py-1 bg-brand-950/60 border border-brand-700/40 rounded-full text-brand-300 text-xs font-medium">{t}</span>
                                    ))}
                                </div>
                            )}
                            <div className="prose prose-invert prose-sm max-w-none">
                                {(result.review?.review_text || '').split('\n\n').map((para, i) => (
                                    para.startsWith('##')
                                        ? <h3 key={i} className="text-slate-200 font-bold text-base mt-4 mb-2">{para.replace(/^##\s*/, '')}</h3>
                                        : <p key={i} className="text-slate-300 leading-relaxed">{para}</p>
                                ))}
                            </div>
                        </div>

                        {/* Section B: Contradictions */}
                        {result.contradictions?.length > 0 && (
                            <div className="glass-card">
                                <h2 className="section-header">⚡ Contradictions Detected</h2>
                                <div className="grid md:grid-cols-2 gap-4">
                                    {result.contradictions.map(c => (
                                        <div key={c.id} className="border border-slate-700/60 rounded-xl overflow-hidden">
                                            <div className="p-4 bg-blue-950/30 border-b border-slate-700/60">
                                                <p className="text-xs font-semibold text-blue-400 mb-1">PAPER A CLAIMS</p>
                                                <p className="text-sm text-blue-200">{c.description?.split('Paper B')[0]?.split('Paper A')[1]?.replace(/\s*(argues|states|claims)\s*/, '') || 'See description'}</p>
                                            </div>
                                            <div className="px-4 py-2 text-center bg-slate-900">
                                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${c.severity === 'HIGH' ? 'bg-red-950/80 text-red-400' : 'bg-amber-950/80 text-amber-400'}`}>
                                                    VS — {c.severity} CONFLICT
                                                </span>
                                            </div>
                                            <div className="p-4 bg-red-950/20 border-t border-slate-700/60">
                                                <p className="text-xs font-semibold text-red-400 mb-1">PAPER B CLAIMS</p>
                                                <p className="text-sm text-red-200">{c.description}</p>
                                            </div>
                                            <div className="px-4 py-2 bg-slate-900/60 border-t border-slate-700/40">
                                                <p className="text-xs text-slate-400 font-medium">{c.title}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Section C: Research Gaps */}
                        {result.gaps?.length > 0 && (
                            <div className="glass-card">
                                <h2 className="section-header">🔭 Research Gap Map</h2>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    {result.gaps.map((g, i) => (
                                        <div key={g.id} className={`border rounded-xl p-4 space-y-2 ${Object.values(GAP_COLORS)[i % 4]}`}>
                                            <h3 className="font-semibold text-slate-200 text-sm">{g.title}</h3>
                                            <p className="text-slate-400 text-sm leading-relaxed">{g.description}</p>
                                            {g.suggested_approach && (
                                                <div className="pt-2 border-t border-slate-700/40">
                                                    <p className="text-xs text-emerald-400 font-semibold mb-1">Suggested Approach</p>
                                                    <p className="text-xs text-slate-400">{g.suggested_approach}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Section D: Paper Index */}
                        {result && result.papers?.length > 0 && (
                            <div>
                                <div className="flex items-center gap-3 mb-4 mt-12">
                                    <BookOpen className="w-5 h-5 text-purple-400" />
                                    <h2 className="text-xl font-bold text-slate-200">Paper Index</h2>
                                </div>
                                <div className="grid gap-3">
                                    {result.papers.map(p => (
                                        <div key={p.id} className="group flex items-center justify-between p-4 bg-slate-900/40 hover:bg-slate-800/40 border border-slate-800/60 hover:border-slate-700/60 rounded-xl transition-all cursor-pointer">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-lg ${p.id % 2 === 0 ? 'bg-[#4c2d96]/30 text-[#a78bfa]' : 'bg-[#0f3d32]/30 text-[#10b981]'} border border-slate-700/30 flex items-center justify-center flex-shrink-0 text-lg font-bold shadow-inner`}>
                                                    {(p.authors || p.filename).substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-200 text-sm group-hover:text-brand-300 transition-colors">{p.title || p.filename}</p>
                                                    {p.authors && <p className="text-xs text-slate-500 mt-1">{p.authors}</p>}
                                                </div>
                                            </div>
                                            <div className="text-right flex items-center gap-6">
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="text-xs font-medium text-slate-400">{p.page_count} Pages</span>
                                                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">PDF Analyzed</span>
                                                </div>
                                                <ChevronDown className="w-5 h-5 text-slate-600 -rotate-90 group-hover:text-slate-400 transition-colors" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    )
}
