import { useCallback, useState } from 'react'
import { Upload, X, FileText, AlertCircle } from 'lucide-react'

export default function FileUpload({ onFiles, accept = '.pdf', multiple = false, maxFiles = 1 }) {
    const [dragging, setDragging] = useState(false)
    const [files, setFiles] = useState([])
    const [error, setError] = useState(null)

    const processFiles = useCallback((incoming) => {
        setError(null)
        const pdfs = Array.from(incoming).filter(f => f.name.toLowerCase().endsWith('.pdf'))
        if (pdfs.length === 0) {
            setError('Please upload PDF files only.')
            return
        }
        if (!multiple) {
            const selected = [pdfs[0]]
            setFiles(selected)
            onFiles(selected)
            return
        }
        const merged = [...files, ...pdfs].slice(0, maxFiles)
        if (incoming.length + files.length > maxFiles) {
            setError(`Maximum ${maxFiles} files allowed.`)
        }
        setFiles(merged)
        onFiles(merged)
    }, [files, multiple, maxFiles, onFiles])

    const removeFile = (index) => {
        const updated = files.filter((_, i) => i !== index)
        setFiles(updated)
        onFiles(updated)
        setError(null)
    }

    const formatSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / 1048576).toFixed(1)} MB`
    }

    return (
        <div className="space-y-4">
            {/* Drop zone */}
            <div
                onDragEnter={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); setDragging(false); processFiles(e.dataTransfer.files) }}
                onClick={() => document.getElementById('file-input').click()}
                className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 group
          ${dragging
                        ? 'border-brand-400 bg-brand-950/60 scale-[1.01]'
                        : 'border-slate-600 hover:border-brand-500 hover:bg-slate-800/60 bg-slate-900/40'
                    }`}
            >
                <input
                    id="file-input"
                    type="file"
                    accept={accept}
                    multiple={multiple}
                    className="hidden"
                    onChange={(e) => processFiles(e.target.files)}
                />
                <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all duration-300
          ${dragging ? 'bg-brand-600 shadow-lg shadow-brand-900/60' : 'bg-slate-800 group-hover:bg-brand-900/60'}`}>
                    <Upload className={`w-7 h-7 transition-colors duration-300 ${dragging ? 'text-white' : 'text-slate-400 group-hover:text-brand-400'}`} />
                </div>
                <p className="text-slate-300 font-medium mb-1">
                    {dragging ? 'Release to upload' : 'Drag & drop PDFs here'}
                </p>
                <p className="text-slate-500 text-sm">
                    or <span className="text-brand-400 font-medium">click to browse</span>
                    {multiple && ` · up to ${maxFiles} files`}
                </p>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-950/60 border border-red-800/60 rounded-xl text-red-300 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* File list */}
            {files.length > 0 && (
                <ul className="space-y-2">
                    {files.map((file, i) => (
                        <li key={i} className="flex items-center gap-3 px-4 py-3 bg-slate-800/60 border border-slate-700/60 rounded-xl">
                            <div className="w-9 h-9 rounded-lg bg-brand-950/60 border border-brand-800/60 flex items-center justify-center flex-shrink-0">
                                <FileText className="w-4 h-4 text-brand-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-200 truncate">{file.name}</p>
                                <p className="text-xs text-slate-500">{formatSize(file.size)}</p>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                                className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
