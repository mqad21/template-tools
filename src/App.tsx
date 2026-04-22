import React, { useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { PropertyEditor } from './components/PropertyEditor'
import { FormPreview } from './components/FormPreview'
import { useStore } from './store/useStore'
import { Activity, RefreshCw } from 'lucide-react'
import { SyncDialog } from './components/SyncDialog'

function App() {
  const { loadSamples, template } = useStore()
  const [sidebarWidth, setSidebarWidth] = React.useState(320)
  const [previewWidth, setPreviewWidth] = React.useState(450)
  const isResizingSidebar = React.useRef(false)
  const isResizingPreview = React.useRef(false)
  const [isSyncOpen, setIsSyncOpen] = React.useState(false)

  useEffect(() => {
    loadSamples()
    
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

  if (!template) {
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
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
            <div className="flex flex-col items-end">
              <span>Template v{template.version}</span>
              <span className="text-[10px] opacity-70">Fasih Monorepo v2.0</span>
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="flex flex-col items-start translate-y-[-1px]">
              <span className="text-primary font-bold">READY</span>
              <span className="text-[10px] opacity-70 italic">Local Workspace</span>
            </div>
          </div>

          <button 
            onClick={() => setIsSyncOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-lg transition-all font-bold text-xs"
          >
            <RefreshCw className="w-4 h-4" />
            Sync from Server
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden relative">
        <div style={{ width: sidebarWidth }}>
          <Sidebar />
        </div>
        
        {/* Sidebar Resizer */}
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

        {/* Preview Resizer */}
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

      {/* Footer Status Bar */}
      <footer className="h-6 border-t bg-muted/50 px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            Live Sync Active
          </div>
          <div className="text-[10px] text-muted-foreground">|</div>
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {template.title || 'Sensus Ekonomi 2026'}
          </div>
        </div>
        <div className="text-[10px] font-medium text-muted-foreground">
          © 2024 Badan Pusat Statistik
        </div>
      </footer>

      <SyncDialog 
        isOpen={isSyncOpen}
        onClose={() => setIsSyncOpen(false)}
      />
    </div>
  )
}

export default App
