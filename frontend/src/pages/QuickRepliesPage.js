import React from 'react';
import PageLayout from '../components/PageLayout';
import QuickRepliesComponent from '../components/pages/QuickRepliesComponent';

export default function QuickRepliesPage() {
  return (
    <PageLayout title="Quick Replies" subtitle="Crie e gerencie atalhos de mensagens e mídias">
      <QuickRepliesComponent />
    </PageLayout>
  );
}
