import React, { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { Eye, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { cn } from '../lib/utils'

const JS_URL = "https://esurvey.bps.go.id/api/form-engine/js-umd/2";
const CSS_URL = "https://esurvey.bps.go.id/api/form-engine/css/2";

declare global {
  interface Window {
    FasihForm?: any;
    lib?: any;
  }
}

export const FormPreview = () => {
  const { template, validation, preset, response } = useStore()
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<any>(null)
  const isEngineSaveRef = useRef(false)
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
    if (!ready || error || !template || !containerRef.current) return

    if (isEngineSaveRef.current) {
      isEngineSaveRef.current = false;
      return;
    }

    const FasihForm = window.FasihForm || window.lib;

    // Debounce re-render to avoid flicker and race conditions
    const timer = setTimeout(() => {
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

      // 2. FORCE CLEAR DOM to avoid duplicate rendering/caching
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        // Re-create the root element if needed, though FF usually targets an ID
        const root = document.createElement('div');
        root.id = "preview-root-inner";
        containerRef.current.appendChild(root);
        root.style.height = 'calc(100svh - 175px)';
        root.style.width = '100%';
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

      const options = {
        mode: "CAPI",
        assignmentId: "preview",
        template: JSON.parse(JSON.stringify(template)), // Deep clone to ensure FF doesn't mutate store state
        validation: validation ? JSON.parse(JSON.stringify(validation)) : null,
        preset: preset ? JSON.parse(JSON.stringify(preset)) : null,
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

      try {
        const FF = typeof FasihForm === 'function' ? FasihForm : (FasihForm.render ? FasihForm : null);
        if (!FF) throw new Error("FasihForm constructor or render function not found");

        // Target the inner root we just created
        instanceRef.current = FF("#preview-root-inner", options);

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

        instanceRef.current.render();
      } catch (err: any) {
        console.error("FasihForm render error:", err)
        setError("Render Error: " + err.message);
      }
    }, 150) // Slightly longer debounce for stability

    return () => clearTimeout(timer)
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
            <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-bold uppercase">
              Active
            </span>
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
