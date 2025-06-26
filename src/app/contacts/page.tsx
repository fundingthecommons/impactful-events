import { api, HydrateClient } from "~/trpc/server";
import dynamic from "next/dynamic";

//const ContactsClient = dynamic(() => import("./ContactsClient"), { ssr: false });
import ContactsClient from "./ContactsClient";

export default async function ContactsPage() {
    const contacts = await api.contact.getContacts();
    return (
        <HydrateClient>
            <h3>Contacts</h3>
            <pre>{JSON.stringify(contacts, null, 2)}</pre>
            <ContactsClient />
        </HydrateClient>
    );
}