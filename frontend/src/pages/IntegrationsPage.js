import React from 'react';
import PageLayout from '../components/PageLayout';
import IntegrationsComponent from '../components/pages/IntegrationsComponent';

export default function IntegrationsPage() {
  return (
    <PageLayout title="Integrations" subtitle="Manage system integrations">
      <IntegrationsComponent />
    </PageLayout>
  );
}