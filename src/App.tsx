import React, { useEffect, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { PropertyEditor } from './components/PropertyEditor'
import { FormPreview } from './components/FormPreview'
import { useStore } from './store/useStore'
import { Activity, RefreshCw, Settings, AlertCircle, CheckCircle2, Loader2, Database, Layout } from 'lucide-react'
import { SettingsDialog } from './components/SettingsDialog'
import { TemplateSwitcher } from './components/TemplateSwitcher'
import { cn } from './lib/utils'

function App() {
  const { loadCurrentTemplate, template, syncFromServer, bearerToken, currentTemplateId, isLoading } = useStore()
  const [sidebarWidth, setSidebarWidth] = useState(320)
  const [previewWidth, setPreviewWidth] = useState(450)
  const isResizingSidebar = React.useRef(false)
  const isResizingPreview = React.useRef(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [syncError, setSyncError] = useState('')

  useEffect(() => {
    loadCurrentTemplate()
    
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar.current) {
        setSidebarWidth(Math.max(200, Math.min(600, e.clientX)))
      }
      if (isResizingPreview.current) {
        setPreviewWidth(Math.max(300, Math.min(800, window.innerWidth - e.clientX)))
      }
    }

    const handleMouseUp = () => {
      isResizingSidebar.current = false
      isResizingPreview.current = false
      document.body.style.cursor = 'default'
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const handleSync = async () => {
    if (!bearerToken || !currentTemplateId) {
      setSyncStatus('error')
      setSyncError('Check Settings.')
      setIsSettingsOpen(true)
      setTimeout(() => setSyncStatus('idle'), 3000)
      return
    }

    setSyncStatus('loading')
    setSyncError('')

    try {
      await syncFromServer()
      setSyncStatus('success')
      setTimeout(() => setSyncStatus('idle'), 2000)
    } catch (error: any) {
      setSyncStatus('error')
      setSyncError(error.message || 'Sync failed')
      setTimeout(() => setSyncStatus('idle'), 3000)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <Activity className="absolute inset-0 m-auto w-5 h-5 text-primary animate-pulse" />
          </div>
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            Booting Fasih Editor...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden selection:bg-primary/20 select-none">
      {/* Top Navigation Bar */}
      <header className="h-14 border-b flex items-center justify-between px-6 bg-card shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">Fasih Form <span className="text-primary">Studio</span></h1>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest leading-none">Template & Logic Editor</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {syncStatus !== 'idle' && (
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold animate-in fade-in slide-in-from-right-4 duration-300",
              syncStatus === 'loading' && "bg-primary/10 text-primary",
              syncStatus === 'success' && "bg-green-500/10 text-green-600",
              syncStatus === 'error' && "bg-destructive/10 text-destructive"
            )}>
              {syncStatus === 'loading' ? <Loader2 className="w-3 h-3 animate-spin" /> : 
               syncStatus === 'success' ? <CheckCircle2 className="w-3 h-3" /> : 
               <AlertCircle className="w-3 h-3" />}
              <span className="max-w-[150px] truncate">
                {syncStatus === 'loading' ? 'Syncing...' : syncStatus === 'success' ? 'Sync OK' : syncError}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <TemplateSwitcher />
            
            <button 
              onClick={handleSync}
              disabled={syncStatus === 'loading'}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-bold text-xs",
                syncStatus === 'loading' 
                  ? "bg-muted text-muted-foreground cursor-wait" 
                  : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
              )}
            >
              <RefreshCw className={cn("w-4 h-4", syncStatus === 'loading' && "animate-spin")} />
              Sync
            </button>

            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-lg transition-all"
              title="Studio Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      {!template ? (
        <main className="flex-1 flex flex-col items-center justify-center bg-muted/5 p-12">
          <div className="max-w-md w-full flex flex-col items-center text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="relative">
              <div className="w-24 h-24 bg-card border-2 border-dashed border-muted-foreground/20 rounded-[2rem] flex items-center justify-center text-muted-foreground/30">
                <Layout className="w-10 h-10" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-destructive/10 text-destructive border-2 border-background rounded-2xl flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-bold tracking-tight">Template Not Found</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We couldn't find any local data for <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground">{currentTemplateId || 'this template'}</span>. 
                Please synchronize from the BPS server to get started.
              </p>
            </div>

            <div className="flex flex-col w-full gap-3">
              <button 
                onClick={handleSync}
                disabled={syncStatus === 'loading'}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-primary text-primary-foreground rounded-2xl shadow-xl shadow-primary/20 hover:opacity-90 transition-all font-bold active:scale-[0.98] disabled:opacity-50"
              >
                {syncStatus === 'loading' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <RefreshCw className="w-5 h-5" />
                )}
                {syncStatus === 'loading' ? 'Syncing Data...' : 'Synchronize from Server'}
              </button>

              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                <Settings className="w-4 h-4" />
                Configure Sync Settings
              </button>
            </div>
          </div>
        </main>
      ) : (
        <main className="flex-1 flex overflow-hidden relative">
          <div style={{ width: sidebarWidth }}>
            <Sidebar />
          </div>
          
          <div 
            className="relative w-1 group hover:w-1.5 bg-border/20 hover:bg-primary/30 cursor-col-resize transition-all shrink-0 active:bg-primary/50"
            onMouseDown={() => {
              isResizingSidebar.current = true
              document.body.style.cursor = 'col-resize'
            }}
          >
            <div className="absolute inset-y-0 left-1/2 -ml-px w-px bg-border group-hover:bg-primary transition-colors" />
          </div>

          <PropertyEditor />

          <div 
            className="relative w-1 group hover:w-1.5 bg-border/20 hover:bg-primary/30 cursor-col-resize transition-all shrink-0 active:bg-primary/50"
            onMouseDown={() => {
              isResizingPreview.current = true
              document.body.style.cursor = 'col-resize'
            }}
          >
            <div className="absolute inset-y-0 left-1/2 -ml-px w-px bg-border group-hover:bg-primary transition-colors" />
          </div>

          <div style={{ width: previewWidth }}>
            <FormPreview />
          </div>
        </main>
      )}

      {/* Footer Status Bar */}
      <footer className="h-6 border-t bg-muted/50 px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            Browser Persistence Active
          </div>
          <div className="text-[10px] text-muted-foreground">|</div>
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {template?.title || 'No Template Loaded'}
          </div>
        </div>
        <div className="text-[10px] font-medium text-muted-foreground">
          © 2024 Badan Pusat Statistik
        </div>
      </footer>

      <SettingsDialog 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  )
}

export default App
