import React from 'react';
import PageLayout from '../components/PageLayout';
import AgentsComponent from '../components/pages/AgentsComponent';

export default function AgentsPage() {
  return (
    <PageLayout 
      title="Gerenciamento de Agentes" 
      subtitle="Controle de usuários e permissões do sistema"
    >
      <AgentsComponent />
    </PageLayout>
  );
}
