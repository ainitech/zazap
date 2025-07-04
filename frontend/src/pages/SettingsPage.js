import React from 'react';
import PageLayout from '../components/PageLayout';
import SettingsComponent from '../components/pages/SettingsComponent';

export default function SettingsPage() {
  return (
    <PageLayout title="Settings" subtitle="System configuration">
      <SettingsComponent />
    </PageLayout>
  );
}