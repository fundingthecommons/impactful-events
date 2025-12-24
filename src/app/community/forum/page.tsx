import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import ForumClient from "./ForumClient";

export const metadata = {
  title: "Community - Forum",
  description: "Discuss topics with the community",
};

export default async function ForumPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin");
  }

  return <ForumClient />;
}
