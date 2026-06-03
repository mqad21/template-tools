import React, { useState, useEffect } from 'react'
import { Key, Settings, X, Save, Check, Globe, Shield } from 'lucide-react'
import { useStore } from '../store/useStore'
import { loginWithSSO } from '../lib/oauth'
import { cn } from '../lib/utils'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose }) => {
  const { 
    bearerToken, 
    useProxy,
    setGlobalSettings,
    setUseProxy
  } = useStore()

  const [token, setToken] = useState(bearerToken)
  const [localUseProxy, setLocalUseProxy] = useState(useProxy)
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setToken(bearerToken)
      setLocalUseProxy(useProxy)
      setIsSaved(false)
    }
  }, [isOpen, bearerToken, useProxy])

  if (!isOpen) return null

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setGlobalSettings(token)
    setUseProxy(localUseProxy)
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
              <h2 className="text-lg font-bold">Studio Settings</h2>
              <p className="text-xs text-muted-foreground leading-none mt-1">Configure sync and editor preferences</p>
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
          <div className="space-y-6">
            {/* Bearer Token */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Key className="w-3 h-3" />
                  Global Bearer Token
                </span>
                <button
                  type="button"
                  onClick={loginWithSSO}
                  className="px-2 py-1 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded text-[10px] transition-colors"
                >
                  Login SSO Pegawai
                </button>
              </label>
              <textarea
                placeholder="Paste your bearer token here or click Login SSO Pegawai..."
                className="w-full px-4 py-2.5 min-h-[120px] bg-background border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </div>

            {/* Proxy Toggle */}
            <div className="p-4 bg-muted/20 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold">API Proxy</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLocalUseProxy(!localUseProxy)}
                  className={cn(
                    "relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    localUseProxy ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
                      localUseProxy ? "translate-x-5" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {localUseProxy 
                  ? "Bypass CORS using Vercel's server. Use this for public APIs."
                  : "Fetch directly from your browser. Necessary for VPN/Internal APIs (Requires a CORS-bypass extension)."
                }
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
                  Settings Saved
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </form>

        <div className="p-4 bg-muted/30 border-t text-center space-y-1">
          <p className="text-[9px] text-muted-foreground leading-tight italic">
            Note: All template data is still stored locally in your browser.
          </p>
          {!localUseProxy && (
            <p className="text-[9px] text-primary font-bold animate-pulse">
              ⚠️ Direct mode requires a CORS-bypass browser extension.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
