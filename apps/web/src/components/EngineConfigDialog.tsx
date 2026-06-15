import React, { useState, useEffect } from 'react'
import { 
  Settings2, X, Save, Check, AlertCircle, 
  User, Database, Globe, Sliders, FileCode, CheckCircle2,
  Plus, Trash2
} from 'lucide-react'
import { cn } from '../lib/utils'
import Editor from '@monaco-editor/react'

interface EngineConfigDialogProps {
  isOpen: boolean
  onClose: () => void
  config: {
    mode: string
    assignmentId: string
    locale: string
    formMode: string
    initialMode: string
    remarkJson: string
    principalsJson: string
    userJson: string
  }
  onSave: (newConfig: {
    mode: string
    assignmentId: string
    locale: string
    formMode: string
    initialMode: string
    remarkJson: string
    principalsJson: string
    userJson: string
  }) => void
}

export const EngineConfigDialog: React.FC<EngineConfigDialogProps> = ({ 
  isOpen, 
  onClose, 
  config, 
  onSave 
}) => {
  const [activeTab, setActiveTab] = useState<'params' | 'user' | 'remarks'>('params')

  // Local Draft States
  const [mode, setMode] = useState(config.mode)
  const [assignmentId, setAssignmentId] = useState(config.assignmentId)
  const [locale, setLocale] = useState(config.locale)
  const [formMode, setFormMode] = useState(config.formMode)
  const [initialMode, setInitialMode] = useState(config.initialMode)
  const [remarkJson, setRemarkJson] = useState(config.remarkJson)
  const [principalsJson, setPrincipalsJson] = useState(config.principalsJson)
  const [userJson, setUserJson] = useState(config.userJson)

  // User input states derived from userJson
  const [userNameField, setUserNameField] = useState('')
  const [userUsernameField, setUserUsernameField] = useState('')
  const [userRoleField, setUserRoleField] = useState('')

  // Validation States
  const [remarkError, setRemarkError] = useState<string | null>(null)
  const [principalsError, setPrincipalsError] = useState<string | null>(null)
  const [userError, setUserError] = useState<string | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [principalsViewMode, setPrincipalsViewMode] = useState<'table' | 'json'>('table')

  // Parse and edit helpers for Principals Table View
  let parsedPrincipals: any[] = []
  let isPrincipalsParsable = false
  try {
    const parsed = JSON.parse(principalsJson)
    if (Array.isArray(parsed)) {
      parsedPrincipals = parsed
      isPrincipalsParsable = true
    }
  } catch (e) {
    // Keep isPrincipalsParsable = false
  }

  const handleTableChange = (index: number, field: string, val: any) => {
    const updated = parsedPrincipals.map((item, idx) => {
      if (idx === index) {
        return {
          ...item,
          [field]: val
        }
      }
      return item
    })
    setPrincipalsJson(JSON.stringify(updated, null, 2))
    setPrincipalsError(null)
  }

  const handleAddRow = () => {
    const newRow: Record<string, any> = {}
    for (let i = 1; i <= 10; i++) {
      newRow[`data${i}`] = ''
    }
    const updated = [...parsedPrincipals, newRow]
    setPrincipalsJson(JSON.stringify(updated, null, 2))
    setPrincipalsError(null)
  }

  const handleDeleteRow = (index: number) => {
    const updated = parsedPrincipals.filter((_, idx) => idx !== index)
    setPrincipalsJson(JSON.stringify(updated, null, 2))
    setPrincipalsError(null)
  }

  // Reset drafts to current config values when opened
  useEffect(() => {
    if (isOpen) {
      setMode(config.mode)
      setAssignmentId(config.assignmentId)
      setLocale(config.locale)
      setFormMode(config.formMode)
      setInitialMode(config.initialMode)
      setRemarkJson(config.remarkJson)
      setPrincipalsJson(config.principalsJson)
      setUserJson(config.userJson)

      try {
        const parsed = JSON.parse(config.userJson)
        setUserNameField(parsed.name || '')
        setUserUsernameField(parsed.username || '')
        setUserRoleField(parsed.role || '')
      } catch (e) {
        setUserNameField('')
        setUserUsernameField('')
        setUserRoleField('')
      }

      setRemarkError(null)
      setPrincipalsError(null)
      setUserError(null)
      setIsSaved(false)
    }
  }, [isOpen, config])

  if (!isOpen) return null

  // Validate JSON fields
  const validateJson = (value: string, type: 'object' | 'array'): { isValid: boolean; error: string | null } => {
    try {
      const parsed = JSON.parse(value)
      if (type === 'object') {
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          return { isValid: false, error: 'Must be a valid JSON object' }
        }
      } else if (type === 'array') {
        if (!Array.isArray(parsed)) {
          return { isValid: false, error: 'Must be a valid JSON array' }
        }
      }
      return { isValid: true, error: null }
    } catch (e: any) {
      return { isValid: false, error: e.message }
    }
  }

  // Live Parsing for UI Preview (e.g. displaying username / role live)
  let parsedUser: { name?: string; username?: string; role?: string; email?: string } = {}
  try {
    parsedUser = JSON.parse(userJson)
  } catch (e) {
    // Ignore error, fallback to empty
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate JSON before saving
    const userVal = validateJson(userJson, 'object')
    const remarkVal = validateJson(remarkJson, 'object')
    const principalsVal = validateJson(principalsJson, 'array')

    setUserError(userVal.error)
    setRemarkError(remarkVal.error)
    setPrincipalsError(principalsVal.error)

    if (!userVal.isValid) {
      setActiveTab('user')
      return
    }
    if (!remarkVal.isValid || !principalsVal.isValid) {
      setActiveTab('remarks')
      return
    }

    onSave({
      mode,
      assignmentId,
      locale,
      formMode,
      initialMode,
      remarkJson,
      principalsJson,
      userJson
    })

    setIsSaved(true)
    setTimeout(() => {
      setIsSaved(false)
      onClose()
    }, 800)
  }

  const handleFormatJson = (
    value: string, 
    setValue: (val: string) => void, 
    setError: (err: string | null) => void,
    type: 'object' | 'array'
  ) => {
    try {
      const parsed = JSON.parse(value)
      if (type === 'object' && (typeof parsed !== 'object' || Array.isArray(parsed))) {
        throw new Error('Must be a JSON object')
      }
      if (type === 'array' && !Array.isArray(parsed)) {
        throw new Error('Must be a JSON array')
      }
      setValue(JSON.stringify(parsed, null, 2))
      setError(null)
    } catch (e: any) {
      setError(e.message)
    }
  }

  const handleUserFieldChange = (fields: { name?: string; username?: string; role?: string }) => {
    const nextName = fields.name !== undefined ? fields.name : userNameField
    const nextUsername = fields.username !== undefined ? fields.username : userUsernameField
    const nextRole = fields.role !== undefined ? fields.role : userRoleField

    if (fields.name !== undefined) setUserNameField(fields.name)
    if (fields.username !== undefined) setUserUsernameField(fields.username)
    if (fields.role !== undefined) setUserRoleField(fields.role)

    let parsed: Record<string, any> = {}
    try {
      parsed = JSON.parse(userJson)
    } catch (e) {
      // Ignore
    }

    const updatedUser = {
      ...parsed,
      name: nextName,
      username: nextUsername,
      role: nextRole
    }

    setUserJson(JSON.stringify(updatedUser, null, 2))
    setUserError(null)
  }

  const handleRemarkChange = (val: string | undefined) => {
    if (val === undefined) return
    setRemarkJson(val)
    const result = validateJson(val, 'object')
    setRemarkError(result.error)
  }

  const handlePrincipalsChange = (val: string | undefined) => {
    if (val === undefined) return
    setPrincipalsJson(val)
    const result = validateJson(val, 'array')
    setPrincipalsError(result.error)
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-card/95 border border-border/80 shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50 bg-muted/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Engine Configuration</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Customize properties and environments for Fasih Form</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-muted/80 rounded-full transition-colors border border-transparent hover:border-border/30 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Headers */}
        <div className="flex px-6 border-b border-border/40 bg-muted/5 shrink-0">
          <button
            onClick={() => setActiveTab('params')}
            className={cn(
              "px-4 py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2",
              activeTab === 'params' 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Sliders className="w-3.5 h-3.5" />
            Basic Parameters
          </button>
          <button
            onClick={() => setActiveTab('user')}
            className={cn(
              "px-4 py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 relative",
              activeTab === 'user' 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <User className="w-3.5 h-3.5" />
            User Context
            {userError && <span className="absolute top-2.5 right-1.5 w-2 h-2 rounded-full bg-destructive animate-ping" />}
          </button>
          <button
            onClick={() => setActiveTab('remarks')}
            className={cn(
              "px-4 py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 relative",
              activeTab === 'remarks' 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Database className="w-3.5 h-3.5" />
            Remarks & Principals
            {(remarkError || principalsError) && <span className="absolute top-2.5 right-1.5 w-2 h-2 rounded-full bg-destructive animate-ping" />}
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 flex flex-col min-h-0 custom-scrollbar">
          
          {/* Tab 1: Basic Parameters */}
          {activeTab === 'params' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              <div className="grid grid-cols-2 gap-4">
                {/* Mode */}
                <div className="space-y-1.5">
                  <label htmlFor="modal-mode" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Form Mode Type (mode)
                  </label>
                  <input
                    id="modal-mode"
                    value={mode}
                    onChange={e => setMode(e.target.value)}
                    className="w-full text-xs font-mono rounded-xl border border-border/80 bg-background/50 px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
                    placeholder="CAPI"
                  />
                  {/* Preset Badges */}
                  <div className="flex gap-1.5 mt-1.5">
                    {['CAPI', 'CATI', 'CAWI'].map(item => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setMode(item)}
                        className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-bold border transition-colors",
                          mode === item 
                            ? "bg-primary/10 text-primary border-primary/20" 
                            : "bg-muted/40 text-muted-foreground hover:bg-muted border-transparent"
                        )}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Assignment ID */}
                <div className="space-y-1.5">
                  <label htmlFor="modal-assignmentId" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Assignment ID
                  </label>
                  <input
                    id="modal-assignmentId"
                    value={assignmentId}
                    onChange={e => setAssignmentId(e.target.value)}
                    className="w-full text-xs font-mono rounded-xl border border-border/80 bg-background/50 px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
                    placeholder="assignment-id"
                  />
                </div>
              </div>

              <hr className="border-border/40" />

              <div className="grid grid-cols-3 gap-4">
                {/* Locale */}
                <div className="space-y-1.5">
                  <label htmlFor="modal-locale" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Locale (locale)
                  </label>
                  <input
                    id="modal-locale"
                    value={locale}
                    onChange={e => setLocale(e.target.value)}
                    className="w-full text-xs font-mono rounded-xl border border-border/80 bg-background/50 px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
                    placeholder="id"
                  />
                  <div className="flex gap-1.5 mt-1.5">
                    {[['id', '🇮🇩 Indo'], ['en', '🇺🇸 English']].map(([code, name]) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setLocale(code)}
                        className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-bold border transition-colors",
                          locale === code 
                            ? "bg-primary/10 text-primary border-primary/20" 
                            : "bg-muted/40 text-muted-foreground hover:bg-muted border-transparent"
                        )}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* formMode */}
                <div className="space-y-1.5">
                  <label htmlFor="modal-formMode" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Form Mode
                  </label>
                  <select
                    id="modal-formMode"
                    value={formMode}
                    onChange={e => setFormMode(e.target.value)}
                    className="w-full text-xs rounded-xl border border-border/80 bg-background/50 px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
                  >
                    <option value="1">1 - OPEN</option>
                    <option value="2">2 - REVIEW</option>
                    <option value="3">3 - CLOSED</option>
                    <option value="4">4 - EDIT</option>
                  </select>
                </div>

                {/* initialMode */}
                <div className="space-y-1.5">
                  <label htmlFor="modal-initialMode" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Initial Mode
                  </label>
                  <select
                    id="modal-initialMode"
                    value={initialMode}
                    onChange={e => setInitialMode(e.target.value)}
                    className="w-full text-xs rounded-xl border border-border/80 bg-background/50 px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
                  >
                    <option value="1">1 - New</option>
                    <option value="2">2 - Prelist</option>
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/20 border border-border/30 flex items-start gap-3 mt-4">
                <Globe className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold">Configuration Sync Notice</h4>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    These parameters determine the basic context under which the Fasih Form engine initializes. Changing modes changes validation scripts and rendering paths.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: User Context */}
          {activeTab === 'user' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex gap-4 items-center p-4 rounded-xl bg-muted/10 border border-border/30 shrink-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-violet-600 flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0">
                  {parsedUser.name ? parsedUser.name.substring(0, 2).toUpperCase() : (parsedUser.username ? parsedUser.username.substring(0, 2).toUpperCase() : 'U')}
                </div>
                <div>
                  <h3 className="text-xs font-bold">{parsedUser.name || parsedUser.username || 'Anonymous Tester'}</h3>
                  <p className="text-[10px] text-muted-foreground">{parsedUser.role || 'No Role Assigned'}</p>
                  {parsedUser.email && <p className="text-[9px] text-muted-foreground font-mono mt-0.5">{parsedUser.email}</p>}
                </div>
                <div className="ml-auto text-[10px] text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full font-semibold">
                  Live Preview
                </div>
              </div>

              <div className="space-y-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label htmlFor="modal-user-name" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Full Name (name)
                  </label>
                  <input
                    id="modal-user-name"
                    value={userNameField}
                    onChange={e => handleUserFieldChange({ name: e.target.value })}
                    className="w-full text-xs rounded-xl border border-border/80 bg-background/50 px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all text-foreground"
                    placeholder="E.g., John Doe"
                  />
                </div>

                {/* Username */}
                <div className="space-y-1.5">
                  <label htmlFor="modal-user-username" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Username
                  </label>
                  <input
                    id="modal-user-username"
                    value={userUsernameField}
                    onChange={e => handleUserFieldChange({ username: e.target.value })}
                    className="w-full text-xs rounded-xl border border-border/80 bg-background/50 px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all text-foreground"
                    placeholder="E.g., johndoe"
                  />
                </div>

                {/* Role */}
                <div className="space-y-1.5">
                  <label htmlFor="modal-user-role" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Role
                  </label>
                  <input
                    id="modal-user-role"
                    value={userRoleField}
                    onChange={e => handleUserFieldChange({ role: e.target.value })}
                    className="w-full text-xs rounded-xl border border-border/80 bg-background/50 px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all text-foreground"
                    placeholder="E.g., Developer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Remarks & Principals */}
          {activeTab === 'remarks' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Remark JSON */}
              <div className="space-y-1.5 flex flex-col h-[200px] shrink-0">
                <div className="flex justify-between items-center shrink-0">
                  <label htmlFor="modal-remark" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <FileCode className="w-3.5 h-3.5" />
                    Remark Object
                  </label>
                  <button
                    type="button"
                    onClick={() => handleFormatJson(remarkJson, setRemarkJson, setRemarkError, 'object')}
                    className="text-[10px] text-primary font-bold hover:underline"
                  >
                    Format
                  </button>
                </div>
                <div className="relative flex-1 border border-border/80 rounded-xl overflow-hidden bg-zinc-950">
                  <Editor
                    height="100%"
                    theme="vs-dark"
                    language="json"
                    value={remarkJson}
                    onChange={handleRemarkChange}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 11,
                      wordWrap: 'on',
                      formatOnPaste: true,
                      scrollBeyondLastLine: false,
                      smoothScrolling: true,
                    }}
                  />
                </div>
                {remarkError && (
                  <div className="mt-1.5 p-2 rounded-lg bg-destructive/10 text-destructive text-[10px] flex items-center gap-1.5 shrink-0">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-mono text-[9px] truncate">{remarkError}</span>
                  </div>
                )}
              </div>

              {/* Principals Array */}
              <div className="space-y-1.5 flex flex-col h-[340px] shrink-0">
                <div className="flex justify-between items-center shrink-0">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <FileCode className="w-3.5 h-3.5" />
                    Principals Array
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex bg-muted/60 p-0.5 rounded-lg border border-border/50 text-[9px] font-bold">
                      <button
                        type="button"
                        onClick={() => setPrincipalsViewMode('table')}
                        className={cn(
                          "px-2.5 py-1 rounded-md transition-all",
                          principalsViewMode === 'table' ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Table View
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrincipalsViewMode('json')}
                        className={cn(
                          "px-2.5 py-1 rounded-md transition-all",
                          principalsViewMode === 'json' ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Raw JSON
                      </button>
                    </div>
                    {principalsViewMode === 'json' && (
                      <button
                        type="button"
                        onClick={() => handleFormatJson(principalsJson, setPrincipalsJson, setPrincipalsError, 'array')}
                        className="text-[10px] text-primary font-bold hover:underline"
                      >
                        Format
                      </button>
                    )}
                  </div>
                </div>

                <div className="relative h-[290px] border border-border/80 rounded-xl overflow-hidden bg-zinc-950 flex flex-col shrink-0">
                  {principalsViewMode === 'table' ? (
                    <div className="flex flex-col h-[288px] relative shrink-0">
                      {!isPrincipalsParsable && (
                        <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center z-10 animate-in fade-in duration-200">
                          <AlertCircle className="w-8 h-8 text-destructive mb-2" />
                          <h4 className="text-xs font-bold text-destructive">Invalid JSON Structure</h4>
                          <p className="text-[10px] text-muted-foreground max-w-xs mt-1">
                            The table view requires a valid JSON array of objects. Please correct any syntax errors in Raw JSON mode first.
                          </p>
                        </div>
                      )}
                      <div className="h-[228px] overflow-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse text-[10px] min-w-[1100px]">
                          <thead>
                            <tr className="bg-muted/30 border-b border-border/40 text-muted-foreground font-black uppercase tracking-widest text-[8px] sticky top-0 z-10 bg-zinc-900">
                              {Array.from({ length: 10 }).map((_, i) => (
                                <th key={i} className="py-2 px-3 min-w-[100px]">Data {i + 1}</th>
                              ))}
                              <th className="py-2 px-2 text-center w-12 sticky right-0 bg-zinc-900 z-20 border-l border-border/20 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.5)]">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/20 font-mono text-[9px]">
                            {parsedPrincipals.map((p, idx) => (
                              <tr key={idx} className="hover:bg-muted/10 transition-colors">
                                {Array.from({ length: 10 }).map((_, i) => {
                                  const fieldName = `data${i + 1}`
                                  return (
                                    <td key={i} className="py-1 px-2 min-w-[100px]">
                                      <input
                                        type="text"
                                        value={p[fieldName] !== undefined ? String(p[fieldName]) : ''}
                                        onChange={(e) => {
                                          let v: any = e.target.value
                                          if (v === 'true') v = true
                                          else if (v === 'false') v = false
                                          else if (v !== '' && !isNaN(Number(v))) v = Number(v)
                                          else if (v.trim().startsWith('{') || v.trim().startsWith('[')) {
                                            try {
                                              v = JSON.parse(v)
                                            } catch (err) {
                                              // Fallback to string
                                            }
                                          }
                                          handleTableChange(idx, fieldName, v)
                                        }}
                                        className="w-full bg-transparent border-0 text-foreground text-xs outline-none focus:ring-1 focus:ring-primary/40 rounded px-1.5 py-1 text-zinc-100"
                                        placeholder={`Value ${i + 1}`}
                                      />
                                    </td>
                                  )
                                })}
                                <td className="py-1 px-2 text-center sticky right-0 bg-zinc-950 z-10 border-l border-border/20 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.5)]">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRow(idx)}
                                    className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-all"
                                    title="Delete Row"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {parsedPrincipals.length === 0 && (
                              <tr>
                                <td colSpan={11} className="py-8 text-center text-muted-foreground font-sans text-xs">
                                  No active entries. Click the button below to add one.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div className="h-[60px] border-t border-border/30 bg-muted/10 flex items-center justify-end px-4 shrink-0">
                        <button
                          type="button"
                          onClick={handleAddRow}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-[10px] font-bold transition-all active:scale-95 animate-in fade-in duration-300"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Principal Entry
                        </button>
                      </div>
                    </div>
                  ) : (
                    <Editor
                      height="100%"
                      theme="vs-dark"
                      language="json"
                      value={principalsJson}
                      onChange={handlePrincipalsChange}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 11,
                        wordWrap: 'on',
                        formatOnPaste: true,
                        scrollBeyondLastLine: false,
                        smoothScrolling: true,
                      }}
                    />
                  )}
                </div>
                {principalsError && (
                  <div className="mt-1.5 p-2 rounded-lg bg-destructive/10 text-destructive text-[10px] flex items-center gap-1.5 shrink-0">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-mono text-[9px] truncate">{principalsError}</span>
                  </div>
                )}
              </div>
            </div>
          )}

        </form>

        {/* Footer Actions */}
        <div className="p-6 border-t border-border/50 bg-muted/20 shrink-0 flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-muted-foreground" />
            Validate before saving
          </p>

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold border border-border/80 bg-background hover:bg-muted rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!!(userError || remarkError || principalsError)}
              onClick={handleSave}
              className={cn(
                "px-5 py-2 text-xs font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 select-none",
                isSaved
                  ? "bg-green-500 text-white shadow-green-500/20"
                  : "bg-primary text-primary-foreground shadow-primary/20 hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]"
              )}
            >
              {isSaved ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Save Configurations
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
