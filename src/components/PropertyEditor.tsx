import React, { useEffect, useState, useMemo } from 'react'
import { useStore, Component, TestFunction } from '../store/useStore'
import { Code, Settings2, ShieldCheck, Save, Database, ClipboardList } from 'lucide-react'
import { cn } from '../lib/utils'

export const PropertyEditor = () => {
  const { 
    template, 
    validation, 
    preset,
    response,
    selectedDataKey, 
    sidebarMode,
    updateComponent, 
    updateValidation,
    updatePresetEntry,
    updateResponseEntry,
    setPreset,
    setResponse,
    componentMap
  } = useStore()

  const [localComponent, setLocalComponent] = useState<Component | null>(null)
  const [localValidation, setLocalValidation] = useState<TestFunction | null>(null)

  const selectedComponent = useMemo(() => {
    if (!selectedDataKey || !componentMap) return null
    return componentMap[selectedDataKey] || null
  }, [componentMap, selectedDataKey])

  const selectedValidation = useMemo(() => {
    if (!validation || !selectedDataKey) return null
    return validation.testFunctions.find((tf: any) => tf.dataKey === selectedDataKey) || {
      dataKey: selectedDataKey,
      componentValidation: [selectedDataKey],
      validations: []
    }
  }, [validation, selectedDataKey])

  useEffect(() => {
    setLocalComponent(selectedComponent)
    setLocalValidation(selectedValidation)
  }, [selectedComponent, selectedValidation])


  const [localJSON, setLocalJSON] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const lastUpdateFromEditorRef = React.useRef(false)

  useEffect(() => {
    if (lastUpdateFromEditorRef.current) {
      lastUpdateFromEditorRef.current = false;
      return;
    }

    if (sidebarMode === 'presets') {
      setLocalJSON(JSON.stringify(preset, null, 2))
    } else if (sidebarMode === 'responses') {
      setLocalJSON(JSON.stringify(response, null, 2))
    }
  }, [sidebarMode, preset, response]) // Sync aggressively with external changes

  const handleJSONChange = (val: string) => {
    setLocalJSON(val)
    lastUpdateFromEditorRef.current = true;
    try {
      const parsed = JSON.parse(val)
      setJsonError(null)
      if (sidebarMode === 'presets') setPreset(parsed)
      else if (sidebarMode === 'responses') setResponse(parsed)
    } catch (e: any) {
      setJsonError(e.message)
      lastUpdateFromEditorRef.current = false;
    }
  }

  if (sidebarMode !== 'components') {
    return (
      <div className="flex-1 flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
        <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-md bg-primary/20 text-primary">
              <Code className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-bold uppercase tracking-widest">{sidebarMode} JSON EDITOR</h2>
          </div>
          {jsonError ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-destructive/10 text-destructive border border-destructive/20 rounded-full text-[10px] font-bold">
              <ShieldCheck className="w-3 h-3 rotate-180" />
              INVALID JSON: {jsonError}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-[10px] font-bold">
              <ShieldCheck className="w-3 h-3" />
              SYNCED & VALID
            </div>
          )}
        </div>

        <div className="flex-1 p-0 relative">
          <textarea
            className="absolute inset-0 w-full h-full p-8 bg-zinc-950 text-zinc-300 font-mono text-xs leading-relaxed outline-none resize-none selection:bg-primary/30"
            value={localJSON}
            spellCheck={false}
            onChange={(e) => handleJSONChange(e.target.value)}
          />
        </div>
        
        <div className="h-8 border-t border-zinc-800 flex items-center px-6 bg-zinc-900/30 text-[10px] text-zinc-500 gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            Real-time update enabled
          </div>
          <div className="w-px h-3 bg-zinc-800" />
          <div>JSON Schema valid for Fasih Engine v2.0</div>
        </div>
      </div>
    )
  }

  if (!selectedDataKey) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 bg-muted/20">
        <Settings2 className="w-12 h-12 mb-4 opacity-20" />
        <p className="font-medium">Select a component to edit</p>
        <p className="text-xs opacity-50 mt-1">Properties and validations will appear here</p>
      </div>
    )
  }

  const handleUpdateComponent = (key: string, value: any) => {
    if (!localComponent) return
    const updated = { ...localComponent, [key]: value }
    setLocalComponent(updated)
    updateComponent(selectedDataKey, updated)
  }

  const handleUpdateValidation = (index: number, key: string, value: any) => {
    if (!localValidation) return
    const updatedValidations = [...localValidation.validations]
    updatedValidations[index] = { ...updatedValidations[index], [key]: value }
    const updated = { ...localValidation, validations: updatedValidations }
    setLocalValidation(updated)
    updateValidation(selectedDataKey, updated)
  }

  const addValidation = () => {
    if (!localValidation) return
    const updated = {
      ...localValidation,
      validations: [...localValidation.validations, { test: '', message: '', type: 1 }]
    }
    setLocalValidation(updated)
    updateValidation(selectedDataKey, updated)
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-background/80 backdrop-blur-md border-b">
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">{localComponent?.dataKey || 'Editor'}</h2>
        </div>
      </div>

      <div className="p-6 space-y-8 max-w-4xl mx-auto">
        {/* Basic Properties */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
            <Settings2 className="w-4 h-4" />
            Basic Properties
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Label</label>
              <textarea
                className="w-full min-h-[80px] p-2 text-sm bg-muted/30 border rounded-md focus:ring-1 focus:ring-primary outline-none"
                value={localComponent?.label || ''}
                onChange={(e) => handleUpdateComponent('label', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Data Key</label>
              <input
                type="text"
                className="w-full p-2 text-sm bg-muted/30 border rounded-md focus:ring-1 focus:ring-primary outline-none"
                value={localComponent?.dataKey || ''}
                disabled
              />
            </div>
          </div>
        </section>

        {/* JS Scripts */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
            <Code className="w-4 h-4" />
            JS Logic (Expressions & Conditions)
          </div>
          
          <div className="space-y-4">
            {['expression', 'enableCondition', 'readonlyCondition', 'enable', 'required'].map((field) => (
              <div key={field} className="space-y-1.5 border-l-2 border-primary/20 pl-4 py-1 hover:border-primary transition-colors">
                <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-2">
                  {field.replace(/([A-Z])/g, ' $1')}
                  <span className="text-[8px] bg-muted px-1 rounded opacity-50 font-mono">property: {field}</span>
                </label>
                <div className="relative group">
                  <textarea
                    className={cn(
                      "w-full min-h-[40px] p-2 text-sm font-mono bg-zinc-950 text-zinc-200 border border-zinc-800 rounded-md focus:ring-1 focus:ring-primary outline-none resize-y",
                      (['expression', 'enableCondition', 'readonlyCondition'].includes(field)) ? "min-h-[100px]" : "min-h-[40px]"
                    )}
                    value={String(localComponent?.[field] || '')}
                    placeholder={`// Enter ${field} value/script...`}
                    onChange={(e) => handleUpdateComponent(field, e.target.value)}
                  />
                  <div className="absolute right-2 top-2 p-1 bg-zinc-800 text-zinc-400 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <Code className="w-3 h-3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Validations */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              Validation Rules
            </div>
            <button 
              onClick={addValidation}
              className="text-xs font-medium text-primary hover:underline"
            >
              + Add Rule
            </button>
          </div>

          <div className="space-y-6">
            {localValidation?.validations.map((rule, idx) => (
              <div key={idx} className="p-4 bg-muted/30 rounded-lg border border-border/50 relative group">
                <div className="absolute -left-2 top-4 w-1 h-8 bg-primary rounded-full" />
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Validation Script (Test)</label>
                    <textarea
                      className="w-full min-h-[100px] p-3 text-sm font-mono bg-zinc-950 text-zinc-200 border border-zinc-800 rounded-md focus:ring-1 focus:ring-primary outline-none"
                      value={rule.test}
                      onChange={(e) => handleUpdateValidation(idx, 'test', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Error Message</label>
                      <input
                        type="text"
                        className="w-full p-2 text-sm bg-background border rounded-md focus:ring-1 focus:ring-primary outline-none"
                        value={rule.message}
                        onChange={(e) => handleUpdateValidation(idx, 'message', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Severity (Type)</label>
                      <select
                        className="w-full p-2 text-sm bg-background border rounded-md focus:ring-1 focus:ring-primary outline-none"
                        value={rule.type}
                        onChange={(e) => handleUpdateValidation(idx, 'type', parseInt(e.target.value))}
                      >
                        <option value={1}>Warning (1)</option>
                        <option value={2}>Error (2)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
