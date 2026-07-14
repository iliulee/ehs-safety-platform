import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { featureFlags } from '@/config/features'
import HomePage from '@/pages/home/HomePage'
import ProjectListPage from '@/pages/projects/ProjectListPage'
import SubcontractorListPage from '@/pages/subcontractors/SubcontractorListPage'
import WorkerListPage from '@/pages/workers/WorkerListPage'
import WorkerEditPage from '@/pages/workers/WorkerEditPage'
import WorkerDetailPage from '@/pages/workers/WorkerDetailPage'
import EducationListPage from '@/pages/education/EducationListPage'
import TrainingListPage from '@/pages/training/TrainingListPage'
import LogListPage from '@/pages/dailylog/LogListPage'
import HazardListPage from '@/pages/inspection/HazardListPage'
import HazardIdentificationPage from '@/pages/hazard-identification/HazardIdentificationPage'
import HazardEnginePage from '@/pages/hazard-engine/HazardEnginePage'
import PermitListPage from '@/pages/permits/PermitListPage'
import AcceptanceListPage from '@/pages/acceptance/AcceptanceListPage'
import MeetingPage from '@/pages/meetings/MeetingPage'
import CorrespondencePage from '@/pages/correspondences/CorrespondencePage'
import DashboardPage from '@/pages/statistics/DashboardPage'
import ReportCenterPage from '@/pages/reports/ReportCenterPage'
import TemplateLibraryPage from '@/pages/templates/TemplateLibraryPage'
import GenerateWizardPage from '@/pages/generate/GenerateWizardPage'
import AiChatPage from '@/pages/ai/AiChatPage'
import KnowledgePage from '@/pages/knowledge/KnowledgePage'
import DocxEditorPage from '@/pages/editor/DocxEditorPage'
import XlsxEditorPage from '@/pages/editor/XlsxEditorPage'
import DailyReportPage from '@/pages/report/DailyReportPage'
import SettingsPage from '@/pages/settings/SettingsPage'
import VariableSettingsPage from '@/pages/settings/VariableSettingsPage'
import DataMigrationPage from '@/pages/settings/DataMigrationPage'
// 新模块
import EquipmentPage from '@/pages/equipment/EquipmentPage'
import EquipmentEditPage from '@/pages/equipment/EquipmentEditPage'
import PpePage from '@/pages/ppe/PpePage'
import EmergencyPage from '@/pages/emergency/EmergencyPage'
import AccidentPage from '@/pages/accident/AccidentPage'
import SafetyCostPage from '@/pages/safety-cost/SafetyCostPage'

