import { AddHazardSheet } from './AddHazardSheet'
import { HazardDetailSheet } from './HazardDetailSheet'
import { RectifySheet } from './RectifySheet'
import { ReviewSheet } from './ReviewSheet'
import type { Hazard } from '@/types'

export type SheetMode = 'detail' | 'rectify' | 'review' | null

interface HazardSheetsProps {
  addOpen: boolean
  setAddOpen: (open: boolean) => void
  selected: Hazard | null
  mode: SheetMode
  setSelected: (hazard: Hazard | null) => void
  setMode: (mode: SheetMode) => void
  categoryItems: { code: string; label: string }[]
}

export function HazardSheets({
  addOpen,
  setAddOpen,
  selected,
  mode,
  setSelected,
  setMode,
  categoryItems,
}: HazardSheetsProps) {
  const closeAll = () => {
    setSelected(null)
    setMode(null)
  }

  return (
    <>
      <AddHazardSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => setAddOpen(false)}
        categoryItems={categoryItems}
      />

      {selected && mode === 'detail' && (
        <HazardDetailSheet
          hazard={selected}
          onClose={closeAll}
          onRectify={() => setMode('rectify')}
          onReview={() => setMode('review')}
          onDeleted={closeAll}
        />
      )}

      {selected && mode === 'rectify' && (
        <RectifySheet
          hazard={selected}
          onClose={closeAll}
          onSuccess={closeAll}
        />
      )}

      {selected && mode === 'review' && (
        <ReviewSheet
          hazard={selected}
          onClose={closeAll}
          onSuccess={closeAll}
        />
      )}
    </>
  )
}
