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
    setTemplate,
    setValidation,
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
    return validation.testFunctions.find((tf: TestFunction) => tf.dataKey === selectedDataKey) || {
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

    if (sidebarMode === 'components') return;

    if (sidebarMode === 'presets') {
      setLocalJSON(JSON.stringify(preset, null, 2))
    } else if (sidebarMode === 'responses') {
      setLocalJSON(JSON.stringify(response, null, 2))
    } else if (sidebarMode === 'template') {
      setLocalJSON(JSON.stringify(template, null, 2))
    } else if (sidebarMode === 'validation') {
      setLocalJSON(JSON.stringify(validation, null, 2))
    }
  }, [sidebarMode, preset, response, template, validation]) // Sync aggressively with external changes

  // Debounced update logic
  useEffect(() => {
    if (!lastUpdateFromEditorRef.current) return;
    
    const timer = setTimeout(() => {
      try {
        const parsed = JSON.parse(localJSON)
        setJsonError(null)
        if (sidebarMode === 'presets') setPreset(parsed)
        else if (sidebarMode === 'responses') setResponse(parsed)
        else if (sidebarMode === 'template') setTemplate(parsed)
        else if (sidebarMode === 'validation') setValidation(parsed)
      } catch (e: any) {
        setJsonError(e.message)
      } finally {
        lastUpdateFromEditorRef.current = false;
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [localJSON, sidebarMode, setPreset, setResponse, setTemplate, setValidation]);

  const handleJSONChange = (val: string) => {
    setLocalJSON(val)
    lastUpdateFromEditorRef.current = true;
    // Validation-only parsing to show errors immediately without updating store
    try {
      JSON.parse(val)
      setJsonError(null)
    } catch (e: any) {
      setJsonError(e.message)
    }
  }

  if (sidebarMode !== 'components') {
    const handleFormatJSON = () => {
      try {
        const parsed = JSON.parse(localJSON)
        setLocalJSON(JSON.stringify(parsed, null, 2))
        setJsonError(null)
      } catch (e: any) {
        setJsonError(`Cannot format: ${e.message}`)
      }
    }

    return (
      <div className="flex-1 h-full flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
        <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-md bg-primary/20 text-primary">
              <Code className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">{sidebarMode} EDITOR</h2>
              <p className="text-[8px] text-zinc-500 font-medium">Advanced JSON Configuration</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={handleFormatJSON}
              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md text-[10px] font-bold transition-colors border border-zinc-700"
            >
              FORMAT JSON
            </button>

            {jsonError ? (
              <div className="flex items-center gap-2 px-3 py-1 bg-destructive/10 text-destructive border border-destructive/20 rounded-full text-[10px] font-bold animate-in zoom-in duration-300">
                <ShieldCheck className="w-3 h-3 rotate-180" />
                INVALID JSON
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-[10px] font-bold animate-in zoom-in duration-300">
                <ShieldCheck className="w-3 h-3" />
                SYNCED
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Gutter / Help */}
          <div className="w-48 border-r border-zinc-900 bg-zinc-950 p-4 space-y-4 hidden md:block overflow-y-auto">
            <div className="space-y-1">
              <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Editing Tips</h3>
              <p className="text-[9px] text-zinc-600 leading-relaxed">
                {sidebarMode === 'template' && "The template defines the structural layout and core component properties."}
                {sidebarMode === 'validation' && "Validations are logic rules that run on data change to ensure quality."}
                {sidebarMode === 'presets' && "Predata allows you to pre-fill the form with existing data."}
                {sidebarMode === 'responses' && "Answers represent the current user input state."}
              </p>
            </div>
            
            <div className="space-y-2 pt-4">
              <div className="p-2 bg-primary/5 rounded border border-primary/10">
                <div className="flex items-center gap-2 text-primary mb-1">
                  <Database className="w-3 h-3" />
                  <span className="text-[9px] font-bold uppercase">Real-time</span>
                </div>
                <p className="text-[8px] text-zinc-500 leading-tight">Changes are saved automatically to local storage every 500ms.</p>
              </div>
            </div>
          </div>

          <div className="flex-1 relative">
            <textarea
              className="absolute inset-0 w-full h-full p-8 bg-zinc-950 text-zinc-300 font-mono text-xs leading-relaxed outline-none resize-none selection:bg-primary/30 custom-scrollbar"
              value={localJSON}
              spellCheck={false}
              onChange={(e) => handleJSONChange(e.target.value)}
              placeholder={`Paste your ${sidebarMode} JSON here...`}
            />
          </div>
        </div>
        
        <div className="h-10 border-t border-zinc-900 flex items-center px-6 bg-zinc-950 text-[10px] text-zinc-500 gap-6 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span className="font-mono opacity-80 uppercase tracking-tighter">Auto-save: Enabled</span>
          </div>
          <div className="w-px h-3 bg-zinc-800" />
          <div className="flex-1 font-mono opacity-40">UTF-8 • JSON • Fasih V2</div>
          {jsonError && <div className="text-destructive font-bold truncate max-w-md">{jsonError}</div>}
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

  const handleLocalComponentChange = (key: string, value: any) => {
    if (!localComponent) return
    setLocalComponent({ ...localComponent, [key]: value })
  }

  const commitComponentUpdate = () => {
    if (!localComponent || !selectedDataKey) return
    updateComponent(selectedDataKey, localComponent)
  }

  const handleLocalValidationChange = (index: number, key: string, value: any) => {
    if (!localValidation) return
    const updatedValidations = [...localValidation.validations]
    updatedValidations[index] = { ...updatedValidations[index], [key]: value }
    setLocalValidation({ ...localValidation, validations: updatedValidations })
  }

  const commitValidationUpdate = () => {
    if (!localValidation || !selectedDataKey) return
    updateValidation(selectedDataKey, localValidation)
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
    <div className="flex-1 bg-background overflow-y-auto custom-scrollbar">
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
                onChange={(e) => handleLocalComponentChange('label', e.target.value)}
                onBlur={commitComponentUpdate}
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
                    onChange={(e) => handleLocalComponentChange(field, e.target.value)}
                    onBlur={commitComponentUpdate}
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
            {localValidation?.validations.map((rule: any, idx: number) => (
              <div key={idx} className="p-4 bg-muted/30 rounded-lg border border-border/50 relative group">
                <div className="absolute -left-2 top-4 w-1 h-8 bg-primary rounded-full" />
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Validation Script (Test)</label>
                    <textarea
                      className="w-full min-h-[100px] p-3 text-sm font-mono bg-zinc-950 text-zinc-200 border border-zinc-800 rounded-md focus:ring-1 focus:ring-primary outline-none"
                      value={rule.test}
                      onChange={(e) => handleLocalValidationChange(idx, 'test', e.target.value)}
                      onBlur={commitValidationUpdate}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Error Message</label>
                      <input
                        type="text"
                        className="w-full p-2 text-sm bg-background border rounded-md focus:ring-1 focus:ring-primary outline-none"
                        value={rule.message}
                        onChange={(e) => handleLocalValidationChange(idx, 'message', e.target.value)}
                        onBlur={commitValidationUpdate}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Severity (Type)</label>
                      <select
                        className="w-full p-2 text-sm bg-background border rounded-md focus:ring-1 focus:ring-primary outline-none"
                        value={rule.type}
                        onChange={(e) => handleLocalValidationChange(idx, 'type', parseInt(e.target.value))}
                        onBlur={commitValidationUpdate}
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
