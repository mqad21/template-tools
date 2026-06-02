import React, { useState, useRef, useEffect } from 'react'
import { Layout, ChevronDown, Plus, Trash2, Check, ExternalLink } from 'lucide-react'
import { useStore } from '../store/useStore'
import { cn } from '../lib/utils'

export const TemplateSwitcher: React.FC = () => {
  const { 
    currentTemplateId, 
    availableTemplateIds, 
    switchTemplate, 
    addTemplate, 
    deleteTemplate,
    template
  } = useStore()

  const [isOpen, setIsOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [newId, setNewId] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setIsAdding(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (newId.trim()) {
      addTemplate(newId.trim())
      switchTemplate(newId.trim())
      setNewId('')
      setIsAdding(false)
      setIsOpen(false)
    }
  }

  const getTemplateTitle = (id: string) => {
    try {
      const raw = localStorage.getItem(`fasih_template_${id}`)
      if (raw) {
        const parsed = JSON.parse(raw)
        return parsed?.title || `ID: ${id}`
      }
    } catch (e) {}
    return `ID: ${id}`
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-card hover:bg-muted transition-all text-xs font-bold",
          isOpen && "ring-2 ring-primary/20 border-primary"
        )}
      >
        <Layout className="w-4 h-4 text-primary" />
        <span className="max-w-[120px] truncate">
          {template?.title || (currentTemplateId ? `ID: ${currentTemplateId.substring(0, 8)}...` : 'Select Template')}
        </span>
        <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-card border rounded-xl shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 slide-in-from-top-2 duration-200">
          <div className="p-3 border-b bg-muted/30">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Local Templates</h3>
          </div>

          <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
            {availableTemplateIds.length === 0 ? (
              <div className="py-8 text-center px-4">
                <p className="text-[10px] text-muted-foreground">No local templates yet.</p>
              </div>
            ) : (
              availableTemplateIds.map(id => (
                <div
                  key={id}
                  className={cn(
                    "group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors",
                    currentTemplateId === id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  )}
                  onClick={() => {
                    switchTemplate(id)
                    setIsOpen(false)
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-7 h-7 rounded-md flex items-center justify-center shrink-0",
                      currentTemplateId === id ? "bg-primary text-white" : "bg-muted"
                    )}>
                      {currentTemplateId === id ? <Check className="w-3.5 h-3.5" /> : <Layout className="w-3.5 h-3.5 text-muted-foreground" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold truncate">{getTemplateTitle(id)}</p>
                      {currentTemplateId === id && <p className="text-[8px] opacity-70">Active Now</p>}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm('Delete this template from localStorage?')) {
                        deleteTemplate(id)
                      }
                    }}
                    className="p-1.5 opacity-0 group-hover:opacity-100 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white rounded-md transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="p-2 border-t bg-muted/20">
            {isAdding ? (
              <form onSubmit={handleAdd} className="space-y-2 animate-in slide-in-from-bottom-2 duration-200">
                <input
                  autoFocus
                  type="text"
                  placeholder="Paste Template ID..."
                  className="w-full px-3 py-2 bg-background border rounded-lg text-[10px] font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  value={newId}
                  onChange={(e) => setNewId(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 px-2 py-1.5 text-[9px] font-bold border rounded-md hover:bg-background"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newId.trim()}
                    className="flex-[2] px-2 py-1.5 text-[9px] font-bold bg-primary text-white rounded-md hover:opacity-90 disabled:opacity-50"
                  >
                    Add & Switch
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setIsAdding(true)}
                className="w-full flex items-center justify-center gap-2 py-2 text-[10px] font-bold text-primary hover:bg-primary/5 rounded-lg border border-dashed border-primary/30 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Template by ID
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
