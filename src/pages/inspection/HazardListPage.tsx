import { useState } from 'react'
import { useAppStore } from '@/store'
import { hazardService } from '@/services/hazardService'
import { useHazardList } from './hooks/useHazardList'
import { HazardToolbar } from './components/HazardToolbar'
import { HazardList } from './components/HazardList'
import { HazardSheets, type SheetMode } from './components/HazardSheets'
import type { Hazard } from '@/types'

export default function HazardListPage() {
  const { getDictItems } = useAppStore()
  const categoryItems = getDictItems('hazard_category')

  const {
    filteredHazards,
    counts,
    statusFilter,
    setStatusFilter,
    searchText,
    setSearchText,
  } = useHazardList()

  const [addOpen, setAddOpen] = useState(false)
  const [selected, setSelected] = useState<Hazard | null>(null)
  const [mode, setMode] = useState<SheetMode>(null)

  const openDetail = (hazard: Hazard) => {
    setSelected(hazard)
    setMode('detail')
  }

  const openRectify = (hazard: Hazard) => {
    setSelected(hazard)
    setMode('rectify')
  }

  const openReview = (hazard: Hazard) => {
    setSelected(hazard)
    setMode('review')
  }

  const handleDelete = async (hazard: Hazard) => {
    if (!hazard.id) return
    if (!confirm('确定删除该隐患记录？')) return
    await hazardService.remove(hazard.id)
  }

  return (
    <div className="pb-6">
      <HazardToolbar
        count={counts.all}
        searchText={searchText}
        onSearchChange={setSearchText}
        onAdd={() => setAddOpen(true)}
      />

      <div className="p-3">
        <HazardList
          hazards={filteredHazards}
          loading={false}
          statusFilter={statusFilter}
          counts={counts}
          onStatusChange={setStatusFilter}
          onDetail={openDetail}
          onRectify={openRectify}
          onReview={openReview}
          onDelete={handleDelete}
        />
      </div>

      <HazardSheets
        addOpen={addOpen}
        setAddOpen={setAddOpen}
        selected={selected}
        mode={mode}
        setSelected={setSelected}
        setMode={setMode}
        categoryItems={categoryItems}
      />
    </div>
  )
}
