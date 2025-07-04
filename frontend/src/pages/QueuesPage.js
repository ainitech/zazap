import React from 'react';
import PageLayout from '../components/PageLayout';
import QueuesComponent from '../components/pages/QueuesComponent';

export default function QueuesPage() {
  return (
    <PageLayout title="Filas" subtitle="Configure e gerencie suas filas de atendimento">
      <QueuesComponent />
    </PageLayout>
  );
}
