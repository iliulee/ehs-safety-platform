import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { projectRepo } from '@/db/repositories'

export function useProjectList() {
  const [searchText, setSearchText] = useState('')
  const [loaded, setLoaded] = useState(false)

  const projects = useLiveQuery(
    async () => {
      const result = await projectRepo.getAll()
      setLoaded(true)
      return result
    },
    [],
    [],
  )

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    if (!q) return projects
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.location ?? '').toLowerCase().includes(q) ||
        (p.contractor ?? '').toLowerCase().includes(q),
    )
  }, [projects, searchText])

  const counts = useMemo(
    () => ({
      all: projects.length,
      active: projects.filter((p) => p.status === 'active').length,
      pending: projects.filter((p) => p.status === 'pending').length,
      paused: projects.filter((p) => p.status === 'paused').length,
      completed: projects.filter((p) => p.status === 'completed').length,
    }),
    [projects],
  )

  return {
    projects,
    filtered,
    counts,
    loading: !loaded,
    searchText,
    setSearchText,
  }
}