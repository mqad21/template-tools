import React, { useState, useEffect } from 'react'
import { Key, Link, Loader2, RefreshCw, X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { cn } from '../lib/utils'

interface SyncDialogProps {
  isOpen: boolean
  onClose: () => void
}

const STORAGE_KEYS = {
  TOKEN: 'fasih_sync_token',
  TEMPLATE_ID: 'fasih_sync_template_id'
}

export const SyncDialog: React.FC<SyncDialogProps> = ({ isOpen, onClose }) => {
  const { template, syncFromServer } = useStore()
  const [token, setToken] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  // Load from localStorage on mount or when dialog opens
  useEffect(() => {
    if (isOpen) {
      const savedToken = localStorage.getItem(STORAGE_KEYS.TOKEN) || ''
      const savedTemplateId = localStorage.getItem(STORAGE_KEYS.TEMPLATE_ID) || template?.id || ''
      setToken(savedToken)
      setTemplateId(savedTemplateId)
    }
  }, [isOpen, template?.id])

  if (!isOpen) return null

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !templateId) return

    setStatus('loading')
    setErrorMessage('')

    try {
      await syncFromServer(token, templateId)
      
      // Save to localStorage on success
      localStorage.setItem(STORAGE_KEYS.TOKEN, token)
      localStorage.setItem(STORAGE_KEYS.TEMPLATE_ID, templateId)
      
      setStatus('success')
      setTimeout(() => {
        onClose()
        setStatus('idle')
      }, 1500)
    } catch (error: any) {
      setStatus('error')
      setErrorMessage(error.message || 'Sync failed. Please check your token and template ID.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-card border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
      >
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <RefreshCw className={cn("w-5 h-5", status === 'loading' && "animate-spin")} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Sync from Server</h2>
              <p className="text-xs text-muted-foreground leading-none mt-1">Fasih Designer API Integration</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSync} className="p-6 space-y-5">
          {status === 'error' && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs animate-in shake-x duration-500">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 text-green-600 rounded-lg text-xs animate-in zoom-in-95 duration-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <p>Sync successful! Local files updated.</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Key className="w-3 h-3" />
              Bearer Token
            </label>
            <textarea
              placeholder="Paste your bearer token here..."
              className="w-full px-4 py-2.5 min-h-[100px] bg-background border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Link className="w-3 h-3" />
              Template ID
            </label>
            <input
              type="text"
              placeholder="Enter Template UUID..."
              className="w-full px-4 py-2.5 bg-background border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              required
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-bold border rounded-xl hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={status === 'loading' || !token || !templateId}
              className={cn(
                "flex-[2] px-4 py-2.5 text-sm font-bold bg-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2",
                status === 'loading' && "animate-pulse"
              )}
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Synchronizing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Sync Now
                </>
              )}
            </button>
          </div>
        </form>

        <div className="p-4 bg-muted/30 border-t">
          <p className="text-[9px] text-muted-foreground text-center">
            Warning: This will overwrite your local <code className="bg-muted px-1 rounded">template.json</code> and <code className="bg-muted px-1 rounded">validation.json</code>. A backup will be created in the <code className="bg-muted px-1 rounded">history</code> folder.
          </p>
        </div>
      </div>
    </div>
  )
}
