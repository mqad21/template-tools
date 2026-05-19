import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useStore } from '../store/useStore'
import { Eye, Loader2, AlertCircle, RefreshCw, Save, Check, Cpu, Settings2, X } from 'lucide-react'
import { cn } from '../lib/utils'
import { getEngine, createBlobUrls } from '../lib/engineStorage'

const STATIC_JS_URL = "/engine/fasih-form.js";
const STATIC_CSS_URL = "/engine/fasih-form.css";

declare global {
  interface Window {
    FasihForm?: any;
    lib?: any;
    fasihFormInstance?: any;
  }
}

export const FormPreview = () => {
  const {
    template,
    validation,
    preset,
    response,
    previewMode,
    selectedEngineVersion,
  } = useStore()

  const [loading, setLoading] = useState(true)
  const [isRendering, setIsRendering] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<any>(null)
  const isEngineSaveRef = useRef(false)
  const innerTimerRef = useRef<any>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success'>('idle')

  // Form Engine Config
  const [showConfig, setShowConfig] = useState(false)

  // --- simple fields ---
  const [cfgMode, setCfgMode] = useState('CAPI')
  const [cfgAssignmentId, setCfgAssignmentId] = useState('preview')
  const [cfgFormMode, setCfgFormMode] = useState('1')
  const [cfgInitialMode, setCfgInitialMode] = useState('2')
  const [cfgLocale, setCfgLocale] = useState('id')

  // --- JSON fields ---
  const [remarkJson, setRemarkJson] = useState('{}')
  const [principalsJson, setPrincipalsJson] = useState('[]')
  const [userJson, setUserJson] = useState(JSON.stringify({ username: 'tester', role: 'Developer' }, null, 2))
  const [remarkError, setRemarkError] = useState<string | null>(null)
  const [principalsError, setPrincipalsError] = useState<string | null>(null)
  const [userError, setUserError] = useState<string | null>(null)

  const parseRemarkSafe = () => {
    try {
      const parsed = JSON.parse(remarkJson)
      if (typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Must be a JSON object')
      setRemarkError(null)
      return parsed
    } catch (e: any) {
      setRemarkError(e.message)
      return {}
    }
  }

  const parsePrincipalsSafe = () => {
    try {
      const parsed = JSON.parse(principalsJson)
      if (!Array.isArray(parsed)) throw new Error('Must be a JSON array')
      setPrincipalsError(null)
      return parsed
    } catch (e: any) {
      setPrincipalsError(e.message)
      return []
    }
  }

  const parseUserSafe = () => {
    try {
      const parsed = JSON.parse(userJson)
      if (typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Must be a JSON object')
      setUserError(null)
      return parsed
    } catch (e: any) {
      setUserError(e.message)
      return { username: 'tester', role: 'Developer' }
    }
  }
  // Track active Blob URLs so we can revoke them on cleanup
  const blobUrlsRef = useRef<{ jsUrl: string; cssUrl: string } | null>(null)

  const handleReload = () => {
    setError(null)
    setLoading(true)
    setReady(false)
    setReloadKey(prev => prev + 1)
  }

  const setPreviewMode = (mode: 'mobile' | 'desktop') => {
    useStore.getState().setPreviewMode(mode)
  }

  // 1. Resource loading & Engine polling
  useEffect(() => {
    let mounted = true
    // Revoke old blob URLs if any
    if (blobUrlsRef.current) {
      URL.revokeObjectURL(blobUrlsRef.current.jsUrl)
      URL.revokeObjectURL(blobUrlsRef.current.cssUrl)
      blobUrlsRef.current = null
    }

    const loadResources = async () => {
      try {
        let jsUrl = STATIC_JS_URL
        let cssUrl = STATIC_CSS_URL

        // If a local version is selected, try to load it from IndexedDB
        if (selectedEngineVersion) {
          const engine = await getEngine(selectedEngineVersion)
          if (engine) {
            const urls = createBlobUrls(engine)
            blobUrlsRef.current = urls
            jsUrl = urls.jsUrl
            cssUrl = urls.cssUrl
            console.log(`[Engine] Loading v${selectedEngineVersion} from local cache (blob URL)`)
          } else {
            console.warn(`[Engine] v${selectedEngineVersion} not found in local cache, falling back to static.`)
          }
        }

        // Remove any previous engine scripts/styles before loading new ones
        document.querySelectorAll('script[data-fasih-engine]').forEach(el => el.remove())
        document.querySelectorAll('link[data-fasih-engine]').forEach(el => el.remove())
        // Remove old window globals so new script can register them
        delete window.FasihForm
        delete window.lib

        // Load Script
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = jsUrl;
          s.async = true;
          s.setAttribute('data-fasih-engine', 'true')
          s.onload = () => resolve();
          s.onerror = () => reject(new Error(`Failed to load FasihForm script from: ${jsUrl}`));
          document.head.appendChild(s);
        });

        // Load Style
        const l = document.createElement("link");
        l.rel = "stylesheet";
        l.href = cssUrl;
        l.setAttribute('data-fasih-engine', 'true')
        document.head.appendChild(l);

        // Poll for FasihForm or lib on window
        let attempts = 0;
        const checkLibrary = () => {
          if (!mounted) return;
          const engine = window.FasihForm || window.lib;

          if (typeof engine === "function" || (engine && (typeof engine.init === 'function' || typeof engine.render === 'function'))) {
            setLoading(false);
            setReady(true);
          } else if (attempts < 50) {
            attempts++;
            setTimeout(checkLibrary, 200);
          } else {
            setError("FasihForm library not found. Please ensure engine files are correctly placed in /public/engine/");
            setLoading(false);
          }
        };

        checkLibrary();
      } catch (err: any) {
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    loadResources()
    return () => {
      mounted = false
    }
  }, [selectedEngineVersion, reloadKey])

  // 2. Sophisticated Render Logic (Double-buffering & Event Handlers)
  useEffect(() => {
    let mounted = true;
    if (!ready || !template || !containerRef.current) return

    // Prevent re-render loop if update came from engine itself
    if (isEngineSaveRef.current) {
      isEngineSaveRef.current = false;
      return;
    }

    const engine = window.FasihForm || window.lib;

    // Debounce re-render to avoid flicker
    const timer = setTimeout(() => {
      if (!mounted) return;
      setIsRendering(true);

      // Inner timer to allow isRendering state to paint
      innerTimerRef.current = setTimeout(() => {
        if (!mounted) {
          setIsRendering(false);
          return;
        }

        try {
          // 1. Cleanup previous instance
          if (instanceRef.current) {
            try {
              if (typeof instanceRef.current.destroy === 'function') {
                instanceRef.current.destroy();
              }
            } catch (e) {
              console.warn("Error destroying previous form instance:", e);
            }
            instanceRef.current = null;
          }

          // 2. Create unique off-screen root for swapping
          const uniqueId = `ff-inner-${Date.now()}`;
          const newRoot = document.createElement('div');
          newRoot.id = uniqueId;
          newRoot.className = 'fasih-form-wrapper';

          // Initial hidden state for smooth swap
          newRoot.style.width = '100%';
          newRoot.style.height = '100%';
          newRoot.style.minHeight = '100%';
          newRoot.style.opacity = '0';
          newRoot.style.transition = 'opacity 0.3s ease';

          if (containerRef.current) {
            containerRef.current.appendChild(newRoot);
          }

          const deepClone = (obj: any) => {
            if (!obj) return null;
            try {
              if (typeof structuredClone === 'function') return structuredClone(obj);
            } catch (e) {
              console.warn("structuredClone failed, falling back to JSON:", e);
            }
            return JSON.parse(JSON.stringify(obj));
          };

          const options = {
            mode: cfgMode || 'CAPI',
            assignmentId: cfgAssignmentId || 'preview',
            template: deepClone(template),
            validation: validation ? deepClone(validation) : { testFunctions: [] },
            preset: preset ? deepClone(preset) : { predata: [] },
            response: response ? deepClone(response) : { answers: [] },
            remark: parseRemarkSafe(),
            principals: parsePrincipalsSafe(),
            formMode: Number(cfgFormMode) || 1,
            initialMode: Number(cfgInitialMode) || 2,
            user: parseUserSafe(),
            locale: cfgLocale || 'id',
          };

          const FF = typeof engine === 'function' ? engine : (engine && engine.render ? engine : null);
          if (!FF) throw new Error("FasihForm constructor or render function not found");

          // Target the new unique root
          instanceRef.current = FF(`#${uniqueId}`, options);

          // Register Event Handlers
          instanceRef.current.event.on('save', async (data: any) => {
            isEngineSaveRef.current = true;
            try {
              useStore.getState().setResponse(data.response);
              setSaveStatus('success');
              setTimeout(() => setSaveStatus('idle'), 3000);
            } catch (e) {
              console.error("Failed to persist save:", e);
            }
          });

          instanceRef.current.event.on('lookup-request', async (config: any, params: any) => {
            try {
              const handleJSON = (str: any) => typeof str !== "string" ? str : JSON.parse(str);
              const cfg = handleJSON(config);
              const pms = handleJSON(params);

              const proxyPath = `/lookup/api/v1/collections/${cfg.id}/filter`;
              const searchParams = new URLSearchParams();

              if (Array.isArray(pms)) {
                for (const p of pms) {
                  searchParams.append("keys", p.key);
                  searchParams.append("values", p.value?.toString() ?? "");
                }
              }

              searchParams.append("version", cfg.version.toString());

              const { bearerToken } = useStore.getState();
              const res = await fetch(`/api/proxy${proxyPath}?${searchParams.toString()}`, {
                headers: bearerToken ? { 'Authorization': bearerToken.startsWith('Bearer ') ? bearerToken : `Bearer ${bearerToken}` } : {}
              });
              const data = await res.json();

              return data.data;
            } catch (e: any) {
              console.error("Failed to get lookup data:", e);
              throw e;
            }
          });

          instanceRef.current.event.on('external-data-fetch', async (type: string, payload: any) => {
            try {
              const { bearerToken } = useStore.getState();
              const res = await fetch(`/api/proxy/connector/api/hit/${type}`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(bearerToken ? { 'Authorization': bearerToken.startsWith('Bearer ') ? bearerToken : `Bearer ${bearerToken}` } : {})
                },
                body: JSON.stringify({
                  assignmentId: "477ef19e-e012-4ade-ba04-3a4963c3a9c5",
                  queryParameter: null,
                  pathParameter: null,
                  body: payload
                }),
              });
              return await res.json();
            } catch (e: any) {
              console.error("Failed to fetch external data:", e);
              return null;
            }
          });

          instanceRef.current.render();

          // Expose to window for the user's trigger logic
          window.fasihFormInstance = instanceRef.current;

          // Seamless Swap
          if (containerRef.current && mounted) {
            Array.from(containerRef.current.children).forEach(child => {
              if (child !== newRoot) {
                containerRef.current?.removeChild(child);
              }
            });
            newRoot.style.opacity = '1';
          }

          setError(null);
        } catch (err: any) {
          console.error("FF Render Error:", err);
          setError(`Render Error: ${err.message}`);
        } finally {
          setIsRendering(false);
        }
      }, 50);
    }, 150);

    return () => {
      mounted = false;
      clearTimeout(timer);
      if (innerTimerRef.current) clearTimeout(innerTimerRef.current);
    }
  }, [template, validation, preset, response, ready, reloadKey, previewMode, remarkJson, principalsJson, userJson, cfgMode, cfgAssignmentId, cfgFormMode, cfgInitialMode, cfgLocale])

  return (
    <div className="w-full flex flex-col bg-background border-l">
      {/* Header */}
      <div className="p-4 border-b bg-background flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold leading-none">Live Preview</h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1">
                <div className={cn("w-1.5 h-1.5 rounded-full", ready ? "bg-green-500" : "bg-red-500 animate-pulse")} />
                <span className="text-[8px] text-muted-foreground uppercase">Engine</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={cn("w-1.5 h-1.5 rounded-full", isRendering ? "bg-amber-500 animate-pulse" : "bg-green-500")} />
                <span className="text-[8px] text-muted-foreground uppercase">{isRendering ? 'Rendering' : 'Ready'}</span>
              </div>
              {/* Engine version indicator */}
              {selectedEngineVersion ? (
                <span className="text-[8px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-mono">
                  v{selectedEngineVersion}
                </span>
              ) : (
                <span className="text-[8px] text-muted-foreground opacity-60 font-mono">built-in</span>
              )}

            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center bg-muted/50 p-1 rounded-xl border border-border/50">
            <button
              onClick={() => setPreviewMode('mobile')}
              className={cn(
                "px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all",
                previewMode === 'mobile'
                  ? "bg-background shadow-sm text-primary ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              MOBILE
            </button>
            <button
              onClick={() => setPreviewMode('desktop')}
              className={cn(
                "px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all",
                previewMode === 'desktop'
                  ? "bg-background shadow-sm text-primary ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              DESKTOP
            </button>
          </div>

          <div className="flex items-center gap-2 border-l pl-4 border-border/50">
            {isRendering && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
            <button
              onClick={() => setShowConfig(v => !v)}
              className={cn(
                "p-2 rounded-xl transition-colors",
                showConfig
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground"
              )}
              title="Engine Config"
            >
              <Settings2 className="w-4 h-4" />
            </button>
            <button onClick={handleReload} className="p-2 hover:bg-muted rounded-xl text-muted-foreground transition-colors" title="Force Reload">
              <RefreshCw className={cn("w-4 h-4", isRendering && "animate-spin")} />
            </button>
          </div>
        </div>
      </div>

      {/* Engine Config Panel */}
      {showConfig && (
        <div className="border-b bg-muted/5 px-4 py-3 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Settings2 className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-bold text-foreground">Engine Config</span>
              <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full font-mono">auto-applies on change</span>
            </div>
            <button
              onClick={() => setShowConfig(false)}
              className="p-1 hover:bg-muted rounded-lg text-muted-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {/* Row 1 — simple string/number fields */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            {/* mode */}
            <div className="flex flex-col gap-1">
              <label htmlFor="ec-mode" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                mode <span className="font-normal normal-case opacity-60">string</span>
              </label>
              <input
                id="ec-mode"
                value={cfgMode}
                onChange={e => setCfgMode(e.target.value)}
                className="w-full text-xs font-mono rounded-lg border border-border/50 bg-background px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary/40 transition-all"
                placeholder="CAPI"
              />
            </div>

            {/* assignmentId */}
            <div className="flex flex-col gap-1">
              <label htmlFor="ec-assignmentId" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                assignmentId <span className="font-normal normal-case opacity-60">string</span>
              </label>
              <input
                id="ec-assignmentId"
                value={cfgAssignmentId}
                onChange={e => setCfgAssignmentId(e.target.value)}
                className="w-full text-xs font-mono rounded-lg border border-border/50 bg-background px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary/40 transition-all"
                placeholder="preview"
              />
            </div>

            {/* locale */}
            <div className="flex flex-col gap-1">
              <label htmlFor="ec-locale" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                locale <span className="font-normal normal-case opacity-60">string</span>
              </label>
              <input
                id="ec-locale"
                value={cfgLocale}
                onChange={e => setCfgLocale(e.target.value)}
                className="w-full text-xs font-mono rounded-lg border border-border/50 bg-background px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary/40 transition-all"
                placeholder="id"
              />
            </div>

            {/* formMode */}
            <div className="flex flex-col gap-1">
              <label htmlFor="ec-formMode" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                formMode <span className="font-normal normal-case opacity-60">number</span>
              </label>
              <input
                id="ec-formMode"
                type="number"
                value={cfgFormMode}
                onChange={e => setCfgFormMode(e.target.value)}
                className="w-full text-xs font-mono rounded-lg border border-border/50 bg-background px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary/40 transition-all"
                placeholder="1"
              />
            </div>

            {/* initialMode */}
            <div className="flex flex-col gap-1">
              <label htmlFor="ec-initialMode" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                initialMode <span className="font-normal normal-case opacity-60">number</span>
              </label>
              <input
                id="ec-initialMode"
                type="number"
                value={cfgInitialMode}
                onChange={e => setCfgInitialMode(e.target.value)}
                className="w-full text-xs font-mono rounded-lg border border-border/50 bg-background px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary/40 transition-all"
                placeholder="2"
              />
            </div>
          </div>

          {/* Row 2 — JSON fields */}
          <div className="grid grid-cols-3 gap-3">
            {/* user */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                user <span className="font-normal normal-case opacity-60">object</span>
              </label>
              <textarea
                id="ec-user"
                value={userJson}
                onChange={e => {
                  setUserJson(e.target.value)
                  try {
                    const parsed = JSON.parse(e.target.value)
                    if (typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Must be a JSON object')
                    setUserError(null)
                  } catch (err: any) {
                    setUserError(err.message)
                  }
                }}
                rows={5}
                spellCheck={false}
                className={cn(
                  "w-full text-xs font-mono rounded-lg border bg-background px-2.5 py-2 resize-y outline-none focus:ring-1 transition-all",
                  userError
                    ? "border-destructive focus:ring-destructive/50 text-destructive"
                    : "border-border/50 focus:ring-primary/40"
                )}
                placeholder='{"username": "tester", "role": "Developer"}'
              />
              {userError && (
                <p className="text-[9px] text-destructive flex items-center gap-1">
                  <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                  {userError}
                </p>
              )}
            </div>

            {/* remark */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                remark <span className="font-normal normal-case opacity-60">object</span>
              </label>
              <textarea
                id="ec-remark"
                value={remarkJson}
                onChange={e => {
                  setRemarkJson(e.target.value)
                  try {
                    const parsed = JSON.parse(e.target.value)
                    if (typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Must be a JSON object')
                    setRemarkError(null)
                  } catch (err: any) {
                    setRemarkError(err.message)
                  }
                }}
                rows={5}
                spellCheck={false}
                className={cn(
                  "w-full text-xs font-mono rounded-lg border bg-background px-2.5 py-2 resize-y outline-none focus:ring-1 transition-all",
                  remarkError
                    ? "border-destructive focus:ring-destructive/50 text-destructive"
                    : "border-border/50 focus:ring-primary/40"
                )}
                placeholder="{}"
              />
              {remarkError && (
                <p className="text-[9px] text-destructive flex items-center gap-1">
                  <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                  {remarkError}
                </p>
              )}
            </div>

            {/* principals */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                principals <span className="font-normal normal-case opacity-60">array</span>
              </label>
              <textarea
                id="ec-principals"
                value={principalsJson}
                onChange={e => {
                  setPrincipalsJson(e.target.value)
                  try {
                    const parsed = JSON.parse(e.target.value)
                    if (!Array.isArray(parsed)) throw new Error('Must be a JSON array')
                    setPrincipalsError(null)
                  } catch (err: any) {
                    setPrincipalsError(err.message)
                  }
                }}
                rows={5}
                spellCheck={false}
                className={cn(
                  "w-full text-xs font-mono rounded-lg border bg-background px-2.5 py-2 resize-y outline-none focus:ring-1 transition-all",
                  principalsError
                    ? "border-destructive focus:ring-destructive/50 text-destructive"
                    : "border-border/50 focus:ring-primary/40"
                )}
                placeholder="[]"
              />
              {principalsError && (
                <p className="text-[9px] text-destructive flex items-center gap-1">
                  <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                  {principalsError}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-auto bg-muted/10 p-6 relative flex flex-col items-center custom-scrollbar">
        {loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-sm font-medium text-muted-foreground animate-pulse">Initializing Engine...</p>
          </div>
        )}

        {/* Floating Action Button - Save */}
        {ready && !loading && (
          <button
            onClick={() => {
              const instance = instanceRef.current || window.fasihFormInstance;
              if (instance) {
                // Try multiple ways to emit just in case the API is slightly different
                const ref = instance.ref || instance;
                if (typeof ref.emit === 'function') {
                  ref.emit('trigger-save');
                } else if (instance.event?.emit) {
                  instance.event.emit('trigger-save');
                }
                console.log('Triggered save on instance:', instance);
              } else {
                console.warn('Fasih Form instance not found for saving');
              }
            }}
            className={cn(
              "fixed bottom-10 right-[88px] w-12 h-12 rounded-full shadow-2xl transition-all active:scale-90 z-50 group",
              "grid place-items-center p-0",
              saveStatus === 'success'
                ? "bg-green-500 text-white shadow-green-500/40"
                : "bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90"
            )}
            title="Trigger Save"
          >
            {saveStatus === 'success' ? (
              <Check className="w-6 h-6 animate-in zoom-in duration-300" />
            ) : (
              <Save className="w-6 h-6 group-hover:scale-110 transition-transform" />
            )}

            {/* Tooltip/Feedback */}
            <span className={cn(
              "absolute bottom-full mb-3 right-0 px-2 py-1 text-[10px] font-bold rounded shadow-xl border transition-all whitespace-nowrap pointer-events-none",
              saveStatus === 'success'
                ? "bg-green-500 text-white border-green-400 opacity-100 translate-y-0"
                : "bg-zinc-900 text-white border-zinc-800 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0"
            )}>
              {saveStatus === 'success' ? 'SAVED SUCCESSFULLY' : 'TRIGGER SAVE'}
            </span>

            {saveStatus === 'idle' && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-foreground/50 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-foreground"></span>
              </span>
            )}
          </button>
        )}

        {error && (
          <div className="absolute inset-0 z-30 bg-destructive/5 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-destructive mb-2">Preview Error</h3>
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">{error}</p>
            <button
              onClick={handleReload}
              className="mt-6 px-6 py-2 bg-destructive text-destructive-foreground rounded-xl font-bold text-xs hover:opacity-90 transition-all"
            >
              Try Again
            </button>
          </div>
        )}

        <div
          className={cn(
            "transition-all duration-500 ease-in-out relative flex flex-col items-center",
            previewMode === 'mobile'
              ? "w-[440px] max-w-full h-screen rounded-[3.5rem] border-[10px] border-zinc-950 bg-zinc-950 shadow-2xl ring-1 ring-white/10"
              : "w-full flex-1"
          )}
        >
          {/* Notch / Dynamic Island area */}
          {previewMode === 'mobile' && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 bg-zinc-950 rounded-full z-20 flex items-center justify-center gap-1.5 px-3">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
              <div className="w-8 h-1.5 rounded-full bg-zinc-800" />
            </div>
          )}

          <div
            ref={containerRef}
            className={cn(
              "bg-white transition-all duration-500 relative custom-scrollbar overflow-y-auto",
              previewMode === 'mobile'
                ? "w-full h-[calc(100vh-200px)] rounded-[2.8rem] border-[2px] border-zinc-900 pt-8 pb-6"
                : "w-full h-[calc(100vh-200px)] rounded-2xl border border-border/50"
            )}
          >
            {/* Fasih Engine renders inside unique child roots here */}
          </div>

          {/* Home Indicator */}
          {previewMode === 'mobile' && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-white/20 rounded-full z-20 pointer-events-none" />
          )}
        </div>
      </div>
    </div>
  )
}
