import React, { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { Eye, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { cn } from '../lib/utils'

const JS_URL = "./engine/fasih-form.js";
const CSS_URL = "./engine/fasih-form.css";

declare global {
  interface Window {
    FasihForm?: any;
    lib?: any;
  }
}

export const FormPreview = () => {
  const { template, validation, preset, response } = useStore()
  const [loading, setLoading] = useState(true)
  const [isRendering, setIsRendering] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<any>(null)
  const isEngineSaveRef = useRef(false)
  const innerTimerRef = useRef<any>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const handleReload = () => {
    setError(null)
    setReloadKey(prev => prev + 1)
  }

  useEffect(() => {
    let mounted = true

    const loadResources = async () => {
      try {
        // Load Script
        if (!document.querySelector(`script[src="${JS_URL}"]`)) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement("script");
            s.src = JS_URL;
            s.async = true;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error("Failed to load FasihForm script"));
            document.head.appendChild(s);
          });
        }

        // Load Style
        if (!document.querySelector(`link[href="${CSS_URL}"]`)) {
          const l = document.createElement("link");
          l.rel = "stylesheet";
          l.href = CSS_URL;
          document.head.appendChild(l);
        }

        // Poll for FasihForm or lib on window
        let attempts = 0;
        const checkLibrary = () => {
          if (!mounted) return;
          const FasihForm = window.FasihForm || window.lib;
          console.log("Checking for FasihForm/lib:", !!FasihForm, typeof FasihForm);

          if (typeof FasihForm === "function" || (FasihForm && typeof FasihForm.render === 'function')) {
            setLoading(false);
            setReady(true);
          } else if (attempts < 100) { // Increased attempts
            attempts++;
            setTimeout(checkLibrary, 200); // Increased interval slightly
          } else {
            console.error("Window contents:", Object.keys(window).filter(k => k.toLowerCase().includes('form') || k.toLowerCase().includes('lib')));
            setError("FasihForm library not found in window object. Check console for details.");
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
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    let mounted = true;
    if (!ready || error || !template || !containerRef.current) return

    if (isEngineSaveRef.current) {
      isEngineSaveRef.current = false;
      return;
    }

    const FasihForm = window.FasihForm || window.lib;

    // Debounce re-render to avoid flicker and race conditions
    const timer = setTimeout(() => {
      if (!mounted) return;
      setIsRendering(true);

      // We use another timeout/requestAnimationFrame to allow the "isRendering" state to be painted
      // before the heavy synchronous render() call blocks the thread.
      innerTimerRef.current = setTimeout(() => {
        if (!mounted) {
          setIsRendering(false);
          return;
        }

        try {
          // 1. Destroy previous instance if it exist
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

          // 2. Create a new unique off-screen root for double-buffering
          const uniqueId = `preview-root-inner-${Date.now()}`;
          const newRoot = document.createElement('div');
          newRoot.id = uniqueId;

          // Style it to be hidden but still in the DOM so engine can calculate layouts
          newRoot.style.height = 'calc(100svh - 175px)';
          newRoot.style.width = '100%';
          newRoot.style.position = 'absolute';
          newRoot.style.top = '0';
          newRoot.style.left = '0';
          newRoot.style.opacity = '0';
          newRoot.style.pointerEvents = 'none';

          if (containerRef.current) {
            // Ensure container is positioned relative to hold the absolute child
            containerRef.current.style.position = 'relative';
            containerRef.current.appendChild(newRoot);
          }

          // Attempt to load latest response for this template from localstorage
          let initialResponse = response ? JSON.parse(JSON.stringify(response)) : null;
          if (template?.id) {
            const cached = localStorage.getItem(`fasih-preview-response-${template.id}`);
            if (cached) {
              try {
                initialResponse = JSON.parse(cached);
              } catch (e) {
                console.error("Failed to parse cached response");
              }
            }
          }

          // Efficiently clone data
          const deepClone = (obj: any) => {
            if (typeof structuredClone === 'function') return structuredClone(obj);
            return JSON.parse(JSON.stringify(obj));
          };

          const options = {
            mode: "CAPI",
            assignmentId: "preview",
            template: deepClone(template),
            validation: validation ? deepClone(validation) : null,
            preset: preset ? deepClone(preset) : null,
            response: initialResponse,
            remark: {},
            principals: [],
            formMode: 1,
            initialMode: 2,
            user: {
              username: "tester",
              role: "Developer",
            },
            locale: "id",
          };

          const FF = typeof FasihForm === 'function' ? FasihForm : (FasihForm.render ? FasihForm : null);
          if (!FF) throw new Error("FasihForm constructor or render function not found");

          // Target the new unique root
          instanceRef.current = FF(`#${uniqueId}`, options);

          instanceRef.current.event.on('save', async (data: any) => {
            isEngineSaveRef.current = true;
            try {
              useStore.getState().setResponse(data.response);
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
              const response = await fetch(`/api/proxy${proxyPath}?${searchParams.toString()}`, {
                headers: bearerToken ? { 'Authorization': `Bearer ${bearerToken}` } : {}
              });
              const data = await response.json();

              return data.data;
            } catch (e: any) {
              console.error("Failed to get lookup data:", e);
              throw e;
            }
          });

          instanceRef.current.event.on('external-data-fetch', async (type: string, payload: any) => {
            try {
              const { bearerToken } = useStore.getState();
              const response = await fetch(`/api/proxy/connector/api/hit/${type}`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(bearerToken ? { 'Authorization': `Bearer ${bearerToken}` } : {})
                },
                body: JSON.stringify({
                  assignmentId: "477ef19e-e012-4ade-ba04-3a4963c3a9c5",
                  queryParameter: null,
                  pathParameter: null,
                  body: payload
                }),
              });
              return await response.json();
            } catch (e: any) {
              console.error("Failed to fetch external data:", e);
              return null;
            }
          });

          instanceRef.current.render();

          // Swap logic: Remove old roots, show new root seamlessly
          if (containerRef.current) {
            Array.from(containerRef.current.children).forEach(child => {
              if (child !== newRoot) {
                containerRef.current?.removeChild(child);
              }
            });
            // Make the new root visible
            newRoot.style.position = 'relative';
            newRoot.style.opacity = '1';
            newRoot.style.pointerEvents = 'auto';
          }
        } catch (err: any) {
          console.error("FasihForm render error:", err)
          setError("Render Error: " + err.message);
        } finally {
          setIsRendering(false);
        }
      }, 50); // Small delay to allow UI to show loading state
    }, 150) // Slightly longer debounce for stability

    return () => {
      mounted = false;
      clearTimeout(timer);
      if (innerTimerRef.current) clearTimeout(innerTimerRef.current);
    }
  }, [template, validation, preset, response, ready, error, reloadKey])

  return (
    <div className="w-full border-l bg-muted/10 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b bg-background flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Live Preview</span>
        </div>
        <div className="flex items-center gap-2">
          {!loading && !error && (
            <div className="flex items-center gap-2">
              {isRendering && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />}
              <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-bold uppercase">
                {isRendering ? 'Updating...' : 'Active'}
              </span>
            </div>
          )}
          <button
            onClick={handleReload}
            className="p-1.5 hover:bg-primary/10 rounded-md transition-all text-muted-foreground hover:text-primary active:rotate-180 duration-500"
            title="Reload Form Instance"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="flex-1 relative overflow-auto">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm z-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
            <p className="text-xs text-muted-foreground">Loading Form Engine...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-destructive/5 z-20">
            <AlertCircle className="w-12 h-12 text-destructive mb-4 opacity-50" />
            <h3 className="font-semibold text-destructive">Preview Error</h3>
            <p className="text-xs text-muted-foreground mt-2">{error}</p>
          </div>
        )}

        <div id="preview-root" ref={containerRef} className="min-h-full w-full bg-white shadow-inner p-4 max-h-[100svh]" />
      </div>
    </div>
  )
}
