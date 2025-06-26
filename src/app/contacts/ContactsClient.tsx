"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export default function ContactsClient() {
  const { data: contacts, isLoading, error, refetch } = api.contact.getContacts.useQuery();
  const importContacts = api.contact.importGoogleContacts.useMutation();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await importContacts.mutateAsync();
      await refetch();
    } catch (e) {
      // handle error if needed
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div style={{ marginTop: 24 }}>
      <button onClick={handleSync} disabled={syncing || importContacts.isPending}>
        {syncing || importContacts.isPending ? "Syncing..." : "Sync Google Contacts"}
      </button>
      {isLoading && <div>Loading contacts...</div>}
      {error && <div>Error loading contacts: {error.message}</div>}
      <pre>{JSON.stringify(contacts, null, 2)}</pre>
      {importContacts.error && (
        <div style={{ color: 'red' }}>Sync error: {importContacts.error.message}</div>
      )}
    </div>
  );
} 