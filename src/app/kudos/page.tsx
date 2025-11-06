import { redirect } from "next/navigation";
import { getServerAuthSession } from "~/server/auth";
import { KudosLeaderboardClient } from "./KudosLeaderboardClient";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Kudos Leaderboard | Impactful Events",
  description: "View the kudos leaderboard and activity timeline",
};

export default async function KudosLeaderboardPage() {
  const session = await getServerAuthSession();

  if (!session) {
    redirect("/api/auth/signin");
  }

  return <KudosLeaderboardClient />;
}
