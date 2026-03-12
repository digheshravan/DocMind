import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 p-8">
                    <div className="w-16 h-16 rounded-2xl bg-red-950/60 border border-red-800/60 flex items-center justify-center">
                        <AlertTriangle className="w-8 h-8 text-red-400" />
                    </div>
                    <div className="text-center max-w-md">
                        <h2 className="text-xl font-bold text-slate-100 mb-2">Something went wrong</h2>
                        <p className="text-slate-400 text-sm mb-6">{this.state.error?.message || 'An unexpected error occurred.'}</p>
                        <button
                            className="btn-primary"
                            onClick={() => this.setState({ hasError: false, error: null })}
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            )
        }
        return this.props.children
    }
}
