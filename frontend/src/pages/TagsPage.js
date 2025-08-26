import React from 'react';
import PageLayout from '../components/PageLayout';
import TagsComponent from '../components/pages/TagsComponent';

export default function TagsPage() {
  return (
    <PageLayout 
      title="Tags" 
      subtitle="Organize e classifique seus atendimentos com tags inteligentes"
    >
      <TagsComponent />
    </PageLayout>
  );
}
