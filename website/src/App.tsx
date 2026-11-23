import React from 'react';
import { TelemetryProvider, useTelemetry } from './context/TelemetryContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { Toast } from './components/layout/Toast';

import { DashboardPage } from './pages/DashboardPage';
import { LiveMonitoringPage } from './pages/LiveMonitoringPage';
import { FireDetectionPage } from './pages/FireDetectionPage';
import { AlertsPage } from './pages/AlertsPage';
import { ReportsAnalyticsPage } from './pages/ReportsAnalyticsPage';
import { DeviceInformationPage } from './pages/DeviceInformationPage';
import { SettingsPage } from './pages/SettingsPage';

const AppContent: React.FC = () => {
  const { currentPage } = useTelemetry();

  const renderActivePage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'live-monitoring':
        return <LiveMonitoringPage />;
      case 'fire-detection':
        return <FireDetectionPage />;
      case 'alerts':
        return <AlertsPage />;
      case 'reports-analytics':
        return <ReportsAnalyticsPage />;
      case 'device-information':
        return <DeviceInformationPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FAF7F2] text-stone-900 antialiased flex flex-col selection:bg-stone-900 selection:text-white">
      <Header />
      <div className="flex w-full pt-16 flex-1 min-h-[calc(100vh-4rem)]">
        <Sidebar />
        <main className="w-full lg:ml-64 lg:w-[calc(100%-16rem)] min-w-0 p-3.5 sm:p-6 lg:p-8 pb-24 lg:pb-12 flex-1">
          <div className="w-full max-w-[1920px] mx-auto">
            {renderActivePage()}
          </div>
        </main>
      </div>
      <MobileBottomNav />
      <Toast />
    </div>
  );
};

export default function App() {
  return (
    <TelemetryProvider>
      <AppContent />
    </TelemetryProvider>
  );
}
