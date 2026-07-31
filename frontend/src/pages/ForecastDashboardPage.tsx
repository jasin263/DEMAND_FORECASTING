import React, { useState } from 'react';
import DashboardHeader from '../components/DashboardHeader';
import KPIBentoGrid from '../components/KPIBentoGrid';
import ForecastChartSection from '../components/ForecastChartSection';
import SKUDrilldownTable from '../components/SKUDrilldownTable';
import ExceptionPanel from '../components/ExceptionPanel';

export default function ForecastDashboardPage() {
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');

  return (
    <div className="space-y-6">
      <DashboardHeader category={category} onCategoryChange={setCategory} location={location} onLocationChange={setLocation} />
      <KPIBentoGrid />
      <div className="grid grid-cols-1 xl:grid-cols-3 2xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 2xl:col-span-2 space-y-6">
          <ForecastChartSection category={category} />
        </div>
        <div className="xl:col-span-1 2xl:col-span-1">
          <ExceptionPanel />
        </div>
      </div>
      <SKUDrilldownTable category={category} location={location} />
    </div>
  );
}
