import { create } from 'zustand'
import type { Project, DictItem } from '@/types'
import { projectRepo, dictRepo, settingsRepo } from '@/db/repositories'
import { DEFAULT_PROJECT_NAME } from '@/core/constants'

export interface ScanProgress {
  total: number
  processed: number
  currentFile: string
}

export interface ScanState {
  isScanning: boolean
  progress: ScanProgress | null
}

interface AppState {
  currentProject: Project | null
  currentProjectId: string | null
  dictCache: Map<string, DictItem[]>
  initialized: boolean
  scan: ScanState

  init: () => Promise<void>
  setCurrentProject: (projectId: string) => Promise<void>
  getDictItems: (category: string) => DictItem[]
  loadDictCache: () => Promise<void>
  startScan: () => void
  updateScanProgress: (progress: ScanProgress) => void
  finishScan: () => void
}

export const useAppStore = create<AppState>((set, get) => ({
  currentProject: null,
  currentProjectId: null,
  dictCache: new Map(),
  initialized: false,
  scan: { isScanning: false, progress: null },

  init: async () => {
    const savedProjectId = await settingsRepo.get('currentProjectId')

    let project: Project | null = null
    if (savedProjectId) {
      project = await projectRepo.getById(savedProjectId) ?? null
    }

    if (!project) {
      const projects = await projectRepo.getAll()
      project = projects.length > 0 ? projects[0] : null
    }

    if (project) {
      await settingsRepo.set('currentProjectId', project.id!)
    }

    const dictList = await dictRepo.find({ enabled: true } as Partial<DictItem>)
    const dictCache = new Map<string, DictItem[]>()
    for (const item of dictList) {
      const key = item.category
      if (!dictCache.has(key)) dictCache.set(key, [])
      dictCache.get(key)!.push(item)
    }
    for (const list of dictCache.values()) {
      list.sort((a, b) => a.sortOrder - b.sortOrder)
    }

    set({
      currentProject: project,
      currentProjectId: project?.id ?? null,
      dictCache,
      initialized: true,
    })
  },

  setCurrentProject: async (projectId: string) => {
    const project = await projectRepo.getById(projectId)
    if (project) {
      await settingsRepo.set('currentProjectId', projectId)
      set({ currentProject: project, currentProjectId: projectId })
    }
  },

  getDictItems: (category: string) => {
    return get().dictCache.get(category) ?? []
  },

  loadDictCache: async () => {
    const dictList = await dictRepo.find({ enabled: true } as Partial<DictItem>)
    const dictCache = new Map<string, DictItem[]>()
    for (const item of dictList) {
      const key = item.category
      if (!dictCache.has(key)) dictCache.set(key, [])
      dictCache.get(key)!.push(item)
    }
    for (const list of dictCache.values()) {
      list.sort((a, b) => a.sortOrder - b.sortOrder)
    }
    set({ dictCache })
  },

  startScan: () => set({ scan: { isScanning: true, progress: { total: 0, processed: 0, currentFile: '' } } }),

  updateScanProgress: (progress) => set({ scan: { isScanning: true, progress } }),

  finishScan: () => set({ scan: { isScanning: false, progress: null } }),
}))

export function getDictLabel(category: string, code: string): string {
  const items = useAppStore.getState().getDictItems(category)
  const item = items.find(i => i.code === code)
  return item?.label ?? code
}

export function getCurrentProjectId(): string {
  return useAppStore.getState().currentProjectId ?? ''
}

export { DEFAULT_PROJECT_NAME }
