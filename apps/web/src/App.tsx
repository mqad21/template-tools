import React, { useEffect, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { PropertyEditor } from './components/PropertyEditor'
import { FormPreview } from './components/FormPreview'
import { useStore } from './store/useStore'
import { Activity, RefreshCw, Settings, AlertCircle, CheckCircle2, Loader2, Database, Layout, X, FileJson, ShieldCheck, ClipboardList, Code, Cpu, GitCompare, Fingerprint } from 'lucide-react'
import { SettingsDialog } from './components/SettingsDialog'
import { TemplateSwitcher } from './components/TemplateSwitcher'
import { EngineManagerDialog } from './components/EngineManagerDialog'
import { CompareDialog } from './components/CompareDialog'
import { LoadAssignmentDialog } from './components/LoadAssignmentDialog'
import { cn } from './lib/utils'
import { handleSSOCallback } from './lib/oauth'

function App() {
  const { 
    loadCurrentTemplate, 
    template, 
    syncFromServer, 
    bearerToken, 
    currentTemplateId, 
    isLoading,
    previewWidth,
    setPreviewWidth,
    previewMode,
    selectedDataKey,
    sidebarMode,
    isPrincipalsEditorOpen,
    setSelectedDataKey
  } = useStore()
  const [sidebarWidth, setSidebarWidth] = useState(320)
  const isResizingSidebar = React.useRef(false)
  const isResizingPreview = React.useRef(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isEngineManagerOpen, setIsEngineManagerOpen] = useState(false)
  const [isCompareOpen, setIsCompareOpen] = useState(false)
  const [isLoadAssignmentOpen, setIsLoadAssignmentOpen] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [syncError, setSyncError] = useState('')

  const isExtension = typeof window !== 'undefined' && 
    (window.location.protocol === 'chrome-extension:' || !!(window as any).chrome?.runtime?.id);


  // Preload Engine Resources & init stored versions
  useEffect(() => {
    // Check for SSO callback
    handleSSOCallback().then((success) => {
      if (success) {
        console.log('[SSO] Successfully logged in via SSO');
      }
    });

    // Initialize stored versions list from IndexedDB
    useStore.getState().refreshStoredVersions()
  }, []);

  useEffect(() => {
    loadCurrentTemplate()
    
    // Listen for sync messages from extension
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'FFS_SYNC') {
        const { templateId, template, validation, token } = event.data;
        console.log('[FFS] Received sync data from extension:', templateId);
        
        const STORAGE_KEYS = {
          CURRENT_ID: 'fasih_current_template_id',
          ID_LIST: 'fasih_template_ids',
          TOKEN: 'fasih_bearer_token',
          TEMPLATE: (id: string) => `fasih_template_${id}`,
          VALIDATION: (id: string) => `fasih_validation_${id}`,
        };

        localStorage.setItem(STORAGE_KEYS.CURRENT_ID, templateId);
        localStorage.setItem(STORAGE_KEYS.TEMPLATE(templateId), JSON.stringify(template));
        localStorage.setItem(STORAGE_KEYS.VALIDATION(templateId), JSON.stringify(validation));
        
        if (token) {
          localStorage.setItem(STORAGE_KEYS.TOKEN, token);
          useStore.getState().setGlobalSettings(token);
          console.log('[FFS] Bearer token synced & saved:', token.substring(0, 15) + '...');
        } else {
          console.warn('[FFS] No token received in sync message!');
        }
        
        const idList = JSON.parse(localStorage.getItem(STORAGE_KEYS.ID_LIST) || '[]');
        if (!idList.includes(templateId)) {
          idList.push(templateId);
          localStorage.setItem(STORAGE_KEYS.ID_LIST, JSON.stringify(idList));
        }

        // Reload to apply
        window.location.reload();
      }
    }

    window.addEventListener('message', handleMessage)
    
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar.current) {
        setSidebarWidth(Math.max(200, Math.min(600, e.clientX)))
      }
      if (isResizingPreview.current) {
        const maxWidth = previewMode === 'desktop' ? window.innerWidth - 400 : 800
        const minWidth = previewMode === 'desktop' ? 800 : 300
        setPreviewWidth(Math.max(minWidth, Math.min(maxWidth, window.innerWidth - e.clientX)))
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
      window.removeEventListener('message', handleMessage)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const handleSync = async () => {
    // Check if token exists in localStorage as fallback
    let currentToken = bearerToken;
    if (!currentToken) {
      currentToken = localStorage.getItem('fasih_bearer_token') || '';
      if (currentToken) {
        useStore.getState().setGlobalSettings(currentToken);
      }
    }

    if (!currentToken || !currentTemplateId) {
      console.warn('[FFS] Sync failed: Missing token or template ID', { hasToken: !!currentToken, templateId: currentTemplateId });
      setSyncStatus('error')
      setSyncError(isExtension ? 'Extension Sync Failed. Try reloading.' : 'Check Settings.')
      
      // HARAM BUKA MODAL KALAU DI EKSTENSI
      if (!isExtension) {
        setIsSettingsOpen(true)
      }
      
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
            
            {!isExtension && (
              <>

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
                  {syncStatus === 'loading' ? 'Syncing...' : 'Sync Template'}
                </button>

                <button 
                  onClick={() => setIsLoadAssignmentOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-lg transition-all font-bold text-xs"
                  title="Load Data from Assignment ID"
                >
                  <Database className="w-4 h-4" />
                  Load Assignment
                </button>

                <button 
                  onClick={() => setIsCompareOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-lg transition-all font-bold text-xs"
                  title="Compare Templates"
                >
                  <GitCompare className="w-4 h-4" />
                  Compare
                </button>

                <button 
                  onClick={() => setIsEngineManagerOpen(true)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                  title="Engine Version Manager"
                >
                  <Cpu className="w-5 h-5" />
                </button>

                <button 
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </>
            )}
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

              {!isExtension && (
                <button 
                  onClick={() => setIsSettingsOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Configure Sync Settings
                </button>
              )}
            </div>
          </div>
        </main>
      ) : (
        <main className="flex-1 flex overflow-hidden relative">
          <div style={{ width: sidebarWidth }} className="shrink-0">
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

          <div className="flex-1 h-full relative overflow-auto custom-scrollbar">
            <FormPreview />
          </div>
        </main>
      )}

      {/* Property Editor Modal */}
      {(selectedDataKey || (sidebarMode !== 'components' && (sidebarMode !== 'principals' || isPrincipalsEditorOpen))) && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-background/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className={cn(
              "bg-card border shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-right-4 duration-300",
              sidebarMode === 'components' ? "w-full max-w-2xl h-full rounded-l-3xl" : "w-full h-full"
            )}
          >
            <div className="flex items-center justify-between p-4 border-b bg-muted/20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  {sidebarMode === 'components' ? <Layout className="w-4 h-4" /> : <Code className="w-4 h-4" />}
                </div>
                <h2 className="font-bold text-sm uppercase tracking-wider">
                  {sidebarMode === 'components' ? 'Component Editor' : `${sidebarMode} JSON Editor`}
                </h2>
              </div>
              <div className="flex items-center gap-4">
                {sidebarMode !== 'components' && (
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest hidden sm:block">
                    Full Template Mode
                  </div>
                )}
                <button 
                  onClick={() => {
                    setSelectedDataKey(null)
                    if (sidebarMode === 'principals') {
                      useStore.getState().setIsPrincipalsEditorOpen(false)
                    } else {
                      useStore.getState().setSidebarMode('components')
                    }
                  }}
                  className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-full transition-all text-muted-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
              <PropertyEditor />
            </div>
          </div>
        </div>
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

      {/* Floating Action Button for Sync */}
      {template && (
        <button
          onClick={handleSync}
          disabled={syncStatus === 'loading'}
          className={cn(
            "fixed bottom-10 right-6 w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90 group z-50",
            syncStatus === 'loading' ? "bg-primary/20 cursor-wait" : "bg-primary hover:bg-primary/90 text-primary-foreground"
          )}
          title="Sync from Server"
        >
          <RefreshCw className={cn("w-6 h-6", syncStatus === 'loading' && "animate-spin")} />
          
          {/* Tooltip-ish label on hover */}
          <span className="absolute right-full mr-3 px-2 py-1 bg-zinc-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-zinc-800">
            SYNC FROM SERVER
          </span>
        </button>
      )}

      <SettingsDialog 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <EngineManagerDialog
        isOpen={isEngineManagerOpen}
        onClose={() => setIsEngineManagerOpen(false)}
      />

      <CompareDialog
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
      />

      <LoadAssignmentDialog
        isOpen={isLoadAssignmentOpen}
        onClose={() => setIsLoadAssignmentOpen(false)}
      />
    </div>
  )
}

export default App
