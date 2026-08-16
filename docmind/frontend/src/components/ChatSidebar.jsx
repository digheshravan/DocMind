import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Send, MessageSquare, X, Brain } from 'lucide-react'
import client from '../api/client'

export default function ChatSidebar({ 
    id, 
    type = 'research', 
    isExpanded, 
    setIsExpanded,
    messages,
    setMessages,
    placeholder = "Ask a question..."
}) {
    const [question, setQuestion] = useState('')
    const bottomRef = useRef(null)

    const queryMutation = useMutation({
        mutationFn: async (q) => {
            if (id === 'demo-session') {
                return { 
                    answer: "In a demo session, I provide simulated but contextually relevant answers based on pre-baked data.", 
                    citations: [] 
                }
            }
            
            const endpoint = type === 'legal' 
                ? `/legal/query/${id}` 
                : `/research/query/${id}`
            
            const res = await client.post(endpoint, { question: q })
            return res.data
        },
        onSuccess: (data) => {
            const timeInfo = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: data.answer, 
                citations: data.citations, 
                time: timeInfo 
            }])
        },
    })

    const handleSend = () => {
        if (!question.trim()) return
        const timeInfo = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        setMessages(prev => [...prev, { role: 'user', content: question, time: timeInfo }])
        queryMutation.mutate(question)
        setQuestion('')
    }

    useEffect(() => {
        if (isExpanded) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages, isExpanded])

    return (
        <div className={`relative overflow-hidden flex-shrink-0 bg-[#0f111a] border-r border-slate-800/60 flex flex-col h-full transition-[width] duration-300 ease-in-out ${isExpanded ? 'w-[380px]' : 'w-20'}`}>

            {/* Minimized View Header */}
            <div className={`absolute inset-x-0 top-0 flex flex-col items-center py-6 gap-4 transition-opacity duration-300 ${isExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100 delay-150'}`}>
                <button onClick={() => setIsExpanded(true)} className="p-3 rounded-xl bg-brand-900/40 text-brand-400 hover:bg-brand-800/50 transition-colors" title="Expand Chat">
                    <MessageSquare className="w-6 h-6" />
                </button>
            </div>

            {/* Expanded Content Wrapper */}
            <div className={`absolute top-0 left-0 w-[380px] flex flex-col h-full transition-opacity duration-300 ${isExpanded ? 'opacity-100 delay-150' : 'opacity-0 pointer-events-none invisible'}`}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/60">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center shadow-inner">
                            <MessageSquare className="w-4 h-4 text-brand-400" />
                        </div>
                        <span className="font-bold text-slate-100 text-lg tracking-wide">{type === 'legal' ? 'Legal Assistant' : 'RAG Chat'}</span>
                    </div>
                    <button onClick={() => setIsExpanded(false)} className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-md hover:bg-slate-800/60">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Active Session Status */}
                <div className="px-6 py-3 flex items-center justify-between border-b border-slate-800/60 bg-slate-900/30">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                        <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Active Analysis</span>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                    {messages.map((m, i) => (
                        <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${m.role === 'user'
                                ? 'bg-brand-600 text-white rounded-br-sm shadow-md'
                                : 'bg-slate-800/80 text-slate-200 rounded-bl-sm shadow-sm'
                                }`}>
                                {m.content}
                                {m.citations?.length > 0 && (
                                    <div className="mt-3 space-y-1.5 border-t border-slate-700/50 pt-2 text-[11px] text-slate-400">
                                        <p className="font-bold text-slate-500 uppercase text-[9px] mb-1">Sources</p>
                                        {m.citations.map((c, ci) => (
                                            <div key={ci} className="flex items-start gap-1.5 bg-slate-900/40 p-1.5 rounded border border-slate-700/30">
                                                <Brain className="w-3 h-3 text-brand-400 mt-0.5" />
                                                <span>{c.doc_id ? `Excerpt #${ci+1}` : c.paper}</span>
                                            </div>
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
                            <span className="text-[10px] text-slate-500 mt-1.5 px-1 font-medium">AI · Thinking...</span>
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
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            placeholder={placeholder}
                            className="w-full bg-transparent border-none text-slate-200 text-sm py-3.5 pl-4 pr-12 focus:outline-none placeholder-slate-500"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!question.trim() || queryMutation.isPending}
                            className="absolute right-1.5 p-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
