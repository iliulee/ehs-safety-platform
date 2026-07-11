import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import { useProjectList } from './hooks/useProjectList'
import { ProjectToolbar } from './components/ProjectToolbar'
import { ProjectList } from './components/ProjectList'
import { ProjectSheets } from './components/ProjectSheets'
import type { Project } from '@/types'

export default function ProjectListPage() {
  const navigate = useNavigate()
  const { currentProjectId, setCurrentProject } = useAppStore()
  const { projects, filtered, counts, loading, searchText, setSearchText } = useProjectList()

  const [addOpen, setAddOpen] = useState(false)
  const [detailItem, setDetailItem] = useState<Project | null>(null)

  const handleSwitchProject = async (project: Project) => {
    if (project.id && project.id !== currentProjectId) {
      await setCurrentProject(project.id)
      navigate('/home')
    }
  }

  const isCurrent = (project: Project) => project.id === currentProjectId

  return (
    <div className="pb-6">
      <ProjectToolbar
        count={projects.length}
        searchText={searchText}
        onSearchChange={setSearchText}
        onAdd={() => setAddOpen(true)}
      />

      <div className="px-3 pt-3">
        <ProjectList
          projects={filtered}
          loading={loading}
          currentProjectId={currentProjectId}
          counts={counts}
          onDetail={setDetailItem}
          onSwitch={handleSwitchProject}
        />
      </div>

      <ProjectSheets
        addOpen={addOpen}
        setAddOpen={setAddOpen}
        detailItem={detailItem}
        setDetailItem={setDetailItem}
        isCurrent={isCurrent}
        onSwitch={handleSwitchProject}
      />
    </div>
  )
}