import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { EmailsClient } from "./EmailsClient";

export default async function AdminEmailsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin");
  }

  if (session.user.role !== "admin" && session.user.role !== "staff") {
    redirect("/");
  }

  return <EmailsClient />;
}