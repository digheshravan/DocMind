const RISK_CONFIG = {
    HIGH: { bg: 'bg-red-950/80', border: 'border-red-700/60', text: 'text-red-300', dot: 'bg-red-400' },
    MEDIUM: { bg: 'bg-amber-950/80', border: 'border-amber-700/60', text: 'text-amber-300', dot: 'bg-amber-400' },
    LOW: { bg: 'bg-yellow-950/80', border: 'border-yellow-700/60', text: 'text-yellow-300', dot: 'bg-yellow-400' },
    OK: { bg: 'bg-emerald-950/80', border: 'border-emerald-700/60', text: 'text-emerald-300', dot: 'bg-emerald-400' },
}

export default function StatusBadge({ level, size = 'sm' }) {
    const config = RISK_CONFIG[level?.toUpperCase()] || RISK_CONFIG.OK
    const sizeClass = size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-0.5 text-xs'

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${config.bg} ${config.border} ${config.text} ${sizeClass}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot} flex-shrink-0`} />
            {level?.toUpperCase() || 'OK'}
        </span>
    )
}
