export default function ProgressBar({ value = 0, max = 100, label, colorClass = 'bg-brand-500' }) {
    const pct = Math.min(100, Math.max(0, (value / max) * 100))

    return (
        <div className="w-full">
            {label && (
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-400">{label}</span>
                    <span className="text-sm font-semibold text-slate-200">{Math.round(pct)}%</span>
                </div>
            )}
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${colorClass}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    )
}
