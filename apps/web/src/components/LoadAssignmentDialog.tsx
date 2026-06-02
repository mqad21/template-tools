import React, { useState } from 'react'
import { Database, X, Download } from 'lucide-react'
import { useStore } from '../store/useStore'
import { cn } from '../lib/utils'

interface LoadAssignmentDialogProps {
  isOpen: boolean
  onClose: () => void
}

export const LoadAssignmentDialog: React.FC<LoadAssignmentDialogProps> = ({ isOpen, onClose }) => {
  const [assignmentId, setAssignmentId] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const { fetchAssignmentData } = useStore()

  if (!isOpen) return null

  const handleLoad = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assignmentId.trim()) return

    setStatus('loading')
    try {
      await fetchAssignmentData(assignmentId.trim())
      setStatus('success')
      setTimeout(() => {
        setStatus('idle')
        setAssignmentId('')
        onClose()
      }, 1000)
    } catch (e: any) {
      setStatus('error')
      setErrorMsg(e.message || 'Failed to load assignment')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-card border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Load Assignment Data</h2>
              <p className="text-xs text-muted-foreground leading-none mt-1">Fetch preset and response data</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleLoad} className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Assignment ID
            </label>
            <input
              type="text"
              placeholder="e.g. 47a2de0f-becd-4c15-bcf0-1b42274db4e8"
              className="w-full px-4 py-3 bg-background border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              value={assignmentId}
              onChange={(e) => setAssignmentId(e.target.value)}
              autoFocus
            />
          </div>

          {status === 'error' && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={status === 'loading' || !assignmentId.trim()}
              className={cn(
                "w-full px-4 py-3 text-sm font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2",
                status === 'success' 
                  ? "bg-green-500 text-white shadow-green-500/20" 
                  : "bg-primary text-primary-foreground shadow-primary/20 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {status === 'loading' ? (
                'Loading...'
              ) : status === 'success' ? (
                'Data Loaded Successfully!'
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Load Data
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
