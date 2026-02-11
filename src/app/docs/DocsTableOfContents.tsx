"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export default function DocsTableOfContents() {
  const pathname = usePathname();
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  // Extract headings from page content
  useEffect(() => {
    // Small delay to ensure content is rendered
    const timer = setTimeout(() => {
      const headings = document.querySelectorAll(
        ".docs-content [id].docs-heading-h2, .docs-content [id].docs-heading-h3",
      );

      const tocItems: TocItem[] = Array.from(headings).map((el) => ({
        id: el.id,
        text: el.textContent ?? "",
        level: el.classList.contains("docs-heading-h3") ? 3 : 2,
      }));

      setItems(tocItems);

      // Set up Intersection Observer for active heading tracking
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setActiveId(entry.target.id);
            }
          }
        },
        { rootMargin: "-80px 0px -75% 0px" },
      );

      headings.forEach((heading) => observer.observe(heading));

      return () => {
        headings.forEach((heading) => observer.unobserve(heading));
      };
    }, 100);

    return () => clearTimeout(timer);
  }, [pathname]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      e.preventDefault();
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.pushState(null, "", `#${id}`);
        setActiveId(id);
      }
    },
    [],
  );

  if (items.length === 0) {
    return <aside className="docs-toc" />;
  }

  return (
    <aside className="docs-toc">
      <div className="docs-toc-header">On this page</div>
      <nav className="docs-toc-list">
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={(e) => handleClick(e, item.id)}
            className={`docs-toc-item${item.level === 3 ? " docs-toc-item-h3" : ""}${activeId === item.id ? " docs-toc-item-active" : ""}`}
          >
            {item.text}
          </a>
        ))}
      </nav>
    </aside>
  );
}
