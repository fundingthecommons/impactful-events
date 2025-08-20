import { HydrateClient } from "~/trpc/server";
import RoleBasedHomepage from "./_components/RoleBasedHomepage";

export default async function Home() {
  return (
    <HydrateClient>
      <RoleBasedHomepage />
    </HydrateClient>
  );
}
