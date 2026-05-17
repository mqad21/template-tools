import React, { useState, useMemo, useEffect, useRef } from 'react'
import {
  X, GitCompare, FileJson, ShieldCheck, Database, Check,
  AlertCircle, Upload, ArrowRight, Search, Info, HelpCircle,
  Settings, CheckSquare, List, Hash, Calendar, Layers, MapPin,
  File, Clock, PenLine, Radio, ToggleLeft, Star, Layout, Type
} from 'lucide-react'
import { useStore, buildComponentMap } from '../store/useStore'
import { cn, stripHtml } from '../lib/utils'

interface CompareDialogProps {
  isOpen: boolean
  onClose: () => void
}

const TYPE_ICONS: Record<number, any> = {
  1: Layout, 3: Type, 10: Layout, 2: Layers, 5: Layers,
  4: Hash, 18: List, 33: MapPin, 34: File, 35: Clock,
  36: PenLine, 37: List, 19: Type, 20: Type, 24: Type,
  25: Type, 30: Type, 31: Type, 28: Hash, 38: Hash,
  26: Radio, 27: List, 40: Star, 21: List, 23: List,
  22: List, 29: CheckSquare, 16: CheckCircleIcon, 17: ToggleLeft,
  32: File, 39: File, 11: Calendar, 12: Calendar, 13: Clock,
  14: Calendar, 15: Calendar
}

function CheckCircleIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

interface PropertyDiff {
  propertyName: string
  valA: any
  valB: any
}

interface ComponentDiff {
  dataKey: string
  labelA?: string
  labelB?: string
  typeA?: number
  typeB?: number
  diffs: PropertyDiff[]
}

