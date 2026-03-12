export default function LoadingSpinner({ message = 'Processing...', subMessage = null, steps = null, currentStep = 0 }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 gap-6">
            {/* Spinner rings */}
            <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-500 animate-spin" />
                <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-purple-500 animate-spin" style={{ animationDuration: '0.75s', animationDirection: 'reverse' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-brand-400 animate-pulse" />
                </div>
            </div>

            {/* Message */}
            <div className="text-center space-y-2">
                <p className="text-slate-200 font-semibold text-lg">{message}</p>
                {subMessage && <p className="text-slate-400 text-sm max-w-sm text-center">{subMessage}</p>}
            </div>

            {/* Step tracker  */}
            {steps && steps.length > 0 && (
                <div className="w-full max-w-sm space-y-2">
                    {steps.map((step, i) => (
                        <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-300 ${i < currentStep
                                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                                : i === currentStep
                                    ? 'bg-brand-950/60 border-brand-700/60 text-brand-300'
                                    : 'bg-slate-900/40 border-slate-800/40 text-slate-500'
                            }`}>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i < currentStep ? 'bg-emerald-500 text-white' : i === currentStep ? 'bg-brand-500 text-white' : 'bg-slate-700 text-slate-400'
                                }`}>
                                {i < currentStep ? '✓' : i + 1}
                            </div>
                            <span className="text-sm font-medium">{step}</span>
                            {i === currentStep && (
                                <div className="ml-auto flex gap-1">
                                    {[0, 1, 2].map(d => (
                                        <div key={d} className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
