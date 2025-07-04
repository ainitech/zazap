import React from 'react';
import PageLayout from '../components/PageLayout';
import FavoritesComponent from '../components/pages/FavoritesComponent';

export default function FavoritesPage() {
  return (
    <PageLayout title="Favoritos" subtitle="Tickets e conversas marcados como favoritos">
      <FavoritesComponent />
    </PageLayout>
  );
}
