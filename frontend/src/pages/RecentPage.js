import React from 'react';
import PageLayout from '../components/PageLayout';
import RecentComponent from '../components/pages/RecentComponent';

export default function RecentPage() {
  return (
    <PageLayout title="Recent" subtitle="Recent conversations">
      <RecentComponent />
    </PageLayout>
  );
}