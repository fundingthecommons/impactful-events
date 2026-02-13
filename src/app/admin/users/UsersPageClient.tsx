"use client";

import { useState, useEffect } from "react";
import { Tabs, Container } from "@mantine/core";
import { IconUsers, IconUserCircle } from "@tabler/icons-react";
import UsersClient from "./UsersClient";
import ProfilesAdminClient from "./ProfilesAdminClient";

const VALID_TABS = ["management", "profiles"];

export default function UsersPageClient() {
  const [activeTab, setActiveTab] = useState<string>("management");

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && VALID_TABS.includes(hash)) {
      setActiveTab(hash);
    }
  }, []);

  const handleTabChange = (value: string | null) => {
    if (value) {
      setActiveTab(value);
      window.history.replaceState(null, "", `#${value}`);
    }
  };

  return (
    <Container size="xl" py="md">
      <Tabs value={activeTab} onChange={handleTabChange}>
        <Tabs.List mb="md">
          <Tabs.Tab value="management" leftSection={<IconUsers size={16} />}>
            Management
          </Tabs.Tab>
          <Tabs.Tab value="profiles" leftSection={<IconUserCircle size={16} />}>
            Profiles
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="management">
          {activeTab === "management" && <UsersClient />}
        </Tabs.Panel>

        <Tabs.Panel value="profiles">
          {activeTab === "profiles" && <ProfilesAdminClient />}
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}
