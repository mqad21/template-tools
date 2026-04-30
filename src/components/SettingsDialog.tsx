import React, { useState, useEffect } from 'react'
import { Key, Settings, X, Save, Check } from 'lucide-react'
import { useStore } from '../store/useStore'
import { cn } from '../lib/utils'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose }) => {
  const { 
    bearerToken, 
    setGlobalSettings 
  } = useStore()

  const [token, setToken] = useState(bearerToken)
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setToken(bearerToken)
      setIsSaved(false)
    }
  }, [isOpen, bearerToken])

  if (!isOpen) return null

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setGlobalSettings(token)
    setIsSaved(true)
    setTimeout(() => {
      setIsSaved(false)
      onClose()
    }, 1000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-card border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
      >
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Global Settings</h2>
              <p className="text-xs text-muted-foreground leading-none mt-1">Configure global application settings</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Key className="w-3 h-3" />
                Global Bearer Token
              </label>
              <textarea
                placeholder="Paste your bearer token here..."
                className="w-full px-4 py-2.5 min-h-[150px] bg-background border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
              <p className="text-[9px] text-muted-foreground">
                This token is used for all templates. Keep it secure and update it when it expires.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className={cn(
                "w-full px-4 py-3 text-sm font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2",
                isSaved 
                  ? "bg-green-500 text-white shadow-green-500/20" 
                  : "bg-primary text-primary-foreground shadow-primary/20 hover:opacity-90"
              )}
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  Token Saved
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Global Token
                </>
              )}
            </button>
          </div>
        </form>

        <div className="p-4 bg-muted/30 border-t text-center">
          <p className="text-[9px] text-muted-foreground leading-tight italic">
            Note: All template data is still stored locally in your browser and keyed by their respective IDs.
          </p>
        </div>
      </div>
    </div>
  )
}

