import React from 'react';
import PageLayout from '../components/PageLayout';
import ArchivedComponent from '../components/pages/ArchivedComponent';

export default function ArchivedPage() {
  return (
    <PageLayout title="Arquivados" subtitle="Tickets e conversas arquivados">
      <ArchivedComponent />
    </PageLayout>
  );
}
