import React from 'react';
import PageLayout from '../components/PageLayout';
import IntelligentLibraryManager from '../components/admin/IntelligentLibraryManager';

const LibraryManagerPage = () => {
  return (
    <PageLayout title="Gerenciador Inteligente de Bibliotecas">
      <IntelligentLibraryManager />
    </PageLayout>
  );
};

export default LibraryManagerPage;