export const CompareDialog: React.FC<CompareDialogProps> = ({ isOpen, onClose }) => {
  const {
    currentTemplateId,
    availableTemplateIds,
    template: activeTemplate,
    validation: activeValidation
  } = useStore()

  // Selectors for template IDs
  const [templateAId, setTemplateAId] = useState<string>(currentTemplateId || '')
  const [templateBId, setTemplateBId] = useState<string>('')
  
  // Custom uploaded files
  const [uploadedTemplateB, setUploadedTemplateB] = useState<any>(null)
  const [uploadedValidationB, setUploadedValidationB] = useState<any>(null)
  const [uploadedFileNameB, setUploadedFileNameB] = useState<string>('')

  // Selected tab: overview, keys, properties, validations
  const [activeTab, setActiveTab] = useState<'overview' | 'keys' | 'properties' | 'validations'>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPropKey, setSelectedPropKey] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const valInputRef = useRef<HTMLInputElement>(null)

  // Pre-select B to another available template if possible
  useEffect(() => {
    if (isOpen) {
      setTemplateAId(currentTemplateId || '')
      const otherId = availableTemplateIds.find(id => id !== currentTemplateId) || ''
      setTemplateBId(otherId)
      setUploadedTemplateB(null)
      setUploadedValidationB(null)
      setUploadedFileNameB('')
      setActiveTab('overview')
      setSearchQuery('')
      setSelectedPropKey(null)
    }
  }, [isOpen, currentTemplateId, availableTemplateIds])

  // Resolve Template A data
  const tplA = useMemo(() => {
    if (templateAId === currentTemplateId && activeTemplate) {
      return activeTemplate
    }
    const str = localStorage.getItem(`fasih_template_${templateAId}`)
    return str ? JSON.parse(str) : null
  }, [templateAId, activeTemplate, currentTemplateId])

  const valA = useMemo(() => {
    if (templateAId === currentTemplateId && activeValidation) {
      return activeValidation
    }
    const str = localStorage.getItem(`fasih_validation_${templateAId}`)
    return str ? JSON.parse(str) : null
  }, [templateAId, activeValidation, currentTemplateId])

  // Resolve Template B data (either uploaded or from local IDs)
  const tplB = useMemo(() => {
    if (uploadedTemplateB) return uploadedTemplateB
    if (!templateBId) return null
    const str = localStorage.getItem(`fasih_template_${templateBId}`)
    return str ? JSON.parse(str) : null
  }, [templateBId, uploadedTemplateB])

  const valB = useMemo(() => {
    if (uploadedTemplateB) return uploadedValidationB
    if (!templateBId) return null
    const str = localStorage.getItem(`fasih_validation_${templateBId}`)
    return str ? JSON.parse(str) : null
  }, [templateBId, uploadedValidationB, uploadedTemplateB])

  // Component flat maps
  const mapA = useMemo(() => tplA ? buildComponentMap(tplA.components) : {}, [tplA])
  const mapB = useMemo(() => tplB ? buildComponentMap(tplB.components) : {}, [tplB])

  // 1. Data Key Diff calculations
  const keysOnlyInA = useMemo(() => {
    return Object.keys(mapA).filter(k => !mapB[k]).sort()
  }, [mapA, mapB])

  const keysOnlyInB = useMemo(() => {
    return Object.keys(mapB).filter(k => !mapA[k]).sort()
  }, [mapA, mapB])

  const matchingKeys = useMemo(() => {
    return Object.keys(mapA).filter(k => mapB[k]).sort()
  }, [mapA, mapB])

  // 2. Property Diff calculations for matching keys
  const propertiesToCompare = [
    'label', 'type', 'expression', 'enableCondition', 'enable',
    'readonlyCondition', 'required', 'disabledInput', 'placeholder', 'options'
  ]

  const componentDiffs = useMemo(() => {
    const diffsList: ComponentDiff[] = []
    
    for (const key of matchingKeys) {
      const compA = mapA[key]
      const compB = mapB[key]
      if (!compA || !compB) continue

      const propDiffs: PropertyDiff[] = []
      for (const prop of propertiesToCompare) {
        const valA = compA[prop]
        const valB = compB[prop]

        const strA = JSON.stringify(valA)
        const strB = JSON.stringify(valB)

        if (strA !== strB) {
          propDiffs.push({
            propertyName: prop,
            valA,
            valB
          })
        }
      }

      // Also scan for any other custom keys that differ
      const allKeys = Array.from(new Set([...Object.keys(compA), ...Object.keys(compB)]))
      for (const prop of allKeys) {
        if (propertiesToCompare.includes(prop) || prop === 'components') continue
        const valA = compA[prop]
        const valB = compB[prop]
        if (JSON.stringify(valA) !== JSON.stringify(valB)) {
          propDiffs.push({
            propertyName: prop,
            valA,
            valB
          })
        }
      }

      if (propDiffs.length > 0) {
        diffsList.push({
          dataKey: key,
          labelA: compA.label,
          labelB: compB.label,
          typeA: compA.type,
          typeB: compB.type,
          diffs: propDiffs
        })
      }
    }
    
    return diffsList
  }, [matchingKeys, mapA, mapB])

  // Set first component with diffs as selected by default
  useEffect(() => {
    if (componentDiffs.length > 0 && !selectedPropKey) {
      setSelectedPropKey(componentDiffs[0].dataKey)
    }
  }, [componentDiffs, selectedPropKey])

  // 3. Validation Diff calculations
  const valMapA = useMemo(() => {
    return valA?.testFunctions ? Object.fromEntries(valA.testFunctions.map((tf: any) => [tf.dataKey, tf])) : {}
  }, [valA])

  const valMapB = useMemo(() => {
    return valB?.testFunctions ? Object.fromEntries(valB.testFunctions.map((tf: any) => [tf.dataKey, tf])) : {}
  }, [valB])

  const valKeysOnlyInA = useMemo(() => {
    return Object.keys(valMapA).filter(k => !valMapB[k]).sort()
  }, [valMapA, valMapB])

  const valKeysOnlyInB = useMemo(() => {
    return Object.keys(valMapB).filter(k => !valMapA[k]).sort()
  }, [valMapA, valMapB])

  const valMatchingKeys = useMemo(() => {
    return Object.keys(valMapA).filter(k => valMapB[k]).sort()
  }, [valMapA, valMapB])

  const validationDiffs = useMemo(() => {
    const list: { dataKey: string; diffCount: number; rulesA: any[]; rulesB: any[] }[] = []
    
    for (const key of valMatchingKeys) {
      const tfA = valMapA[key]
      const tfB = valMapB[key]
      
      const strA = JSON.stringify(tfA.validations || [])
      const strB = JSON.stringify(tfB.validations || [])
      
      if (strA !== strB) {
        list.push({
          dataKey: key,
          diffCount: Math.abs((tfA.validations || []).length - (tfB.validations || []).length) + 1, // simplified weight
          rulesA: tfA.validations || [],
          rulesB: tfB.validations || []
        })
      }
    }
    
    return list
  }, [valMatchingKeys, valMapA, valMapB])

  // Upload Template B handler
  const handleTemplateFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string)
        setUploadedTemplateB(parsed)
        setUploadedFileNameB(file.name)
        setTemplateBId('') // clear local ID
      } catch (err: any) {
        alert('Gagal membaca JSON Template B: ' + err.message)
      }
    }
    reader.readAsText(file)
  }

  // Upload Validation B handler
  const handleValidationFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string)
        setUploadedValidationB(parsed)
      } catch (err: any) {
        alert('Gagal membaca JSON Validasi B: ' + err.message)
      }
    }
    reader.readAsText(file)
  }

  const handleResetUpload = () => {
    setUploadedTemplateB(null)
    setUploadedValidationB(null)
    setUploadedFileNameB('')
    const otherId = availableTemplateIds.find(id => id !== templateAId) || ''
    setTemplateBId(otherId)
  }

  // Structural match statistics
  const totalKeysUnion = useMemo(() => {
    return Array.from(new Set([...Object.keys(mapA), ...Object.keys(mapB)])).length
  }, [mapA, mapB])

  const matchPercentage = useMemo(() => {
    if (totalKeysUnion === 0) return 0
    return Math.round((matchingKeys.length / totalKeysUnion) * 100)
  }, [matchingKeys, totalKeysUnion])

  // Filtered lists based on search query
  const filteredKeysOnlyInA = useMemo(() => {
    return keysOnlyInA.filter(k => k.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [keysOnlyInA, searchQuery])

  const filteredKeysOnlyInB = useMemo(() => {
    return keysOnlyInB.filter(k => k.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [keysOnlyInB, searchQuery])

  const filteredComponentDiffs = useMemo(() => {
    return componentDiffs.filter(d =>
      d.dataKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.labelA && d.labelA.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.labelB && d.labelB.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  }, [componentDiffs, searchQuery])

  const filteredValidationDiffs = useMemo(() => {
    return validationDiffs.filter(d => d.dataKey.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [validationDiffs, searchQuery])

  // Active diff to view in properties panel
  const activeComponentDiff = useMemo(() => {
    return componentDiffs.find(d => d.dataKey === selectedPropKey)
  }, [componentDiffs, selectedPropKey])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-[96vw] h-[92vh] max-w-7xl bg-card border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-98 duration-300">
        
        {/* Header */}
        <div className="h-16 border-b flex items-center justify-between px-6 bg-zinc-900/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/20 shadow-inner">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wider uppercase flex items-center gap-2">
                Template Comparison Studio
                <span className="text-[9px] bg-primary text-primary-foreground font-black px-2 py-0.5 rounded-full tracking-widest uppercase">
                  COMPARE MODE
                </span>
              </h2>
              <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                Deep logic analysis, validation comparisons, and property diffs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-full transition-all text-muted-foreground border border-transparent hover:border-destructive/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Control Panel: Selectors for Template A & B */}
        <div className="p-4 border-b bg-muted/20 shrink-0 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Template A Selector */}
          <div className="flex items-center gap-3">
            <div className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 text-xs font-bold font-mono">
              A
            </div>
            <div className="flex-1">
              <label className="text-[9px] font-black uppercase text-muted-foreground tracking-wider block mb-1">
                Template A (Reference)
              </label>
              <select
                value={templateAId}
                onChange={(e) => setTemplateAId(e.target.value)}
                className="w-full text-xs font-bold bg-background border rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary/50 transition-all cursor-pointer"
              >
                {availableTemplateIds.map(id => (
                  <option key={id} value={id}>
                    ID: {id} {id === currentTemplateId ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Template B Selector / File Upload */}
          <div className="flex items-center gap-3">
            <div className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 text-xs font-bold font-mono">
              B
            </div>
            <div className="flex-1">
              <label className="text-[9px] font-black uppercase text-muted-foreground tracking-wider block mb-1 flex items-center justify-between">
                <span>Template B (Comparison)</span>
                {uploadedTemplateB && (
                  <button
                    onClick={handleResetUpload}
                    className="text-[8px] text-destructive hover:underline font-bold uppercase"
                  >
                    Reset Upload
                  </button>
                )}
              </label>
              
              {uploadedTemplateB ? (
                <div className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/20 text-emerald-600 px-3 py-1.5 rounded-lg text-xs font-bold">
                  <span className="truncate max-w-[200px]">Uploaded: {uploadedFileNameB}</span>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => valInputRef.current?.click()}
                      className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white px-2 py-0.5 rounded transition-all font-bold"
                    >
                      {uploadedValidationB ? 'Validation loaded' : '+ Upload Validation'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={templateBId}
                    onChange={(e) => {
                      setTemplateBId(e.target.value)
                      setUploadedTemplateB(null)
                    }}
                    className="flex-1 text-xs font-bold bg-background border rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary/50 transition-all cursor-pointer"
                  >
                    <option value="" disabled>Pilih Template B...</option>
                    {availableTemplateIds.filter(id => id !== templateAId).map(id => (
                      <option key={id} value={id}>ID: {id}</option>
                    ))}
                    {availableTemplateIds.length <= 1 && (
                      <option value="" disabled>Tidak ada template lokal lain</option>
                    )}
                  </select>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 px-3 py-2 border border-dashed border-primary/40 hover:border-primary text-primary hover:bg-primary/5 text-xs font-bold rounded-lg transition-all"
                    title="Upload JSON file"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload JSON</span>
                  </button>
                </div>
              )}

              {/* Hidden Inputs */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleTemplateFileUpload}
                accept=".json"
                className="hidden"
              />
              <input
                type="file"
                ref={valInputRef}
                onChange={handleValidationFileUpload}
                accept=".json"
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b bg-muted/10 shrink-0">
          {[
            { id: 'overview', icon: Info, label: 'Overview' },
            { id: 'keys', icon: FileJson, label: `Data Keys (${keysOnlyInA.length + keysOnlyInB.length})` },
            { id: 'properties', icon: Settings, label: `Properties (${componentDiffs.length})` },
            { id: 'validations', icon: ShieldCheck, label: `Validations (${valKeysOnlyInA.length + valKeysOnlyInB.length + validationDiffs.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-6 py-3.5 text-[10px] font-black uppercase tracking-wider transition-all border-b-2",
                activeTab === tab.id
                  ? "bg-background text-primary border-primary shadow-[inset_0_-2px_0_0_rgba(var(--primary),1)]"
                  : "text-muted-foreground/60 border-transparent hover:text-muted-foreground hover:bg-muted/30"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden bg-muted/5 flex flex-col">
          {(!tplA || !tplB) ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mb-4 text-amber-500 opacity-80" />
              <p className="font-bold text-sm">Please select templates to compare</p>
              <p className="text-xs opacity-50 mt-1">Select valid Reference and Comparison templates above to start analysis.</p>
            </div>
          ) : (
            <>
              {/* Active Tab rendering */}
              {activeTab === 'overview' && (
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  
                  {/* Dashboard Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Compatibility Card */}
                    <div className="bg-card border rounded-2xl p-5 relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
                      <div className="absolute -right-4 -top-4 w-20 h-20 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-colors" />
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Structural Match</h4>
                      <div className="flex items-baseline gap-2 mt-3">
                        <span className="text-3xl font-black text-primary">{matchPercentage}%</span>
                        <span className="text-[10px] text-muted-foreground font-semibold">identical keys</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-4">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${matchPercentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Data Keys Unique count */}
                    <div className="bg-card border rounded-2xl p-5 relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
                      <div className="absolute -right-4 -top-4 w-20 h-20 bg-orange-500/5 rounded-full blur-xl group-hover:bg-orange-500/10 transition-colors" />
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Key Discrepancies</h4>
                      <div className="flex items-baseline gap-2 mt-3">
                        <span className="text-3xl font-black text-orange-500">
                          {keysOnlyInA.length + keysOnlyInB.length}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-semibold">unmatched dataKeys</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-4 font-semibold">
                        A: <span className="font-bold font-mono text-orange-500/80">-{keysOnlyInA.length}</span> · 
                        B: <span className="font-bold font-mono text-emerald-500/80">+{keysOnlyInB.length}</span>
                      </p>
                    </div>

                    {/* Logic Properties count */}
                    <div className="bg-card border rounded-2xl p-5 relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
                      <div className="absolute -right-4 -top-4 w-20 h-20 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-colors" />
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Logic Differences</h4>
                      <div className="flex items-baseline gap-2 mt-3">
                        <span className="text-3xl font-black text-indigo-500">{componentDiffs.length}</span>
                        <span className="text-[10px] text-muted-foreground font-semibold">matching components</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-4 font-semibold">
                        Have different properties (expressions, labels, etc.)
                      </p>
                    </div>

                    {/* Validation count */}
                    <div className="bg-card border rounded-2xl p-5 relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
                      <div className="absolute -right-4 -top-4 w-20 h-20 bg-red-500/5 rounded-full blur-xl group-hover:bg-red-500/10 transition-colors" />
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Validation Diffs</h4>
                      <div className="flex items-baseline gap-2 mt-3">
                        <span className="text-3xl font-black text-red-500">
                          {valKeysOnlyInA.length + valKeysOnlyInB.length + validationDiffs.length}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-semibold">validation rule diffs</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-4 font-semibold">
                        Different expressions or missing rules
                      </p>
                    </div>
                  </div>

                  {/* Summary Narrative */}
                  <div className="bg-card border rounded-2xl p-6 shadow-sm">
                    <h3 className="text-xs font-black uppercase tracking-wider mb-3 text-foreground flex items-center gap-2">
                      <Info className="w-4 h-4 text-primary" />
                      Comparison Analysis Summary
                    </h3>
                    <div className="space-y-4 text-xs text-muted-foreground leading-relaxed">
                      <p>
                        Comparing <span className="font-bold text-foreground">Template A (ID: {templateAId.substring(0, 8)}...)</span> with{' '}
                        <span className="font-bold text-foreground">Template B ({uploadedTemplateB ? 'Uploaded File' : `ID: ${templateBId.substring(0, 8)}...`})</span>:
                      </p>
                      <ul className="list-disc pl-5 space-y-2">
                        <li>
                          The structure contains <span className="font-bold text-foreground font-mono">{matchingKeys.length} matching dataKeys</span>{' '}
                          out of a total {totalKeysUnion} keys present in both.
                        </li>
                        {keysOnlyInA.length > 0 && (
                          <li>
                            There are <span className="font-bold text-orange-500 font-mono">{keysOnlyInA.length} dataKeys</span> present in Template A{' '}
                            but missing in Template B (representing deleted fields).
                          </li>
                        )}
                        {keysOnlyInB.length > 0 && (
                          <li>
                            There are <span className="font-bold text-emerald-500 font-mono">{keysOnlyInB.length} dataKeys</span> present in Template B{' '}
                            but missing in Template A (representing newly added fields).
                          </li>
                        )}
                        {componentDiffs.length > 0 ? (
                          <li>
                            We detected <span className="font-bold text-indigo-500 font-mono">{componentDiffs.length} components</span> with matching dataKeys{' '}
                            that contain different configuration properties (such as modified javascript logic conditions, validation scripts, or labels).
                          </li>
                        ) : (
                          <li>
                            <span className="font-bold text-green-500">Perfect Logic Match:</span> All matching component configurations share identical logic properties.
                          </li>
                        )}
                        {(valKeysOnlyInA.length > 0 || valKeysOnlyInB.length > 0 || validationDiffs.length > 0) && (
                          <li>
                            Validation analysis found{' '}
                            <span className="font-bold text-red-500 font-mono">
                              {valKeysOnlyInA.length + valKeysOnlyInB.length + validationDiffs.length} discrepancies
                            </span>{' '}
                            in input validation rules. This includes {valKeysOnlyInA.length} validation keys only in A,{' '}
                            {valKeysOnlyInB.length} keys only in B, and {validationDiffs.length} validation rule differences for matching keys.
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Data Keys Differences Tab */}
              {activeTab === 'keys' && (
                <div className="flex-1 flex overflow-hidden">
                  {/* Left Column: keys only in A */}
                  <div className="flex-1 flex flex-col border-r h-full overflow-hidden">
                    <div className="p-4 border-b bg-red-500/[0.02] shrink-0">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-[10px] font-black uppercase text-orange-500 tracking-wider flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                          Only in Template A ({filteredKeysOnlyInA.length})
                        </h4>
                        <span className="text-[8px] bg-orange-500/10 text-orange-500 border border-orange-500/20 px-2 py-0.5 rounded font-black uppercase">
                          MISSING IN B
                        </span>
                      </div>
                      
                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search missing keys..."
                          className="w-full text-xs pl-8 pr-3 py-1.5 bg-background border rounded-md outline-none focus:ring-1 focus:ring-primary/40"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                      {filteredKeysOnlyInA.length === 0 ? (
                        <div className="py-12 text-center text-xs text-muted-foreground">
                          No missing keys found
                        </div>
                      ) : (
                        filteredKeysOnlyInA.map(key => {
                          const comp = mapA[key]
                          const Icon = TYPE_ICONS[comp?.type || 0] || Layers
                          return (
                            <div key={key} className="p-3 bg-card border hover:border-orange-500/30 rounded-xl transition-all flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h5 className="text-[10px] font-bold text-foreground truncate uppercase tracking-wider">
                                  {stripHtml(comp?.label || 'No Label')}
                                </h5>
                                <p className="text-[9px] font-mono text-muted-foreground truncate leading-none mt-0.5 select-all">
                                  {key}
                                </p>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>

                  {/* Right Column: keys only in B */}
                  <div className="flex-1 flex flex-col h-full overflow-hidden">
                    <div className="p-4 border-b bg-emerald-500/[0.02] shrink-0">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-[10px] font-black uppercase text-emerald-500 tracking-wider flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Only in Template B ({filteredKeysOnlyInB.length})
                        </h4>
                        <span className="text-[8px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded font-black uppercase">
                          NEW FIELD
                        </span>
                      </div>
                      
                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search added keys..."
                          className="w-full text-xs pl-8 pr-3 py-1.5 bg-background border rounded-md outline-none focus:ring-1 focus:ring-primary/40"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                      {filteredKeysOnlyInB.length === 0 ? (
                        <div className="py-12 text-center text-xs text-muted-foreground">
                          No new keys found
                        </div>
                      ) : (
                        filteredKeysOnlyInB.map(key => {
                          const comp = mapB[key]
                          const Icon = TYPE_ICONS[comp?.type || 0] || Layers
                          return (
                            <div key={key} className="p-3 bg-card border hover:border-emerald-500/30 rounded-xl transition-all flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h5 className="text-[10px] font-bold text-foreground truncate uppercase tracking-wider">
                                  {stripHtml(comp?.label || 'No Label')}
                                </h5>
                                <p className="text-[9px] font-mono text-muted-foreground truncate leading-none mt-0.5 select-all">
                                  {key}
                                </p>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Property Differences Tab */}
              {activeTab === 'properties' && (
                <div className="flex-1 flex overflow-hidden h-full">
                  {/* Left Column: list of components with differences */}
                  <div className="w-80 border-r flex flex-col shrink-0 h-full overflow-hidden">
                    <div className="p-4 border-b shrink-0">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search logic differences..."
                          className="w-full text-xs pl-8 pr-3 py-1.5 bg-background border rounded-md outline-none focus:ring-1 focus:ring-primary/40"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                      {filteredComponentDiffs.length === 0 ? (
                        <div className="py-12 text-center text-xs text-muted-foreground">
                          No matching components with logic diffs
                        </div>
                      ) : (
                        filteredComponentDiffs.map(d => {
                          const Icon = TYPE_ICONS[d.typeA || 0] || Layers
                          const isSelected = selectedPropKey === d.dataKey
                          return (
                            <button
                              key={d.dataKey}
                              onClick={() => setSelectedPropKey(d.dataKey)}
                              className={cn(
                                "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all relative outline-none",
                                isSelected
                                  ? "bg-primary/5 border-primary shadow-sm"
                                  : "bg-card border-border/40 hover:border-border hover:bg-muted/20"
                              )}
                            >
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                                isSelected ? "bg-primary text-white border-primary/20" : "bg-muted text-muted-foreground border-border/30"
                              )}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h5 className="text-[10px] font-bold text-foreground truncate uppercase tracking-wider">
                                  {stripHtml(d.labelA || d.labelB || 'No Label')}
                                </h5>
                                <p className="text-[9px] font-mono text-muted-foreground truncate leading-none mt-0.5">
                                  {d.dataKey}
                                </p>
                              </div>
                              <div className="shrink-0 text-[8px] bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 font-black px-1.5 py-0.5 rounded">
                                {d.diffs.length}
                              </div>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>

                  {/* Right Column: side-by-side properties comparison */}
                  <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
                    {activeComponentDiff ? (
                      <div className="flex-1 flex flex-col h-full overflow-hidden">
                        {/* Selected Component Header */}
                        <div className="p-4 border-b bg-muted/10 shrink-0 flex justify-between items-center">
                          <div>
                            <h4 className="text-xs font-black uppercase text-foreground">
                              {stripHtml(activeComponentDiff.labelA || activeComponentDiff.labelB || 'No Label')}
                            </h4>
                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                              dataKey: <span className="font-bold select-all">{activeComponentDiff.dataKey}</span>
                            </p>
                          </div>
                          
                          <div className="flex gap-2">
                            <span className="text-[9px] font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 px-2.5 py-1 rounded">
                              {activeComponentDiff.diffs.length} property differences
                            </span>
                          </div>
                        </div>

                        {/* Property differences list */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                          {activeComponentDiff.diffs.map(diff => {
                            const isLongText = typeof diff.valA === 'string' && (diff.valA.length > 30 || diff.valA.includes('\n')) ||
                                               typeof diff.valB === 'string' && (diff.valB.length > 30 || diff.valB.includes('\n'))

                            return (
                              <div key={diff.propertyName} className="bg-card border rounded-2xl overflow-hidden flex flex-col shadow-sm">
                                {/* Property Name bar */}
                                <div className="px-4 py-2 border-b bg-muted/30 flex justify-between items-center">
                                  <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                                    Property: <span className="text-indigo-500 font-mono">{diff.propertyName}</span>
                                  </span>
                                  <span className="text-[8px] bg-indigo-500/5 text-indigo-600 border border-indigo-500/10 px-1.5 py-0.5 rounded font-black">
                                    MODIFIED
                                  </span>
                                </div>

                                {/* Comparison Values Grid */}
                                <div className={cn(
                                  "grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border bg-background/50",
                                  isLongText ? "min-h-[160px]" : "py-3"
                                )}>
                                  {/* Template A Value */}
                                  <div className="p-4 flex flex-col justify-start">
                                    <span className="text-[8px] font-black uppercase text-indigo-500 tracking-wider mb-2 block">
                                      Template A Value
                                    </span>
                                    {isLongText ? (
                                      <pre className="text-[10px] font-mono leading-relaxed bg-zinc-950/5 text-amber-600 border border-amber-500/10 bg-amber-500/[0.02] p-3 rounded-lg overflow-x-auto whitespace-pre-wrap flex-1 max-h-40 custom-scrollbar select-all">
                                        {String(diff.valA ?? '/* empty */')}
                                      </pre>
                                    ) : (
                                      <span className="text-xs font-mono font-bold text-amber-600 select-all">
                                        {diff.valA === undefined ? '/* undefined */' : JSON.stringify(diff.valA)}
                                      </span>
                                    )}
                                  </div>

                                  {/* Template B Value */}
                                  <div className="p-4 flex flex-col justify-start">
                                    <span className="text-[8px] font-black uppercase text-emerald-500 tracking-wider mb-2 block">
                                      Template B Value
                                    </span>
                                    {isLongText ? (
                                      <pre className="text-[10px] font-mono leading-relaxed bg-zinc-950/5 text-emerald-600 border border-emerald-500/10 bg-emerald-500/[0.02] p-3 rounded-lg overflow-x-auto whitespace-pre-wrap flex-1 max-h-40 custom-scrollbar select-all">
                                        {String(diff.valB ?? '/* empty */')}
                                      </pre>
                                    ) : (
                                      <span className="text-xs font-mono font-bold text-emerald-600 select-all">
                                        {diff.valB === undefined ? '/* undefined */' : JSON.stringify(diff.valB)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground">
                        <HelpCircle className="w-12 h-12 mb-4 opacity-20" />
                        <p className="font-bold text-sm">Select a component from the left list</p>
                        <p className="text-xs opacity-50 mt-1">To view side-by-side logic and configuration differences.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Validation Differences Tab */}
              {activeTab === 'validations' && (
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  
                  {/* Unmatched Validation Keys grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Val keys unique to A */}
                    <div className="bg-card border rounded-2xl p-5 shadow-sm">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-[10px] font-black uppercase text-orange-500 tracking-wider flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                          Validation Keys Only in A ({valKeysOnlyInA.length})
                        </h4>
                        <span className="text-[8px] bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded font-black">
                          MISSING IN B
                        </span>
                      </div>

                      {valKeysOnlyInA.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground italic py-4">No unique validation keys in A.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 border border-dashed rounded-lg bg-background/50 custom-scrollbar">
                          {valKeysOnlyInA.map(k => (
                            <span key={k} className="text-[9px] font-mono font-bold bg-orange-500/5 text-orange-600 border border-orange-500/10 px-2 py-0.5 rounded select-all">
                              {k}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Val keys unique to B */}
                    <div className="bg-card border rounded-2xl p-5 shadow-sm">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-[10px] font-black uppercase text-emerald-500 tracking-wider flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Validation Keys Only in B ({valKeysOnlyInB.length})
                        </h4>
                        <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded font-black">
                          NEW RULE
                        </span>
                      </div>

                      {valKeysOnlyInB.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground italic py-4">No unique validation keys in B.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 border border-dashed rounded-lg bg-background/50 custom-scrollbar">
                          {valKeysOnlyInB.map(k => (
                            <span key={k} className="text-[9px] font-mono font-bold bg-emerald-500/5 text-emerald-600 border border-emerald-500/10 px-2 py-0.5 rounded select-all">
                              {k}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Matching keys with validation rule diffs */}
                  <div className="bg-card border rounded-2xl shadow-sm overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b bg-muted/10 shrink-0 flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xs font-black uppercase text-foreground">
                          Modified Validation Rules ({filteredValidationDiffs.length})
                        </h3>
                        <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                          Validations present in both templates but with differing criteria
                        </p>
                      </div>
                      
                      {/* Search */}
                      <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search rule differences..."
                          className="w-full text-xs pl-8 pr-3 py-1.5 bg-background border rounded-md outline-none focus:ring-1 focus:ring-primary/40"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="divide-y divide-border overflow-y-auto max-h-[400px] custom-scrollbar">
                      {filteredValidationDiffs.length === 0 ? (
                        <div className="py-12 text-center text-xs text-muted-foreground italic">
                          No matching validation rule diffs found.
                        </div>
                      ) : (
                        filteredValidationDiffs.map(diff => (
                          <div key={diff.dataKey} className="p-5 space-y-4 hover:bg-muted/[0.02] transition-colors">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-mono font-black text-indigo-500 uppercase select-all">
                                dataKey: {diff.dataKey}
                              </span>
                              <span className="text-[8px] bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 px-2 py-0.5 rounded font-black uppercase">
                                RULE MODIFIED
                              </span>
                            </div>

                            {/* Side-by-side rules list */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* rules A */}
                              <div className="space-y-2">
                                <span className="text-[8px] font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1.5">
                                  Template A Validations ({diff.rulesA.length})
                                </span>
                                {diff.rulesA.length === 0 ? (
                                  <p className="text-[10px] text-muted-foreground italic">No rules defined.</p>
                                ) : (
                                  diff.rulesA.map((rule, idx) => (
                                    <div key={idx} className="p-3 bg-amber-500/[0.02] border border-amber-500/10 rounded-xl space-y-2">
                                      <div className="flex justify-between items-center">
                                        <span className="text-[8px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-bold">Rule #{idx + 1}</span>
                                        <span className="text-[8px] font-bold text-amber-600 font-mono">Severity: {rule.type}</span>
                                      </div>
                                      <pre className="text-[10px] font-mono bg-zinc-950/5 p-2 rounded text-amber-700 whitespace-pre-wrap select-all">{rule.test}</pre>
                                      <p className="text-[10px] text-amber-600/80 font-medium select-all">Message: "{rule.message}"</p>
                                    </div>
                                  ))
                                )}
                              </div>

                              {/* rules B */}
                              <div className="space-y-2">
                                <span className="text-[8px] font-black uppercase text-emerald-500 tracking-wider flex items-center gap-1.5">
                                  Template B Validations ({diff.rulesB.length})
                                </span>
                                {diff.rulesB.length === 0 ? (
                                  <p className="text-[10px] text-muted-foreground italic">No rules defined.</p>
                                ) : (
                                  diff.rulesB.map((rule, idx) => (
                                    <div key={idx} className="p-3 bg-emerald-500/[0.02] border border-emerald-500/10 rounded-xl space-y-2">
                                      <div className="flex justify-between items-center">
                                        <span className="text-[8px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-bold">Rule #{idx + 1}</span>
                                        <span className="text-[8px] font-bold text-emerald-600 font-mono">Severity: {rule.type}</span>
                                      </div>
                                      <pre className="text-[10px] font-mono bg-zinc-950/5 p-2 rounded text-emerald-700 whitespace-pre-wrap select-all">{rule.test}</pre>
                                      <p className="text-[10px] text-emerald-600/80 font-medium select-all">Message: "{rule.message}"</p>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="h-12 border-t bg-muted/20 px-6 shrink-0 flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <CheckCircleIcon className="w-3.5 h-3.5 text-green-500" />
              Structural comparison ready
            </span>
          </div>
          <div>
            Badan Pusat Statistik · Template Compare Engine
          </div>
        </div>

      </div>
    </div>
  )
}
