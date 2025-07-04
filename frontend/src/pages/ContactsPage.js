import React from 'react';
import PageLayout from '../components/PageLayout';
import ContactsComponent from '../components/pages/ContactsComponent';

export default function ContactsPage() {
  return (
    <PageLayout title="Contacts" subtitle="Manage your contacts">
      <ContactsComponent />
    </PageLayout>
  );
}