"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/scan", label: "Scan & Quote" },
  { href: "/jobs/new", label: "New Job" },
  { href: "/jobs", label: "Jobs" },
  { href: "/settings/pricing", label: "Pricing" },
];

export default function AppNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="app-nav-wrap">
      <div className="app-nav-outer">
        <div className="app-nav">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : item.href === "/jobs"
                ? pathname === "/jobs"
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
        <button
          type="button"
          className="nav-back-btn"
          onClick={() => router.back()}
        >
          ← Back
        </button>
      </div>
    </div>
  );
}