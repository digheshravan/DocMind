import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { History as HistoryIcon, Scale, BookOpen, Trash2, Filter, CheckCircle } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import client from '../api/client'

const TYPE_FILTER = ['All', 'Legal', 'Research']

export default function History() {
    const [filter, setFilter] = useState('All')
    const [selectedIds, setSelectedIds] = useState([])
    const navigate = useNavigate()
    const qc = useQueryClient()

    const { data, isLoading, isError } = useQuery({
        queryKey: ['history', filter],
        queryFn: async () => {
            const params = filter === 'All' ? {} : { type: filter.toLowerCase() }
            const res = await client.get('/history', { params })
            return res.data
        },
    })

    const deleteMutation = useMutation({
        mutationFn: (id) => client.delete(`/history/${id}`),
        onSuccess: (_, deletedId) => {
            qc.invalidateQueries({ queryKey: ['history'] })
            toast.success('Record deleted')
            setSelectedIds(prev => prev.filter(id => id !== deletedId))
        },
        onError: () => toast.error('Failed to delete record'),
    })

    const records = data?.history || []

    const handleRowClick = (item) => {
        if (item.type === 'legal') navigate('/legal')
        else navigate('/research')
    }

    const toggleSelection = (e, item) => {
        e.stopPropagation()
        if (item.type !== 'legal') {
            toast.error('Comparison is only available for legal documents')
            return
        }
        setSelectedIds(prev => {
            if (prev.includes(item.id)) return prev.filter(id => id !== item.id)
            if (prev.length >= 2) {
                toast.error('You can only compare two documents at a time')
                return prev
            }
            return [...prev, item.id]
        })
    }

    const handleCompare = () => {
        if (selectedIds.length !== 2) return
        navigate(`/legal/compare?idA=${selectedIds[0]}&idB=${selectedIds[1]}`)
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return '—'
        return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    }

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-16">
                <LoadingSpinner message="Loading history..." />
            </div>
        )
    }

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 fade-in-up pb-32">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                        <HistoryIcon className="w-5 h-5 text-slate-300" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-100">Analysis History</h1>
                        <p className="text-slate-400 text-sm">{records.length} record{records.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {selectedIds.length === 2 && (
                        <button 
                            onClick={handleCompare}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold rounded-xl shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all animate-in zoom-in-95"
                        >
                            <Scale className="w-4 h-4" /> Compare Selected
                        </button>
                    )}
                    
                    {/* Filter */}
                    <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl p-1">
                        <Filter className="w-4 h-4 text-slate-400 ml-2" />
                        {TYPE_FILTER.map(t => (
                            <button
                                key={t}
                                onClick={() => {
                                    setFilter(t)
                                    setSelectedIds([])
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${filter === t ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
                                    }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {isError && (
                <div className="text-center py-16 text-slate-400">Failed to load history. Is the backend running?</div>
            )}

            {!isError && records.length === 0 && (
                <div className="text-center py-24">
                    <HistoryIcon className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-400 font-medium">No analyses yet</p>
                    <p className="text-slate-600 text-sm mt-1">Upload a PDF to get started</p>
                </div>
            )}

            {records.length > 0 && (
                <div className="glass-card p-0 overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-700/60 bg-slate-900/40">
                                <th className="px-5 py-4 w-4"></th>
                                <th className="text-left px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-8">Type</th>
                                <th className="text-left px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name / Topic</th>
                                <th className="text-left px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Date</th>
                                <th className="text-left px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Score / Papers</th>
                                <th className="text-left px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-5 py-4 w-12"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {records.map((item) => (
                                <tr
                                    key={item.id}
                                    onClick={() => handleRowClick(item)}
                                    className={`hover:bg-slate-800/40 cursor-pointer transition-colors duration-150 group ${selectedIds.includes(item.id) ? 'bg-brand-950/20' : ''}`}
                                >
                                    <td className="px-5 py-4" onClick={e => toggleSelection(e, item)}>
                                        <div className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${
                                            selectedIds.includes(item.id) 
                                                ? 'bg-brand-600 border-brand-500 text-white' 
                                                : 'border-slate-700 bg-slate-900 group-hover:border-slate-500'
                                        }`}>
                                            {selectedIds.includes(item.id) && <CheckCircle className="w-3.5 h-3.5" />}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.type === 'legal' ? 'bg-red-950/60' : 'bg-brand-950/60'}`}>
                                            {item.type === 'legal'
                                                ? <Scale className="w-4 h-4 text-red-400" />
                                                : <BookOpen className="w-4 h-4 text-brand-400" />
                                            }
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <p className="text-sm font-medium text-slate-200 truncate max-w-xs group-hover:text-white transition-colors">{item.name}</p>
                                        <p className="text-xs text-slate-500 capitalize">{item.type} Analysis</p>
                                    </td>
                                    <td className="px-5 py-4 hidden sm:table-cell text-sm text-slate-400">{formatDate(item.date)}</td>
                                    <td className="px-5 py-4 hidden md:table-cell">
                                        {item.type === 'legal' && item.score != null
                                            ? <span className={`text-sm font-semibold ${item.score > 70 ? 'text-red-400' : item.score > 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                {Math.round(item.score)}/100
                                            </span>
                                            : item.paper_count != null
                                                ? <span className="text-sm text-slate-400">{item.paper_count} papers</span>
                                                : <span className="text-slate-600">—</span>
                                        }
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${item.status === 'complete' ? 'bg-emerald-950/60 text-emerald-400'
                                            : item.status === 'error' ? 'bg-red-950/60 text-red-400'
                                                : 'bg-amber-950/60 text-amber-400'
                                            }`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                                        <button
                                            onClick={() => deleteMutation.mutate(item.id)}
                                            disabled={deleteMutation.isPending}
                                            className="p-2 hover:bg-red-950/60 hover:text-red-400 text-slate-600 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
