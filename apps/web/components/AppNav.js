"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/scan", label: "Scan & Quote" },
  { href: "/jobs", label: "Jobs" },
  { href: "/jobs/new", label: "Manual Entry" },
  { href: "/settings/pricing", label: "Pricing" },
];

export default function AppNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="app-nav-wrap">
      <div className="app-nav">
        <button
          type="button"
          className="nav-chip nav-chip-back"
          onClick={() => router.back()}
        >
          Back
        </button>

        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-chip ${active ? "active" : ""}`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}