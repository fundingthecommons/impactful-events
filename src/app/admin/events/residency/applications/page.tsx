import { redirect } from "next/navigation";

export default function ResidencyApplicationsPage() {
  // Redirect to the actual residency applications page
  redirect("/admin/events/funding-commons-residency-2025/applications");
}