function FeatureRoute({ flag, children }: { flag: boolean; children: React.ReactNode }) {
  return flag ? <>{children}</> : <Navigate to="/home" replace />
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<HomePage />} />
        {/* 基础管理 */}
        <Route path="/projects" element={<FeatureRoute flag={featureFlags.projectManagement}><ProjectListPage /></FeatureRoute>} />
        <Route path="/subcontractors" element={<FeatureRoute flag={featureFlags.subcontractorManagement}><SubcontractorListPage /></FeatureRoute>} />
        <Route path="/workers" element={<FeatureRoute flag={featureFlags.workerManagement}><WorkerListPage /></FeatureRoute>} />
        <Route path="/workers/new" element={<FeatureRoute flag={featureFlags.workerManagement}><WorkerEditPage /></FeatureRoute>} />
        <Route path="/workers/:id" element={<FeatureRoute flag={featureFlags.workerManagement}><WorkerDetailPage /></FeatureRoute>} />
        <Route path="/workers/:id/edit" element={<FeatureRoute flag={featureFlags.workerManagement}><WorkerEditPage /></FeatureRoute>} />
        <Route path="/equipment" element={<FeatureRoute flag={featureFlags.equipmentManagement}><EquipmentPage /></FeatureRoute>} />
        <Route path="/equipment/new" element={<FeatureRoute flag={featureFlags.equipmentManagement}><EquipmentEditPage /></FeatureRoute>} />
        <Route path="/equipment/:id/edit" element={<FeatureRoute flag={featureFlags.equipmentManagement}><EquipmentEditPage /></FeatureRoute>} />
        {/* 安全过程 */}
        <Route path="/education" element={<FeatureRoute flag={featureFlags.educationManagement}><EducationListPage /></FeatureRoute>} />
        <Route path="/training" element={<FeatureRoute flag={featureFlags.trainingManagement}><TrainingListPage /></FeatureRoute>} />
        <Route path="/dailylog" element={<FeatureRoute flag={featureFlags.dailyLog}><LogListPage /></FeatureRoute>} />
        <Route path="/inspection" element={<FeatureRoute flag={featureFlags.hazardManagement}><HazardListPage /></FeatureRoute>} />
        <Route path="/hazard-identification" element={<FeatureRoute flag={featureFlags.hazardSource}><HazardIdentificationPage /></FeatureRoute>} />
        <Route path="/hazard-project" element={<FeatureRoute flag={featureFlags.dangerousProject}><HazardEnginePage /></FeatureRoute>} />
        <Route path="/permits" element={<FeatureRoute flag={featureFlags.workPermit}><PermitListPage /></FeatureRoute>} />
        <Route path="/acceptance" element={<FeatureRoute flag={featureFlags.acceptance}><AcceptanceListPage /></FeatureRoute>} />
        {/* 台账报表 */}
        <Route path="/templates" element={<FeatureRoute flag={featureFlags.templateLibrary || featureFlags.documentGeneration}><TemplateLibraryPage /></FeatureRoute>} />
        <Route path="/generate" element={<FeatureRoute flag={featureFlags.documentGeneration}><GenerateWizardPage /></FeatureRoute>} />
        <Route path="/reports" element={<FeatureRoute flag={featureFlags.reportCenter}><ReportCenterPage /></FeatureRoute>} />
        <Route path="/statistics" element={<FeatureRoute flag={featureFlags.dashboard}><DashboardPage /></FeatureRoute>} />
        {/* 安全物资 */}
        <Route path="/ppe" element={<FeatureRoute flag={featureFlags.ppeManagement}><PpePage /></FeatureRoute>} />
        <Route path="/emergency" element={<FeatureRoute flag={featureFlags.emergencyManagement}><EmergencyPage /></FeatureRoute>} />
        <Route path="/safety-cost" element={<FeatureRoute flag={featureFlags.safetyCostManagement}><SafetyCostPage /></FeatureRoute>} />
        {/* 事故与沟通 */}
        <Route path="/accidents" element={<FeatureRoute flag={featureFlags.accidentManagement}><AccidentPage /></FeatureRoute>} />
        <Route path="/meetings" element={<FeatureRoute flag={featureFlags.meeting}><MeetingPage /></FeatureRoute>} />
        <Route path="/correspondences" element={<FeatureRoute flag={featureFlags.correspondence}><CorrespondencePage /></FeatureRoute>} />
        {/* 智能工具 */}
        <Route path="/ai" element={<FeatureRoute flag={featureFlags.aiAssistant}><AiChatPage /></FeatureRoute>} />
        <Route path="/knowledge" element={<FeatureRoute flag={featureFlags.knowledgeBase}><KnowledgePage /></FeatureRoute>} />
        <Route path="/editor" element={<Navigate to="/templates" replace />} />
        <Route path="/editor/docx" element={<FeatureRoute flag={featureFlags.docxEditor}><DocxEditorPage /></FeatureRoute>} />
        <Route path="/editor/xlsx" element={<FeatureRoute flag={featureFlags.docxEditor}><XlsxEditorPage /></FeatureRoute>} />
        {/* v4.1.0 日报编辑 */}
        <Route path="/report/daily" element={<DailyReportPage />} />
        {/* 系统 */}
        <Route path="/settings" element={<FeatureRoute flag={featureFlags.settings}><SettingsPage /></FeatureRoute>} />
        <Route path="/settings/variables" element={<FeatureRoute flag={featureFlags.variableSettings}><VariableSettingsPage /></FeatureRoute>} />
        <Route path="/settings/migration" element={<FeatureRoute flag={featureFlags.settings}><DataMigrationPage /></FeatureRoute>} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Route>
    </Routes>
  )
}
