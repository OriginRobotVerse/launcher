"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/devices", label: "Devices" },
  { href: "/apps", label: "Apps" },
  { href: "/simulators", label: "Simulators" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-wire bg-panel">
      <div className="mx-auto flex max-w-7xl items-center gap-8 px-6 py-3">
        <Link href="/" className="text-phosphor font-bold text-sm tracking-wider">
          ORIGIN
        </Link>
        <div className="flex gap-6">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-xs tracking-wide transition-colors ${
                  active ? "text-signal" : "text-dim hover:text-signal"
                }`}
              >
                {link.label.toUpperCase()}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
