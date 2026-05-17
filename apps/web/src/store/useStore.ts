import { create } from 'zustand'
import { Component, TestFunction, buildComponentMap } from '@fasih-form-studio/shared'
import { saveEngine, deleteEngine, getStoredVersions } from '../lib/engineStorage'
export type { Component, TestFunction } from '@fasih-form-studio/shared'
export { buildComponentMap } from '@fasih-form-studio/shared'

export interface FormEngineVersion {
  id: string
  formEngineId: number
  version: string
  basePath: string
  createdAt: string
  modifiedAt: string
  modifiedBy: string
  linkDownload: string
  message: string
  isDefault: boolean
  isForce: boolean
}

interface State {
  template: any
  validation: any
  preset: any
  response: any
  sidebarMode: 'components' | 'presets' | 'responses' | 'template' | 'validation'
  selectedDataKey: string | null
  componentMap: Record<string, Component>
  
  // Settings & Multi-template
  bearerToken: string
  useProxy: boolean
  currentTemplateId: string
  availableTemplateIds: string[]
  isLoading: boolean
  parentMap: Record<string, string | null>
  selectedPath: Set<string>
  previewWidth: number
  previewMode: 'mobile' | 'desktop'

  // Engine Version Management
  engineVersions: FormEngineVersion[]
  selectedEngineVersion: string | null  // null = use static /engine/fasih-form.js
  storedEngineVersions: string[]        // versions already downloaded to IndexedDB
  isFetchingVersions: boolean
  isDownloadingVersion: string | null   // version string being downloaded, or null
  lastVersionFetch: number | null       // timestamp of last successful API fetch
  downloadProgress: number              // 0-100
  
  // Actions
  setSidebarMode: (mode: 'components' | 'presets' | 'responses' | 'template' | 'validation') => void
  setUseProxy: (useProxy: boolean) => void
  setPreviewWidth: (width: number) => void
  setPreviewMode: (mode: 'mobile' | 'desktop') => void
  setTemplate: (template: any) => void
  setValidation: (validation: any) => void
  setPreset: (preset: any) => void
  setResponse: (response: any) => void
  setSelectedDataKey: (dataKey: string | null) => void
  updateComponent: (dataKey: string, updates: Partial<Component>) => void
  updateValidation: (dataKey: string, updates: Partial<TestFunction>) => void
  updatePresetEntry: (dataKey: string, answer: any) => void
  updateResponseEntry: (dataKey: string, answer: any) => void
  
  // Storage actions
  loadCurrentTemplate: () => Promise<void>
  saveToLocalStorage: () => void
  syncFromServer: () => Promise<void>
  setGlobalSettings: (token: string) => void
  addTemplate: (templateId: string) => void
  switchTemplate: (templateId: string) => Promise<void>
  deleteTemplate: (templateId: string) => void

  // Engine version actions
  fetchEngineVersions: (force?: boolean) => Promise<void>
  setSelectedEngineVersion: (version: string | null) => void
  downloadEngineVersion: (version: FormEngineVersion) => Promise<void>
  deleteLocalEngineVersion: (version: string) => Promise<void>
  refreshStoredVersions: () => Promise<void>
}

const STORAGE_KEYS = {
  TOKEN: 'fasih_bearer_token',
  USE_PROXY: 'fasih_use_proxy',
  CURRENT_ID: 'fasih_current_template_id',
  ID_LIST: 'fasih_template_ids',
  TEMPLATE: (id: string) => `fasih_template_${id}`,
  VALIDATION: (id: string) => `fasih_validation_${id}`,
  PRESET: (id: string) => `fasih_preset_${id}`,
  RESPONSE: (id: string) => `fasih_response_${id}`,
  PREVIEW_WIDTH: 'fasih_preview_width',
  PREVIEW_MODE: 'fasih_preview_mode',
  ENGINE_VERSIONS: 'fasih_engine_versions',
  ENGINE_VERSIONS_TS: 'fasih_engine_versions_ts',
  SELECTED_ENGINE: 'fasih_selected_engine',
}

