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
  
  // Actions
  setSidebarMode: (mode: 'components' | 'presets' | 'responses' | 'template' | 'validation') => void
  setTemplate: (template: any) => void
  setValidation: (validation: any) => void
  setPreset: (preset: any) => void
  setResponse: (response: any) => void
  setSelectedDataKey: (dataKey: string | null) => void
  updateComponent: (dataKey: string, updates: Partial<Component>) => void
  updateValidation: (dataKey: string, updates: Partial<TestFunction>) => void
  updatePresetEntry: (dataKey: string, answer: any) => void
  updateResponseEntry: (dataKey: string, answer: any) => void
  loadSamples: () => Promise<void>
  saveToDisk: () => Promise<void>
  syncFromServer: (token: string, templateId: string) => Promise<void>
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

export const useStore = create<State>((set, get) => ({
  sidebarMode: 'components',
  template: null,
  validation: null,
  preset: null,
  response: null,
  selectedDataKey: null,
  componentMap: {},

  setSidebarMode: (sidebarMode) => set({ sidebarMode, selectedDataKey: null }),
  setTemplate: (template) => set({ 
    template, 
    componentMap: buildComponentMap(template?.components) 
  }),
  setValidation: (validation) => set({ validation }),
  setPreset: (preset) => set({ preset }),
  setResponse: (response) => {
    const { template } = get();
    if (template?.id && response) {
      localStorage.setItem(`fasih-preview-response-${template.id}`, JSON.stringify(response));
    }
    set({ response });
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
  },

  loadSamples: async () => {
    try {
      const [template, validation, preset, fileResponse] = await Promise.all([
        fetch('/sample/template.json').then(res => res.json()),
        fetch('/sample/validation.json').then(res => res.json()),
        fetch('/sample/preset.json').then(res => res.json()),
        fetch('/sample/response.json').then(res => res.json()),
      ])
      
      let finalResponse = fileResponse;
      if (template?.id) {
        const cached = localStorage.getItem(`fasih-preview-response-${template.id}`);
        if (cached) {
          try {
            finalResponse = JSON.parse(cached);
          } catch (e) {
            console.error('Failed to parse cached response:', e);
          }
        }
      }

      set({ 
        template, 
        validation, 
        preset, 
        response: finalResponse,
        componentMap: buildComponentMap(template?.components)
      })
    } catch (error) {
      console.error('Failed to load samples:', error)
    }
  },

  saveToDisk: async () => {
    const { template, validation, response, preset } = get()
    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template, validation, response, preset })
      })
      if (!res.ok) throw new Error('Failed to save')
      console.log('Saved to disk successfully')
    } catch (error) {
      console.error('Save to disk failed:', error)
    }
  },

  syncFromServer: async (token: string, templateId: string) => {
    try {
      const baseUrl = 'https://fasih-survey.bps.go.id/designer/api/template/develop'
      
      const fetchThroughProxy = async (targetUrl: string) => {
        const res = await fetch(`/api/proxy?url=${encodeURIComponent(targetUrl)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || `Proxy fetch failed: ${res.statusText}`)
        }

        const contentType = res.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          return res.json()
        } else {
          // It's a "blob" or raw text
          const text = await res.text()
          try {
            return JSON.parse(text)
          } catch (e) {
            throw new Error('Received invalid data format from server (not a valid JSON)')
          }
        }
      }

      console.log('Fetching from BPS API...')
      const [template, validation] = await Promise.all([
        fetchThroughProxy(`${baseUrl}/file/${templateId}`),
        fetchThroughProxy(`${baseUrl}/file-validation/${templateId}`)
      ])

      // Validation check: ensure we didn't receive an error object with status 200
      if (template && template.success === false && template.message) {
        throw new Error(`Server returned error: ${template.message}`)
      }

      // Basic structure validation
      if (!template || typeof template !== 'object') {
        throw new Error('Fetched template is invalid or empty')
      }
      
      if (!template.id && !template.components) {
        throw new Error('Fetched data does not appear to be a valid template')
      }

      console.log('Sending to local save API...')
      // Save the fetched data to local disk using existing saveToDisk logic but with new data
      const saveRes = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template, validation })
      })

      if (!saveRes.ok) {
        const saveErr = await saveRes.json().catch(() => ({}))
        throw new Error(saveErr.error || 'Failed to save synchronized data to disk')
      }
      
      // Reload the local state
      await get().loadSamples()
      
      console.log('Synchronized from server correctly')
    } catch (error: any) {
      console.error('Sync from server failed:', error)
      throw error
    }
  }
}))
