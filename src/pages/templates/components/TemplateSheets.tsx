import { ImportPreviewSheet } from './ImportPreviewSheet'
import { VariableMappingSheet } from './VariableMappingSheet'
import { BatchResultSheet } from './BatchResultSheet'
import { ManualVariablesSheet } from './ManualVariablesSheet'
import type { ImportPreviewItem, FailedScanItem } from '@/services/template-import.service'
import type { BatchRenderResult } from '@/services/generate.service'
import type { Template, VariableMapping } from '@/types'
import type { Dispatch, SetStateAction } from 'react'

interface TemplateSheetsProps {
  previewOpen: boolean
  setPreviewOpen: Dispatch<SetStateAction<boolean>>
  previewItems: ImportPreviewItem[]
  previewFailed: FailedScanItem[]
  importStrategy: 'skip' | 'overwrite'
  setImportStrategy: Dispatch<SetStateAction<'skip' | 'overwrite'>>
  onExecuteImport: () => void
  uploading: boolean
  selected: Template | null
  setSelected: Dispatch<SetStateAction<Template | null>>
  editedMappings: VariableMapping[]
  setEditedMappings: Dispatch<SetStateAction<VariableMapping[]>>
  onSaveMappings: () => void
  onGenerate: () => void
  generating: boolean
  batchOpen: boolean
  setBatchOpen: Dispatch<SetStateAction<boolean>>
  batchResult: BatchRenderResult | null
  manualOpen: boolean
  setManualOpen: Dispatch<SetStateAction<boolean>>
  manualVariables: VariableMapping[]
  manualValues: Record<string, string>
  setManualValues: Dispatch<SetStateAction<Record<string, string>>>
  onManualConfirm: () => void
}

export function TemplateSheets(props: TemplateSheetsProps) {
  return (
    <>
      <ImportPreviewSheet
        open={props.previewOpen}
        onClose={() => props.setPreviewOpen(false)}
        items={props.previewItems}
        failed={props.previewFailed}
        strategy={props.importStrategy}
        onStrategyChange={props.setImportStrategy}
        onConfirm={props.onExecuteImport}
        loading={props.uploading}
      />

      <VariableMappingSheet
        template={props.selected}
        open={!!props.selected}
        onClose={() => props.setSelected(null)}
        mappings={props.editedMappings}
        onMappingsChange={props.setEditedMappings}
        onSave={props.onSaveMappings}
        onGenerate={props.onGenerate}
        generating={props.generating}
      />

      <BatchResultSheet open={props.batchOpen} onClose={() => props.setBatchOpen(false)} result={props.batchResult} />

      <ManualVariablesSheet
        open={props.manualOpen}
        onClose={() => props.setManualOpen(false)}
        variables={props.manualVariables}
        values={props.manualValues}
        onChange={(name, value) =>
          props.setManualValues((prev) => ({ ...prev, [name]: value }))
        }
        onConfirm={props.onManualConfirm}
        loading={props.generating}
      />
    </>
  )
}
