export interface FeatureFlags {
  home: boolean
  projectManagement: boolean
  subcontractorManagement: boolean
  workerManagement: boolean
  equipmentManagement: boolean
  educationManagement: boolean
  trainingManagement: boolean
  dailyLog: boolean
  hazardManagement: boolean
  hazardSource: boolean
  dangerousProject: boolean
  workPermit: boolean
  acceptance: boolean
  ppeManagement: boolean
  emergencyManagement: boolean
  safetyCostManagement: boolean
  accidentManagement: boolean
  meeting: boolean
  correspondence: boolean
  dashboard: boolean
  reportCenter: boolean
  templateLibrary: boolean
  documentGeneration: boolean
  aiAssistant: boolean
  knowledgeBase: boolean
  docxEditor: boolean
  settings: boolean
  variableSettings: boolean
}

export const featureFlags: FeatureFlags = {
  home: true,
  projectManagement: true,
  subcontractorManagement: true,
  workerManagement: true,
  equipmentManagement: true,
  educationManagement: true,
  trainingManagement: true,
  dailyLog: true,
  hazardManagement: true,
  hazardSource: true,
  dangerousProject: true,
  workPermit: true,
  acceptance: true,
  ppeManagement: true,
  emergencyManagement: true,
  safetyCostManagement: true,
  accidentManagement: true,
  meeting: true,
  correspondence: true,
  dashboard: true,
  reportCenter: true,
  templateLibrary: true,
  documentGeneration: true,
  aiAssistant: true,
  knowledgeBase: true,
  docxEditor: false,
  settings: true,
  variableSettings: true,
}

export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  return featureFlags[flag]
}
