import React from 'react';
import AppLayout from '@/components/AppLayout';
import ConfigurationPanelClient from './components/ConfigurationPanelClient';

export default function ConfigurationPanelPage() {
  return (
    <AppLayout>
      <ConfigurationPanelClient />
    </AppLayout>
  );
}