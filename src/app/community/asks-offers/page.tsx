import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import AsksOffersClient from "./AsksOffersClient";

export const metadata = {
  title: "Community - Asks & Offers",
  description: "View all asks and offers from the community",
};

export default async function AsksOffersPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin");
  }

  return <AsksOffersClient />;
}
