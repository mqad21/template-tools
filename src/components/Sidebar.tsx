import React, { useMemo, useState, useEffect } from 'react'
import { useStore, Component } from '../store/useStore'
import {
  Search, ChevronRight, ChevronDown, Layers,
  Layout, Type, CheckSquare, List, Hash,
  Calendar, Clock as ClockIcon, Image, File, MapPin,
  CheckCircle2, Radio as RadioIcon, ToggleLeft,
  Menu, FileDigit, Code2, PenLine, Star,
  Database, ClipboardList, FileJson, ShieldCheck
} from 'lucide-react'
import { cn, stripHtml } from '../lib/utils'

const TYPE_ICONS: Record<number, any> = {
  // layout
  1: Layout,        // Section
  3: Code2,         // HTML
  10: Layout,       // Group
  
  // nested
  2: Layers,        // Nested
  5: Layers,        // NestedChild
  
  // misc
  4: FileDigit,     // Variable
  18: Menu,         // RangeSlider
  33: MapPin,       // GPS
  34: File,         // CSV
  35: ClockIcon,    // Now
  36: PenLine,      // Signature
  37: Menu,         // Unit
  
  // text input
  19: Type,         // URL
  20: Type,         // Currency
  24: Type,         // Masking
  25: Type,         // Text
  30: Type,         // TextArea
  31: Type,         // Email
  
  // number input
  28: Hash,         // Number
  38: Hash,         // Decimal
  
  // options - single options
  26: RadioIcon,    // Radio
  27: List,         // Select
  40: Star,         // Rating
  
  // options - multi options
  21: List,         // ListTextInputRepeat
  23: List,         // MultiSelect
  22: List,         // ListSelectInputRepeat
  29: CheckSquare,  // Checkbox
  
  // boolean
  16: CheckCircle2, // SingleCheck
  17: ToggleLeft,   // Switch
  
  // file
  32: Image,        // Photo
  39: File,         // File
  
  // time
  11: Calendar,     // Date
  12: Calendar,     // DateTime
  13: ClockIcon,    // Time
  14: Calendar,     // Month
  15: Calendar,     // Week
};

