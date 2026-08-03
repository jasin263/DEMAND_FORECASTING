import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import ErrorBoundary from './components/ErrorBoundary';
import ForecastRunningOverlay from './components/ForecastRunningOverlay';
import ForecastDashboardPage from './pages/ForecastDashboardPage';
import ExceptionsPage from './pages/ExceptionsPage';
import ScenariosPage from './pages/ScenariosPage';
import OnboardingWizardPage from './pages/OnboardingWizardPage';
import ConfigurationPanelPage from './pages/ConfigurationPanelPage';
import DataSourcesPage from './pages/DataSourcesPage';
import ExportPage from './pages/ExportPage';
import ModelAnalyticsPage from './pages/ModelAnalyticsPage';
import UserFlowPage from './pages/UserFlowPage';
import SKUDetailPage from './pages/SKUDetailPage';
import NotFoundPage from './pages/NotFoundPage';
import BacktestingPage from './pages/BacktestingPage';
import SeasonalDecompPage from './pages/SeasonalDecompPage';
import SimulationsPage from './pages/SimulationsPage';
import DemandSensingPage from './pages/DemandSensingPage';
import InventoryPage from './pages/InventoryPage';
import ExternalFactorsPage from './pages/ExternalFactorsPage';
import CollaborationPage from './pages/CollaborationPage';
import ConsensusPage from './pages/ConsensusPage';
import DataMaturityPage from './pages/DataMaturityPage';
import AnalyticsMaturityPage from './pages/AnalyticsMaturityPage';

function ProtectedRoute({ children }: { children: React.ReactElement }) {
  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ForecastRunningOverlay />
      <Routes>
        <Route path="/" element={<OnboardingWizardPage />} />
        <Route path="/dashboard" element={<AppLayout><ForecastDashboardPage /></AppLayout>} />
        <Route path="/exceptions" element={<ProtectedRoute><AppLayout><ExceptionsPage /></AppLayout></ProtectedRoute>} />
        <Route path="/scenarios" element={<ProtectedRoute><AppLayout><ScenariosPage /></AppLayout></ProtectedRoute>} />
        <Route path="/onboarding-wizard" element={<OnboardingWizardPage />} />
        <Route path="/configuration-panel" element={<ConfigurationPanelPage />} />
        <Route path="/data-sources" element={<ProtectedRoute><AppLayout><DataSourcesPage /></AppLayout></ProtectedRoute>} />
        <Route path="/export" element={<ProtectedRoute><AppLayout><ExportPage /></AppLayout></ProtectedRoute>} />
        <Route path="/model-analytics" element={<ProtectedRoute><AppLayout><ModelAnalyticsPage /></AppLayout></ProtectedRoute>} />
        <Route path="/user-flow" element={<ProtectedRoute><AppLayout><UserFlowPage /></AppLayout></ProtectedRoute>} />
        <Route path="/skus/:skuId" element={<ProtectedRoute><AppLayout><SKUDetailPage /></AppLayout></ProtectedRoute>} />
        <Route path="/backtesting" element={<ProtectedRoute><AppLayout><BacktestingPage /></AppLayout></ProtectedRoute>} />
        <Route path="/seasonal-decomposition" element={<ProtectedRoute><AppLayout><SeasonalDecompPage /></AppLayout></ProtectedRoute>} />
        <Route path="/simulations" element={<ProtectedRoute><AppLayout><SimulationsPage /></AppLayout></ProtectedRoute>} />
        <Route path="/demand-sensing" element={<ProtectedRoute><AppLayout><DemandSensingPage /></AppLayout></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute><AppLayout><InventoryPage /></AppLayout></ProtectedRoute>} />
        <Route path="/external-factors" element={<ProtectedRoute><AppLayout><ExternalFactorsPage /></AppLayout></ProtectedRoute>} />
        <Route path="/collaboration" element={<ProtectedRoute><AppLayout><CollaborationPage /></AppLayout></ProtectedRoute>} />
        <Route path="/consensus" element={<ProtectedRoute><AppLayout><ConsensusPage /></AppLayout></ProtectedRoute>} />
        <Route path="/data-maturity" element={<ProtectedRoute><AppLayout><DataMaturityPage /></AppLayout></ProtectedRoute>} />
        <Route path="/analytics-maturity" element={<ProtectedRoute><AppLayout><AnalyticsMaturityPage /></AppLayout></ProtectedRoute>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}
