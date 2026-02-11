import type { Metadata } from "next";
import "./docs.css";
import DocsSidebar from "./DocsSidebar";
import DocsTableOfContents from "./DocsTableOfContents";

export const metadata: Metadata = {
  title: "Documentation - Impactful Events",
  description:
    "Learn how to use the Impactful Events platform to manage events, schedules, and more.",
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="docs-layout">
      <DocsSidebar />
      <main className="docs-content-wrapper">
        <div className="docs-content">{children}</div>
      </main>
      <DocsTableOfContents />
    </div>
  );
}