const ComponentTreeItem = React.memo(({ 
  comp, 
  depth = 0
}: { 
  comp: Component, 
  depth?: number
}) => {
  const isSelected = useStore(state => state.selectedDataKey === comp.dataKey)
  const selectedDataKey = useStore(state => state.selectedDataKey)
  const setSelectedDataKey = useStore(state => state.setSelectedDataKey)
  const itemRef = React.useRef<HTMLButtonElement>(null)
  
  const hasChildren = useMemo(() => {
    return Array.isArray(comp.components) && comp.components.length > 0;
  }, [comp.components]);
  
  const cleanLabel = useMemo(() => stripHtml(comp.label || 'No Label'), [comp.label])
  const isSection = comp.type === 1 || comp.type === 10 || comp.type === 2 || comp.type === 5

  const [isOpen, setIsOpen] = useState(depth < 1)
  
  // Logic to detect if this container contains the selected component
  const containsSelected = useMemo(() => {
    if (!selectedDataKey) return false
    if (isSelected) return false // We only care if children are selected
    
    const checkMatch = (c: Component): boolean => {
      if (Array.isArray(c.components)) {
        return c.components.some(group => {
          const comps = Array.isArray(group) ? group : [group];
          return comps.some(child => child && (child.dataKey === selectedDataKey || checkMatch(child)));
        })
      }
      return false
    }
    return checkMatch(comp)
  }, [comp, selectedDataKey, isSelected])

  // Auto-expand if selected OR contains selected child
  useEffect(() => {
    if (isSelected || containsSelected) {
      setIsOpen(true)
    }
  }, [isSelected, containsSelected])

  // Smooth scroll into view when selected
  useEffect(() => {
    if (isSelected && itemRef.current) {
      itemRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest' 
      })
    }
  }, [isSelected])

  const Icon = TYPE_ICONS[comp.type] || Layers;

  return (
    <div className="flex flex-col">
      <button
        ref={itemRef}
        onClick={() => {
          setSelectedDataKey(comp.dataKey)
          if (hasChildren) setIsOpen(!isOpen)
        }}
        onDoubleClick={() => {
          if (hasChildren) setIsOpen(!isOpen)
        }}
        className={cn(
          "group flex items-center gap-2 px-2 py-1.5 transition-all outline-none w-full relative",
          isSelected 
            ? "bg-primary/10 text-primary border-l-2 border-primary rounded-r-md" 
            : "hover:bg-muted/60 text-muted-foreground hover:text-foreground rounded-sm",
          isSection && depth === 0 && !isSelected ? "text-primary font-bold bg-primary/[0.03] mt-2 mb-1" : "",
          isSelected && "animate-in fade-in zoom-in-95 duration-300"
        )}
        style={{ paddingLeft: `${(depth * 16) + 12}px` }}
      >
        {/* Selection Indicator Glow */}
        {isSelected && (
          <div className="absolute inset-0 bg-primary/5 pointer-events-none rounded-r-md animate-pulse" />
        )}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-4 h-4 flex items-center justify-center shrink-0">
            {hasChildren ? (
              <div 
                className={cn(
                  "p-0.5 rounded-sm hover:bg-muted-foreground/20 transition-colors",
                  isOpen ? "text-primary" : "text-muted-foreground"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(!isOpen);
                }}
              >
                {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </div>
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20" />
            )}
          </div>
          
          <Icon className={cn(
            "shrink-0 transition-colors", 
            isSection ? "w-4 h-4" : "w-3.5 h-3.5",
            isSelected ? "text-primary" : (hasChildren ? "text-primary/70" : "text-muted-foreground/60")
          )} />
          
          <div className="flex flex-col min-w-0 flex-1 text-left">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={cn(
                "truncate leading-tight",
                isSection ? "text-[11px] uppercase tracking-wide font-bold" : "text-[11px] font-medium",
                isSelected ? "text-primary" : (hasChildren ? "text-foreground" : "text-muted-foreground")
              )}>
                {cleanLabel}
              </span>
              {comp.type === 2 && (
                <span className="text-[8px] bg-primary/10 text-primary px-1 rounded-sm font-bold shrink-0">NESTED</span>
              )}
            </div>
            <span className={cn(
              "text-[9px] font-mono truncate leading-none mt-0.5 opacity-60",
              isSelected ? "text-primary/80" : ""
            )}>
              {comp.dataKey}
            </span>
          </div>
        </div>
      </button>

      {hasChildren && isOpen && (
        <div className="flex flex-col relative">
          {/* Vertical Hierarchy Line */}
          <div 
            className="absolute left-0 top-0 bottom-0 w-px bg-border/40 group-hover:bg-primary/20 transition-colors" 
            style={{ left: `${(depth * 16) + 20}px`, zIndex: 1 }} 
          />
          
          <div className="flex flex-col">
            {Array.isArray(comp.components) && comp.components.map((group: any, gIdx: number) => {
              if (!group) return null;
              // Handle both [comp, comp] and [[comp, comp], [comp]]
              const components = Array.isArray(group) ? group : [group];
              return (
                <React.Fragment key={gIdx}>
                  {components.map((child, cIdx) => (
                    child && (
                      <ComponentTreeItem 
                        key={child.dataKey || `${gIdx}-${cIdx}`} 
                        comp={child} 
                        depth={depth + 1} 
                      />
                    )
                  ))}
                </React.Fragment>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
})

export const Sidebar = () => {
  const { 
    template, 
    preset, 
    response, 
    sidebarMode, 
    setSidebarMode, 
    selectedDataKey, 
    setSelectedDataKey,
    componentMap
  } = useStore()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 200)
    return () => clearTimeout(timer)
  }, [searchTerm])
  const searchRef = React.useRef<HTMLDivElement>(null)

  const dataList = useMemo(() => {
    if (sidebarMode === 'presets') return preset?.predata || []
    if (sidebarMode === 'responses') return response?.answers || []
    return []
  }, [sidebarMode, preset, response])

  const filteredData = useMemo(() => {
    const lowerSearch = debouncedSearchTerm.toLowerCase()
    if (!lowerSearch) return dataList
    return dataList.filter((item: any) => 
      item.dataKey.toLowerCase().includes(lowerSearch)
    )
  }, [dataList, debouncedSearchTerm])

  const searchResults = useMemo(() => {
    if (sidebarMode !== 'components' || debouncedSearchTerm.length < 2) return []
    const lowerSearch = debouncedSearchTerm.toLowerCase()
    return Object.values(componentMap)
      .filter(c => 
        (c.label && c.label.toLowerCase().includes(lowerSearch)) || 
        (c.dataKey && c.dataKey.toLowerCase().includes(lowerSearch))
      )
      .slice(0, 50)
  }, [debouncedSearchTerm, componentMap, sidebarMode])

  // Handle click outside to close search results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchTerm('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle ESC key to clear search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchTerm('')
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])


  if (!template) return null

  return (
    <div className="w-full border-r bg-card flex flex-col h-full shrink-0">
      {/* Tab Switcher */}
      <div className="flex border-b bg-muted/30">
        {[
          { id: 'components', icon: Layers, label: 'Tree' },
          { id: 'template', icon: FileJson, label: 'Template' },
          { id: 'validation', icon: ShieldCheck, label: 'Validation' },
          { id: 'presets', icon: Database, label: 'Presets' },
          { id: 'responses', icon: ClipboardList, label: 'Response' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSidebarMode(tab.id as any)}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-3 text-[9px] font-black uppercase tracking-widest transition-all border-b-2",
              sidebarMode === tab.id 
                ? "bg-background text-primary border-primary shadow-[inset_0_-2px_0_0_rgba(var(--primary),1)]" 
                : "text-muted-foreground/60 border-transparent hover:text-muted-foreground hover:bg-muted/50"
            )}
          >
            <tab.icon className={cn("w-4 h-4", sidebarMode === tab.id ? "animate-in zoom-in duration-300" : "")} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4 border-b space-y-4">
        <div ref={searchRef} className="relative group/search">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={sidebarMode === 'components' ? "Search components..." : "Search data keys..."}
            className="w-full pl-9 pr-3 py-2 text-xs bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground text-[10px] font-bold"
            >
              ESC
            </button>
          )}

          {/* Search Results Dropdown (only for components mode) */}
          {sidebarMode === 'components' && searchTerm.length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-md shadow-xl z-50 max-h-[400px] overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2 duration-200">
              <div className="p-1">
                {searchResults.length === 0 && debouncedSearchTerm === searchTerm ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">No components found</div>
                ) : searchResults.map((result) => (
                    <button
                      key={result.dataKey}
                      className="w-full flex flex-col items-start px-3 py-2 hover:bg-primary/5 rounded-sm transition-colors text-left border-b border-border/20 last:border-0 group/item"
                      onClick={() => {
                        setSelectedDataKey(result.dataKey)
                        setSearchTerm('')
                      }}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <div className="w-4 h-4 rounded-sm bg-muted flex items-center justify-center shrink-0">
                          {React.createElement(TYPE_ICONS[result.type] || Layers, { className: "w-3 h-3 text-muted-foreground group-hover/item:text-primary transition-colors" })}
                        </div>
                        <span className="text-xs font-semibold text-foreground truncate flex-1">
                          {stripHtml(result.label || 'No Label')}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground pl-6 truncate w-full">
                        {result.dataKey}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-2 space-y-px">
          {sidebarMode === 'components' ? (
            Array.isArray(template.components) && template.components.map((group, idx) => {
              const components = Array.isArray(group) ? group : [group];
              return (
                <div key={idx} className={cn("space-y-px", idx > 0 && "mt-4 pt-4 border-t border-dashed")}>
                  {components.map((comp, cIdx) => (
                    comp && (
                      <ComponentTreeItem
                        key={comp.dataKey || `${idx}-${cIdx}`}
                        comp={comp}
                      />
                    )
                  ))}
                </div>
              )
            })
          ) : (
            <div className="p-2 space-y-4">
              <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl space-y-2">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground mb-4">
                  {sidebarMode === 'template' ? <FileJson className="w-6 h-6" /> : sidebarMode === 'validation' ? <ShieldCheck className="w-6 h-6" /> : sidebarMode === 'presets' ? <Database className="w-6 h-6" /> : <ClipboardList className="w-6 h-6" />}
                </div>
                <h3 className="text-sm font-bold capitalize">{sidebarMode} Editor</h3>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {sidebarMode === 'template' 
                    ? "You are now editing the entire template structure. Be careful with the JSON syntax."
                    : sidebarMode === 'validation'
                    ? "You are now editing the validation rules. This is where you define logical tests and error messages."
                    : `You are now in full JSON editing mode. The middle panel shows the complete ${sidebarMode.slice(0,-1)} structure.`
                  }
                </p>
                <div className="pt-2">
                  <div className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1.5">
                    <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
                    Live Editor Active
                  </div>
                </div>
              </div>

              {/* Quick Jump / Key List if they still want it? User said "Cukup sediain JSON editornya aja", so I will skip the list for now to keep it clean */}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
