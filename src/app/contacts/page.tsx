import { api, HydrateClient } from "~/trpc/server";
import { Table, Stack, Title, Text, Badge, Avatar, Group, Paper, Container } from "@mantine/core";
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import ContactsClient from "./ContactsClient";

export default async function ContactsPage() {
    // Check authentication and role
    const session = await auth();
    
    // Must be authenticated
    if (!session?.user) {
        redirect("/api/auth/signin?callbackUrl=/contacts");
    }
    
    // Must have staff or admin role
    if (session.user.role !== "staff" && session.user.role !== "admin") {
        redirect("/unauthorized");
    }
    const contacts = await api.contact.getContacts();
    
    // Transform contacts into table data format for Mantine Table
    const tableData = contacts ? {
        head: ['Contact', 'Email', 'Associated Sponsor', 'ID'],
        body: contacts.map((contact) => [
            // Contact column with avatar and name
            <Group gap="sm" key={`contact-${contact.id}`}>
                <Avatar size="sm" color="blue">
                    {contact.firstName[0]?.toUpperCase()}{contact.lastName[0]?.toUpperCase()}
                </Avatar>
                <Stack gap={0}>
                    <Text fw={500} size="sm">
                        {contact.firstName} {contact.lastName}
                    </Text>
                    <Text size="xs" c="dimmed">
                        {contact.email}
                    </Text>
                </Stack>
            </Group>,
            // Email column
            contact.email,
            // Sponsor column
            contact.sponsor ? (
                <Group gap="xs" key={`sponsor-${contact.id}`}>
                    <Avatar src={contact.sponsor.logoUrl} size="xs" radius="xl">
                        {contact.sponsor.name[0]?.toUpperCase()}
                    </Avatar>
                    <Stack gap={0}>
                        <Text size="sm" fw={500}>
                            {contact.sponsor.name}
                        </Text>
                        {contact.sponsor.websiteUrl && (
                            <Text size="xs" c="dimmed">
                                {contact.sponsor.websiteUrl.replace(/^https?:\/\//, "")}
                            </Text>
                        )}
                    </Stack>
                </Group>
            ) : (
                <Badge variant="light" color="gray" size="sm" key={`no-sponsor-${contact.id}`}>
                    No sponsor
                </Badge>
            ),
            // ID column  
            <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace' }} key={`id-${contact.id}`}>
                {contact.id}
            </Text>
        ])
    } : null;

    return (
        <HydrateClient>
            <Container size="xl" py="xl">
                <Stack gap="lg">
                    <Title order={2}>Contacts</Title>
                    
                    <Paper shadow="xs" p="md" radius="md" withBorder>
                        <Stack gap="md">
                            <Group justify="space-between" align="center">
                                <Text fw={500} size="lg">
                                    All Contacts ({contacts?.length ?? 0})
                                </Text>
                            </Group>
                            
                            {tableData && tableData.body.length > 0 ? (
                                <Table 
                                    data={tableData} 
                                    striped 
                                    highlightOnHover 
                                    withTableBorder 
                                    withColumnBorders
                                />
                            ) : (
                                <Text ta="center" c="dimmed" py="xl">
                                    No contacts found. Try syncing with Google Contacts below.
                                </Text>
                            )}
                        </Stack>
                    </Paper>
                    
                    <ContactsClient />
                </Stack>
            </Container>
        </HydrateClient>
    );
}