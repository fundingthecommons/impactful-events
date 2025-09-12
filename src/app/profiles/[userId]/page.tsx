import { ProfileDisplayClient } from "./ProfileDisplayClient";

interface ProfilePageProps {
  params: {
    userId: string;
  };
}

export async function generateMetadata({ params: _params }: ProfilePageProps) {
  return {
    title: `Profile - FtC Platform`,
    description: "View member profile",
  };
}

export default function ProfilePage({ params: _params }: ProfilePageProps) {
  return <ProfileDisplayClient userId={_params.userId} />;
}