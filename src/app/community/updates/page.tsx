import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import UpdatesClient from "./UpdatesClient";

export const metadata = {
  title: "Community - Updates",
  description: "View all project updates from the community",
};

export default async function UpdatesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin");
  }

  return <UpdatesClient />;
}
