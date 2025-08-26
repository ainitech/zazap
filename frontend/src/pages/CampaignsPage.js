import React from 'react';
import PageLayout from '../components/PageLayout';
import CampaignsComponent from '../components/pages/CampaignsComponent';

const CampaignsPage = () => {
  return (
    <PageLayout 
      title="Campanhas em Massa" 
      subtitle="Gerencie campanhas de WhatsApp para múltiplos contatos"
    >
      <CampaignsComponent />
    </PageLayout>
  );
};

export default CampaignsPage;
