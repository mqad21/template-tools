import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useStore, Component, TestFunction } from '../store/useStore'
import { Code, Settings2, ShieldCheck, Save, Database, ClipboardList } from 'lucide-react'
import { cn } from '../lib/utils'
import Editor from '@monaco-editor/react'

export const PropertyEditor = () => {
  const { 
    template, 
    validation, 
    preset,
    response,
    principalInput,
    selectedDataKey, 
    sidebarMode,
    setSidebarMode,
    setSelectedDataKey,
    updateComponent, 
    updateValidation,
    updatePresetEntry,
    updateResponseEntry,
    setPreset,
    setResponse,
    setTemplate,
    setValidation,
    setPrincipalInput,
    setIsPrincipalsEditorOpen,
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
  const [isDirty, setIsDirty] = useState(false)

  const editorRef = useRef<any>(null)
  const localJSONRef = useRef(localJSON)

  useEffect(() => {
    if (isDirty) return; // don't override while user is editing

    if (sidebarMode === 'components') return;

    let newValue = ''
    if (sidebarMode === 'presets') {
      newValue = JSON.stringify(preset, null, 2)
    } else if (sidebarMode === 'responses') {
      newValue = JSON.stringify(response, null, 2)
    } else if (sidebarMode === 'template') {
      newValue = JSON.stringify(template, null, 2)
    } else if (sidebarMode === 'validation') {
      newValue = JSON.stringify(validation, null, 2)
    } else if (sidebarMode === 'principals') {
      newValue = JSON.stringify(principalInput || { principals: [] }, null, 2)
    }

    setLocalJSON(newValue)
    localJSONRef.current = newValue
    if (editorRef.current) {
      editorRef.current.setValue(newValue)
    }
  }, [sidebarMode, preset, response, template, validation, principalInput, isDirty])

  // Reset dirty state when switching modes
  useEffect(() => {
    setIsDirty(false)
  }, [sidebarMode])

  const handleSaveJSON = useCallback(() => {
    try {
      const parsed = JSON.parse(localJSONRef.current)
      setJsonError(null)
      if (sidebarMode === 'presets') setPreset(parsed)
      else if (sidebarMode === 'responses') setResponse(parsed)
      else if (sidebarMode === 'template') setTemplate(parsed)
      else if (sidebarMode === 'validation') setValidation(parsed)
      else if (sidebarMode === 'principals') setPrincipalInput(parsed)
      setIsDirty(false)
      
      // Close the editor dialog immediately after saving
      setSelectedDataKey(null)
      if (sidebarMode === 'principals') {
        setIsPrincipalsEditorOpen(false)
      } else {
        setSidebarMode('components')
      }
    } catch (e: any) {
      setJsonError(e.message)
    }
  }, [sidebarMode, setPreset, setResponse, setTemplate, setValidation, setPrincipalInput, setSelectedDataKey, setSidebarMode])

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSaveJSON()
    });
  }

  const handleJSONChange = (val: string | undefined) => {
    if (val === undefined) return;
    localJSONRef.current = val
    if (!isDirty) {
      setIsDirty(true)
    }
  }

  if (sidebarMode !== 'components') {
    const handleFormatJSON = () => {
      try {
        const parsed = JSON.parse(localJSONRef.current)
        const formatted = JSON.stringify(parsed, null, 2)
        localJSONRef.current = formatted
        if (editorRef.current) {
          editorRef.current.setValue(formatted)
        }
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
              onClick={handleSaveJSON}
              className="flex items-center gap-1.5 px-3 py-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-[10px] font-bold transition-colors shadow-sm"
              title="Save (Ctrl+S)"
            >
              <Save className="w-3 h-3" />
              SAVE
            </button>
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
            ) : isDirty ? (
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full text-[10px] font-bold animate-in zoom-in duration-300">
                <ShieldCheck className="w-3 h-3" />
                UNSAVED
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
                {sidebarMode === 'principals' && "Principals define credentials/identities and metadata passed to the engine."}
              </p>
            </div>
            
            <div className="space-y-2 pt-4">
              <div className="p-2 bg-primary/5 rounded border border-primary/10">
                <div className="flex items-center gap-2 text-primary mb-1">
                  <Database className="w-3 h-3" />
                  <span className="text-[9px] font-bold uppercase">Manual Save</span>
                </div>
                <p className="text-[8px] text-zinc-500 leading-tight">Press Ctrl+S or click SAVE to persist changes to storage.</p>
              </div>
            </div>
          </div>

          <div className="flex-1 relative">
            <Editor
              height="100%"
              theme="vs-dark"
              language="json"
              defaultValue={localJSON}
              onChange={handleJSONChange}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                wordWrap: 'on',
                formatOnPaste: true,
                padding: { top: 24, bottom: 24 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on"
              }}
            />
          </div>
        </div>
        
        <div className="h-10 border-t border-zinc-900 flex items-center px-6 bg-zinc-950 text-[10px] text-zinc-500 gap-6 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className={cn("w-1.5 h-1.5 rounded-full", isDirty ? "bg-amber-500" : "bg-green-500 animate-pulse")} />
            <span className="font-mono opacity-80 uppercase tracking-tighter">Manual Save</span>
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
