import { create } from 'zustand'

export interface Component {
  dataKey: string
  label: string
  type: number
  components?: Component[][]
  [key: string]: any
}

export interface ValidationRule {
  test: string
  message: string
  type: number
}

export interface TestFunction {
  dataKey: string
  componentValidation: string[]
  validations: ValidationRule[]
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
  
  // Actions
  setSidebarMode: (mode: 'components' | 'presets' | 'responses' | 'template' | 'validation') => void
  setUseProxy: (useProxy: boolean) => void
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
}

const STORAGE_KEYS = {
  TOKEN: 'fasih_bearer_token',
  CURRENT_ID: 'fasih_current_template_id',
  ID_LIST: 'fasih_template_ids',
  TEMPLATE: (id: string) => `fasih_template_${id}`,
  VALIDATION: (id: string) => `fasih_validation_${id}`,
  PRESET: (id: string) => `fasih_preset_${id}`,
  RESPONSE: (id: string) => `fasih_response_${id}`,
}

const buildComponentMap = (components: any): Record<string, Component> => {
  const map: Record<string, Component> = {}
  const traverse = (comps: any) => {
    if (!comps) return
    const compList = Array.isArray(comps) ? comps : [comps]
    
    for (const item of compList) {
      if (!item) continue
      
      if (Array.isArray(item)) {
        traverse(item)
        continue
      }
      
      if (item.dataKey) {
        map[item.dataKey] = item
      }
      
      if (item.components) {
        traverse(item.components)
      }
    }
  }
  traverse(components)
  return map
}

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

  setSidebarMode: (sidebarMode) => set({ sidebarMode, selectedDataKey: null }),
  setUseProxy: (useProxy) => {
    set({ useProxy })
    localStorage.setItem(STORAGE_KEYS.USE_PROXY, String(useProxy))
  },
  setTemplate: (template) => {
    set({ 
      template, 
      componentMap: buildComponentMap(template?.components) 
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
  setSelectedDataKey: (selectedDataKey) => set({ selectedDataKey }),

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

      set({ 
        template, 
        validation, 
        preset, 
        response,
        componentMap: template ? buildComponentMap(template.components) : {},
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
    const { bearerToken, currentTemplateId } = get()
    if (!bearerToken || !currentTemplateId) {
      throw new Error('Bearer token and Template ID are required. Please check Settings.')
    }

    try {
      const { useProxy } = get()
      const fetchThroughProxy = async (endpoint: string) => {
        const targetUrl = `https://fasih-survey.bps.go.id${endpoint}`
        
        // If proxy is enabled, use /api/proxy/path
        // If disabled, fetch directly from BPS URL (requires VPN & CORS extension)
        const fetchUrl = useProxy ? `/api/proxy${endpoint}` : targetUrl
        
        const res = await fetch(fetchUrl, {
          headers: { 'Authorization': `Bearer ${bearerToken}` }
        })
        
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || `Proxy fetch failed: ${res.statusText}`)
        }

        const contentType = res.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          return res.json()
        } else {
          const text = await res.text()
          try {
            return JSON.parse(text)
          } catch (e) {
            throw new Error('Received invalid data format from server (not a valid JSON)')
          }
        }
      }

      console.log('Fetching from BPS API...')
      // Path format for proxy: /designer/api/template/develop/file/...
      const [template, validation] = await Promise.all([
        fetchThroughProxy(`/designer/api/template/develop/file/${currentTemplateId}`),
        fetchThroughProxy(`/designer/api/template/develop/file-validation/${currentTemplateId}`)
      ])

      if (template && template.success === false && template.message) {
        throw new Error(`Server returned error: ${template.message}`)
      }

      if (!template || typeof template !== 'object' || (!template.id && !template.components)) {
        throw new Error('Fetched data does not appear to be a valid template')
      }

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

  setGlobalSettings: (token) => {
    set({ bearerToken: token })
    localStorage.setItem(STORAGE_KEYS.TOKEN, token)
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
  }
}))
