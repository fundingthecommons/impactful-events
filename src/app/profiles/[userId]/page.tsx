import { ProfileDisplayClient } from "./ProfileDisplayClient";

interface ProfilePageProps {
  params: Promise<{
    userId: string;
  }>;
}

export async function generateMetadata({ params }: ProfilePageProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const resolvedParams = await params;
  return {
    title: `Profile - FtC Platform`,
    description: "View member profile",
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const resolvedParams = await params;
  return <ProfileDisplayClient userId={resolvedParams.userId} />;
}
