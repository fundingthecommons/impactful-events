import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import ThreadDetailClient from "./ThreadDetailClient";

interface PageProps {
  params: Promise<{ threadId: string }>;
}

export const metadata = {
  title: "Forum Thread",
  description: "View forum thread and comments",
};

export default async function ThreadPage({ params }: PageProps) {
  const session = await auth();
  const { threadId } = await params;

  if (!session?.user) {
    redirect("/signin");
  }

  return <ThreadDetailClient threadId={threadId} />;
}