// Cache TTL: 30 minutes
const VERSION_CACHE_TTL_MS = 30 * 60 * 1000




let saveDebounceTimer: any = null;

export const useStore = create<State>((set, get) => ({
  sidebarMode: 'components',
  template: null,
  validation: null,
  preset: null,
  response: null,
  selectedDataKey: null,
  componentMap: {},
  isLoading: true,
  
  bearerToken: typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.TOKEN) || '' : '',
  useProxy: typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.USE_PROXY) !== 'false' : true,
  currentTemplateId: typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.CURRENT_ID) || '' : '',
  availableTemplateIds: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem(STORAGE_KEYS.ID_LIST) || '[]') : [],
  parentMap: {},
  selectedPath: new Set(),
  previewWidth: typeof window !== 'undefined' ? Number(localStorage.getItem(STORAGE_KEYS.PREVIEW_WIDTH)) || 450 : 450,
  previewMode: typeof window !== 'undefined' ? (localStorage.getItem(STORAGE_KEYS.PREVIEW_MODE) as 'mobile' | 'desktop') || 'mobile' : 'mobile',

  // Engine version state
  engineVersions: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem(STORAGE_KEYS.ENGINE_VERSIONS) || '[]') : [],
  selectedEngineVersion: typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.SELECTED_ENGINE) || null : null,
  storedEngineVersions: [],
  isFetchingVersions: false,
  isDownloadingVersion: null,
  lastVersionFetch: typeof window !== 'undefined' ? Number(localStorage.getItem(STORAGE_KEYS.ENGINE_VERSIONS_TS)) || null : null,
  downloadProgress: 0,

  setSidebarMode: (sidebarMode) => set({ sidebarMode, selectedDataKey: null }),
  setUseProxy: (useProxy) => {
    set({ useProxy })
    localStorage.setItem(STORAGE_KEYS.USE_PROXY, String(useProxy))
  },
  setPreviewWidth: (previewWidth) => {
    set({ previewWidth })
    localStorage.setItem(STORAGE_KEYS.PREVIEW_WIDTH, String(previewWidth))
  },
  setPreviewMode: (previewMode) => {
    set({ previewMode })
    localStorage.setItem(STORAGE_KEYS.PREVIEW_MODE, previewMode)
    
    // When switching to desktop, if width is too small, increase it
    if (previewMode === 'desktop' && get().previewWidth < 800) {
      get().setPreviewWidth(850)
    } else if (previewMode === 'mobile' && get().previewWidth > 600) {
      get().setPreviewWidth(450)
    }
  },
  setTemplate: (template) => {
    const parentMap: Record<string, string | null> = {}
    const buildParentMap = (comps: any, parent: string | null = null) => {
      if (!comps) return
      const list = Array.isArray(comps) ? comps : [comps]
      for (const item of list) {
        if (!item) continue
        if (Array.isArray(item)) {
          buildParentMap(item, parent)
          continue
        }
        if (item.dataKey) {
          parentMap[item.dataKey] = parent
        }
        if (item.components) {
          buildParentMap(item.components, item.dataKey || parent)
        }
      }
    }
    buildParentMap(template?.components)

    set({ 
      template, 
      componentMap: buildComponentMap(template?.components),
      parentMap
    })
    get().saveToLocalStorage()
  },
  setValidation: (validation) => {
    set({ validation })
    get().saveToLocalStorage()
  },
  setPreset: (preset) => {
    set({ preset })
    get().saveToLocalStorage()
  },
  setResponse: (response) => {
    set({ response })
    get().saveToLocalStorage()
  },
  setGlobalSettings: (token) => {
    set({ bearerToken: token })
    localStorage.setItem(STORAGE_KEYS.TOKEN, token)
  },
  setSelectedDataKey: (selectedDataKey) => {
    const { parentMap } = get()
    const selectedPath = new Set<string>()
    let current = selectedDataKey
    while (current && parentMap[current]) {
      const parent = parentMap[current]
      if (parent) {
        selectedPath.add(parent)
        current = parent
      } else {
        break
      }
    }
    set({ selectedDataKey, selectedPath })
  },

  updateComponent: (dataKey, updates) => {
    const { template } = get()
    if (!template) return

    const findAndReplace = (components: any[]): any[] | null => {
      let anyChanged = false
      const newComponents = components.map(group => {
        if (Array.isArray(group)) {
          let groupChanged = false
          const newGroup = group.map(comp => {
            if (comp.dataKey === dataKey) {
              groupChanged = true
              anyChanged = true
              return { ...comp, ...updates }
            }
            if (Array.isArray(comp.components)) {
              const res = findAndReplace(comp.components)
              if (res) {
                groupChanged = true
                anyChanged = true
                return { ...comp, components: res }
              }
            }
            return comp
          })
          return groupChanged ? newGroup : group
        } else {
          if (group.dataKey === dataKey) {
            anyChanged = true
            return { ...group, ...updates }
          }
          if (Array.isArray(group.components)) {
            const res = findAndReplace(group.components)
            if (res) {
              anyChanged = true
              return { ...group, components: res }
            }
          }
          return group
        }
      })
      return anyChanged ? newComponents : null
    }

    const newComponents = findAndReplace(template.components)
    if (newComponents) {
      set({ 
        template: { ...template, components: newComponents },
        componentMap: buildComponentMap(newComponents)
      })
      // Trigger setSelectedDataKey to refresh path if needed
      get().setSelectedDataKey(get().selectedDataKey)
      get().saveToLocalStorage()
    }
  },

  updateValidation: (dataKey, updates) => {
    const { validation } = get()
    if (!validation) return

    const index = validation.testFunctions.findIndex((tf: any) => tf.dataKey === dataKey)
    const newTestFunctions = [...validation.testFunctions]
    
    if (index !== -1) {
      newTestFunctions[index] = { ...newTestFunctions[index], ...updates }
    } else {
      newTestFunctions.push({ dataKey, ...updates })
    }
    
    set({ 
      validation: { ...validation, testFunctions: newTestFunctions }
    })
    get().saveToLocalStorage()
  },

  updatePresetEntry: (dataKey, answer) => {
    const { preset } = get()
    if (!preset || !preset.predata) return
    
    const newPredata = [...preset.predata]
    const index = newPredata.findIndex((p: any) => p.dataKey === dataKey)
    if (index !== -1) {
      newPredata[index] = { ...newPredata[index], answer }
    } else {
      newPredata.push({ dataKey, answer })
    }
    set({ preset: { ...preset, predata: newPredata } })
    get().saveToLocalStorage()
  },

  updateResponseEntry: (dataKey, answer) => {
    const { response } = get()
    if (!response || !response.answers) return
    
    const newAnswers = [...response.answers]
    const index = newAnswers.findIndex((a: any) => a.dataKey === dataKey)
    if (index !== -1) {
      newAnswers[index] = { ...newAnswers[index], answer }
    } else {
      newAnswers.push({ dataKey, answer })
    }
    set({ response: { ...response, answers: newAnswers } })
    get().saveToLocalStorage()
  },

  loadCurrentTemplate: async () => {
    set({ isLoading: true })
    const { currentTemplateId } = get()
    
    if (!currentTemplateId) {
      set({ template: null, isLoading: false })
      return
    }

    try {
      const templateStr = localStorage.getItem(STORAGE_KEYS.TEMPLATE(currentTemplateId))
      const validationStr = localStorage.getItem(STORAGE_KEYS.VALIDATION(currentTemplateId))
      const presetStr = localStorage.getItem(STORAGE_KEYS.PRESET(currentTemplateId))
      const responseStr = localStorage.getItem(STORAGE_KEYS.RESPONSE(currentTemplateId))

      const template = templateStr ? JSON.parse(templateStr) : null
      const validation = validationStr ? JSON.parse(validationStr) : null
      
      // Default values for preset and response
      const preset = presetStr ? JSON.parse(presetStr) : { predata: [] }
      const response = responseStr ? JSON.parse(responseStr) : { answers: [] }

      const parentMap: Record<string, string | null> = {}
      const buildParentMap = (comps: any, parent: string | null = null) => {
        if (!comps) return
        const list = Array.isArray(comps) ? comps : [comps]
        for (const item of list) {
          if (!item) continue
          if (Array.isArray(item)) {
            buildParentMap(item, parent)
            continue
          }
          if (item.dataKey) {
            parentMap[item.dataKey] = parent
          }
          if (item.components) {
            buildParentMap(item.components, item.dataKey || parent)
          }
        }
      }
      buildParentMap(template?.components)

      set({ 
        template, 
        validation, 
        preset, 
        response,
        componentMap: template ? buildComponentMap(template.components) : {},
        parentMap,
        isLoading: false
      })
      
      // If we used defaults, save them back to localStorage
      if (!presetStr || !responseStr) {
        get().saveToLocalStorage()
      }
    } catch (e) {
      console.error('Failed to load data from localStorage:', e)
      set({ isLoading: false })
    }
  },

  saveToLocalStorage: () => {
    const { template, validation, preset, response, currentTemplateId } = get()
    
    const id = currentTemplateId || template?.id
    if (!id) return

    if (saveDebounceTimer) clearTimeout(saveDebounceTimer)
    
    saveDebounceTimer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEYS.TEMPLATE(id), JSON.stringify(template))
      localStorage.setItem(STORAGE_KEYS.VALIDATION(id), JSON.stringify(validation))
      localStorage.setItem(STORAGE_KEYS.PRESET(id), JSON.stringify(preset))
      localStorage.setItem(STORAGE_KEYS.RESPONSE(id), JSON.stringify(response))
      
      // Update ID list if new
      const { availableTemplateIds } = get()
      if (!availableTemplateIds.includes(id)) {
        const newList = [...availableTemplateIds, id]
        set({ availableTemplateIds: newList })
        localStorage.setItem(STORAGE_KEYS.ID_LIST, JSON.stringify(newList))
      }
      console.log(`Saved template ${id} to localStorage`)
    }, 500)
  },

  syncFromServer: async () => {
    const { currentTemplateId, bearerToken } = get()
    if (!currentTemplateId || !bearerToken) throw new Error('Missing template ID or token')

    const isExtension = typeof window !== 'undefined' && window.location.protocol === 'chrome-extension:';
    
    // In extension, we fetch directly. In web, we use our proxy.
    const baseUrl = isExtension 
      ? 'https://fasih-qd.bps.go.id' 
      : '/api/proxy';

    const fetchData = async (path: string) => {
      if (isExtension) {
        console.log('[Store] Sending fetch request to background:', path);
        // Delegate fetch to background script to bypass CORS/Cookie issues
        return new Promise((resolve, reject) => {
          const win = (window as any);
          if (win.chrome && win.chrome.runtime) {
            // Safety timeout
            const timeout = setTimeout(() => {
              reject(new Error('Sync Timeout: Background script not responding'));
            }, 15000);

            win.chrome.runtime.sendMessage({ 
              action: 'fetchFromBps', 
              path, 
              token: bearerToken 
            }, (response: any) => {
              clearTimeout(timeout);
              console.log('[Store] Received response from background:', !!response);
              if (response?.success) {
                resolve(response.data);
              } else {
                console.error('[Store] Background fetch failed:', response?.error);
                reject(new Error(response?.error || 'Failed to fetch via background script'));
              }
            });
          } else {
            console.error('[Store] Chrome runtime not available!');
            reject(new Error('Chrome runtime not available'));
          }
        });
      }

      const response = await fetch(`${baseUrl}${path}`, {
        credentials: 'include',
        headers: {
          'Authorization': bearerToken.startsWith('Bearer ') ? bearerToken : `Bearer ${bearerToken}`,
          'Accept': 'application/json, text/plain, */*',
          'X-Requested-With': 'XMLHttpRequest'
        }
      })
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      return await response.json()
    }

    try {
      const [template, validation] = await Promise.all([
        fetchData(`/designer/api/template/develop/file/${currentTemplateId}`),
        fetchData(`/designer/api/template/develop/file-validation/${currentTemplateId}`)
      ])

      set({ 
        template, 
        validation,
        componentMap: buildComponentMap(template?.components)
      })
      
      get().saveToLocalStorage()
      console.log('Synchronized from server correctly')
    } catch (error: any) {
      console.error('Sync from server failed:', error)
      throw error
    }
  },

  addTemplate: (templateId) => {
    const { availableTemplateIds } = get()
    if (!availableTemplateIds.includes(templateId)) {
      const newList = [...availableTemplateIds, templateId]
      set({ availableTemplateIds: newList })
      localStorage.setItem(STORAGE_KEYS.ID_LIST, JSON.stringify(newList))
      
      // Initialize defaults for new template ID if they don't exist
      if (!localStorage.getItem(STORAGE_KEYS.RESPONSE(templateId))) {
        localStorage.setItem(STORAGE_KEYS.RESPONSE(templateId), JSON.stringify({ answers: [] }))
      }
      if (!localStorage.getItem(STORAGE_KEYS.PRESET(templateId))) {
        localStorage.setItem(STORAGE_KEYS.PRESET(templateId), JSON.stringify({ predata: [] }))
      }
    }
  },

  switchTemplate: async (templateId) => {
    set({ currentTemplateId: templateId })
    localStorage.setItem(STORAGE_KEYS.CURRENT_ID, templateId)
    await get().loadCurrentTemplate()
  },

  deleteTemplate: (templateId) => {
    localStorage.removeItem(STORAGE_KEYS.TEMPLATE(templateId))
    localStorage.removeItem(STORAGE_KEYS.VALIDATION(templateId))
    localStorage.removeItem(STORAGE_KEYS.PRESET(templateId))
    localStorage.removeItem(STORAGE_KEYS.RESPONSE(templateId))
    
    const newList = get().availableTemplateIds.filter(id => id !== templateId)
    set({ availableTemplateIds: newList })
    localStorage.setItem(STORAGE_KEYS.ID_LIST, JSON.stringify(newList))
    
    if (get().currentTemplateId === templateId) {
      set({ currentTemplateId: '', template: null, validation: null, preset: null, response: null })
      localStorage.setItem(STORAGE_KEYS.CURRENT_ID, '')
    }
  },

  fetchEngineVersions: async (force = false) => {
    const { lastVersionFetch, engineVersions, isFetchingVersions } = get()
    if (isFetchingVersions) return

    const now = Date.now()
    const isCacheValid = lastVersionFetch && (now - lastVersionFetch) < VERSION_CACHE_TTL_MS
    if (!force && isCacheValid && engineVersions.length > 0) return

    set({ isFetchingVersions: true })
    try {
      const isExtension = typeof window !== 'undefined' && window.location.protocol === 'chrome-extension:'
      let data: FormEngineVersion[]

      if (isExtension) {
        // Use background script to bypass CORS in extension context
        data = await new Promise((resolve, reject) => {
          const win = window as any
          const timeout = setTimeout(() => reject(new Error('Timeout fetching versions')), 15000)
          win.chrome?.runtime?.sendMessage(
            { action: 'fetchFromBps', path: '/designer/api/form-engine/list-form-engine-release', token: get().bearerToken },
            (res: any) => {
              clearTimeout(timeout)
              if (res?.success) resolve(res.data?.data ?? [])
              else reject(new Error(res?.error || 'Failed'))
            }
          )
        })
      } else {
        const { bearerToken } = get()
        const res = await fetch('/api/proxy/designer/api/form-engine/list-form-engine-release', {
          headers: bearerToken ? { Authorization: bearerToken.startsWith('Bearer ') ? bearerToken : `Bearer ${bearerToken}` } : {}
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        data = json.data ?? []
      }

      // Filter: only formEngineId === 2, sort newest first by createdAt
      const filtered = data
        .filter((v) => v.formEngineId === 2)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      localStorage.setItem(STORAGE_KEYS.ENGINE_VERSIONS, JSON.stringify(filtered))
      localStorage.setItem(STORAGE_KEYS.ENGINE_VERSIONS_TS, String(now))
      set({ engineVersions: filtered, lastVersionFetch: now })
    } catch (e: any) {
      console.error('[Engine] Failed to fetch versions:', e)
    } finally {
      set({ isFetchingVersions: false })
    }
  },

  setSelectedEngineVersion: (version) => {
    set({ selectedEngineVersion: version })
    if (version) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_ENGINE, version)
    } else {
      localStorage.removeItem(STORAGE_KEYS.SELECTED_ENGINE)
    }
  },

  downloadEngineVersion: async (versionObj) => {
    const { isDownloadingVersion } = get()
    if (isDownloadingVersion) return

    set({ isDownloadingVersion: versionObj.version, downloadProgress: 0 })
    try {
      // Download the zip file via proxy
      const isExtension = typeof window !== 'undefined' && window.location.protocol === 'chrome-extension:'
      let zipBuffer: ArrayBuffer

      if (isExtension) {
        // Can't stream binary in extension message; direct fetch attempt
        const res = await fetch(versionObj.linkDownload)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        zipBuffer = await res.arrayBuffer()
      } else {
        const { bearerToken } = get()
        // Encode the download URL to proxy it
        const proxyUrl = `/api/proxy/mobile/assignment-sync/api/mobile/template/download-form-engine?formEngineId=2&version=${encodeURIComponent(versionObj.version)}`
        const res = await fetch(proxyUrl, {
          headers: bearerToken ? { Authorization: bearerToken.startsWith('Bearer ') ? bearerToken : `Bearer ${bearerToken}` } : {}
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        // Read with progress tracking
        const contentLength = res.headers.get('Content-Length')
        const totalBytes = contentLength ? parseInt(contentLength) : 0
        const reader = res.body!.getReader()
        const chunks: Uint8Array[] = []
        let received = 0

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          if (value) {
            chunks.push(value)
            received += value.byteLength
            if (totalBytes > 0) {
              set({ downloadProgress: Math.round((received / totalBytes) * 80) })
            }
          }
        }

        const blob = new Blob(chunks as any[])
        zipBuffer = await blob.arrayBuffer()
      }

      set({ downloadProgress: 85 })

      // Dynamically import JSZip to unzip
      const JSZip = (await import('jszip')).default
      const zip = await JSZip.loadAsync(zipBuffer)

      set({ downloadProgress: 90 })

      // Extract JS and CSS from the zip
      // Expected structure: fasih-form/fasih-form.umd.js and fasih-form/style.css
      let jsContent = ''
      let cssContent = ''

      const jsFile = zip.file(/\.umd\.js$/i)[0] ?? zip.file(/fasih-form.*\.js$/i)[0]
      const cssFile = zip.file(/style\.css$/i)[0] ?? zip.file(/\.css$/i)[0]

      if (jsFile) jsContent = await jsFile.async('string')
      if (cssFile) cssContent = await cssFile.async('string')

      if (!jsContent) throw new Error('JS file not found in zip')

      set({ downloadProgress: 95 })

      await saveEngine(versionObj.version, jsContent, cssContent)

      set({ downloadProgress: 100 })

      // Refresh stored versions list
      await get().refreshStoredVersions()
    } catch (e: any) {
      console.error('[Engine] Download failed:', e)
      throw e
    } finally {
      setTimeout(() => set({ isDownloadingVersion: null, downloadProgress: 0 }), 500)
    }
  },

  deleteLocalEngineVersion: async (version) => {
    await deleteEngine(version)
    const { selectedEngineVersion } = get()
    if (selectedEngineVersion === version) {
      get().setSelectedEngineVersion(null)
    }
    await get().refreshStoredVersions()
  },

  refreshStoredVersions: async () => {
    const stored = await getStoredVersions()
    set({ storedEngineVersions: stored })
  },
}))
