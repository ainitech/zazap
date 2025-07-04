import React from 'react';
import PageLayout from '../components/PageLayout';
import SessionsComponent from '../components/pages/SessionsComponent';

export default function SessionsPage() {
  return (
    <PageLayout title="Sessions" subtitle="Manage WhatsApp sessions">
      <SessionsComponent />
    </PageLayout>
  );
}