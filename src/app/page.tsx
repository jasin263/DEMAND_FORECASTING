import React from 'react';
import AppLayout from '@/components/AppLayout';
import DashboardHeader from './components/DashboardHeader';
import KPIBentoGrid from './components/KPIBentoGrid';
import ForecastChartSection from './components/ForecastChartSection';
import SKUDrilldownTable from './components/SKUDrilldownTable';
import ExceptionPanel from './components/ExceptionPanel';

export default function ForecastDashboardPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <DashboardHeader />
        <KPIBentoGrid />
        <div className="grid grid-cols-1 xl:grid-cols-3 2xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 2xl:col-span-2 space-y-6">
            <ForecastChartSection />
          </div>
          <div className="xl:col-span-1 2xl:col-span-1">
            <ExceptionPanel />
          </div>
        </div>
        <SKUDrilldownTable />
      </div>
    </AppLayout>
  );
}