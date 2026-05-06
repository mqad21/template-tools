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

export const buildComponentMap = (components: any): Record<string, Component> => {
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
