import React from 'react';
import PageLayout from '../components/PageLayout';
import TrashComponent from '../components/pages/TrashComponent';

export default function TrashPage() {
  return (
    <PageLayout title="Lixeira" subtitle="Tickets e conversas excluídos">
      <TrashComponent />
    </PageLayout>
  );
}
