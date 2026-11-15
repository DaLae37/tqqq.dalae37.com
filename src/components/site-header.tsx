"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteTitle } from "@/lib/site";

export function SiteHeader() {
  const pathname = usePathname();
  const navigation = [{ path: "", label: "Dashboard" }, { path: "/strategy", label: "Strategy" },
    { path: "/market", label: "Market" }, { path: "/trades", label: "Trades" },
    { path: "/portfolio", label: "Portfolio" }, { path: "/engine", label: "Engine" }];
  const current = pathname.replace(/^\/dashboard(?=\/|$)/, "").replace(/^\/orders/, "/trades").replace(/^\/health/, "/engine") || "/";
  return <header className="site-header">
    <div className="header-inner">
      <Link className="brand" href="/" aria-label={`${siteTitle} — Dashboard`}><span className="brand-name">{siteTitle}</span><span className="brand-description">메리츠증권 Open API · Super365</span></Link>
      <div className="header-links"><a href="https://github.com/DaLae37/tqqq.dalae37.com" target="_blank" rel="noreferrer">GitHub ↗</a></div>
    </div>
    <nav className="main-nav" aria-label={`${siteTitle} 주 메뉴`}>
      {navigation.map((item) => {
        const active = item.path ? current === item.path || current.startsWith(`${item.path}/`) : current === "/";
        return <Link key={item.path} href={item.path || "/"} data-active={active || undefined} aria-current={active ? "page" : undefined}>{item.label}</Link>;
      })}
    </nav>
  </header>;
}
