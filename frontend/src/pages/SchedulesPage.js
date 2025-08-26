import React from 'react';
import PageLayout from '../components/PageLayout';
import SchedulesComponent from '../components/pages/SchedulesComponent';

export default function SchedulesPage() {
  return (
    <PageLayout title="Agendamentos" subtitle="Envios programados e lembretes">
      <SchedulesComponent />
    </PageLayout>
  );
}
