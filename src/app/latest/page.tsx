import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import LatestClient from "./LatestClient";

export const metadata = {
  title: "The Commons - Latest",
  description: "View all project updates and asks/offers from the community",
};

export default async function LatestPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin");
  }

  return <LatestClient />;
}
