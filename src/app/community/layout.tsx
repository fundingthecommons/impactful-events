import "./community.css";
import CommunitySidebar from "./CommunitySidebar";

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="community-layout">
      <CommunitySidebar />
      <main className="community-content">{children}</main>
    </div>
  );
}
