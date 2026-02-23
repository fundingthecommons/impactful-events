import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { AIInteractionsClient } from "./AIInteractionsClient";

export default async function AdminAIInteractionsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin");
  }

  if (session.user.role !== "admin" && session.user.role !== "staff") {
    redirect("/");
  }

  return <AIInteractionsClient />;
}
