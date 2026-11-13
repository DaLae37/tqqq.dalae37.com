"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteName } from "@/lib/site";

export function SiteHeader() {
  const pathname = usePathname();
  const demo = pathname === "/demo" || pathname.startsWith("/demo/");
  const base = demo ? "/demo" : "";
  const navigation = [{ path: "", label: "Dashboard" }, { path: "/strategy", label: "Strategy" },
    { path: "/market", label: "Market" }, { path: "/trades", label: "Trades" },
    { path: "/portfolio", label: "Portfolio" }, { path: "/engine", label: "Engine" }];
  const current = pathname.replace(/^\/(demo|dashboard)(?=\/|$)/, "").replace(/^\/orders/, "/trades").replace(/^\/health/, "/engine") || "/";
  return <header className="site-header">
    <div className="header-inner">
      <Link className="brand" href={base || "/"} aria-label={`${siteName} — Dashboard`}><span className="brand-name">{siteName}</span></Link>
      <div className="header-links"><span className="readonly-tag">READ ONLY</span><a href="https://github.com/DaLae37/tqqq.dalae37.com" target="_blank" rel="noreferrer">GitHub ↗</a></div>
    </div>
    <nav className="main-nav" aria-label={`${siteName} 주 메뉴`}>
      {navigation.map((item) => {
        const active = item.path ? current === item.path || current.startsWith(`${item.path}/`) : current === "/";
        return <Link key={item.path} href={`${base}${item.path}` || "/"} data-active={active || undefined} aria-current={active ? "page" : undefined}>{item.label}</Link>;
      })}
      <Link href={demo ? "/" : "/demo"}>{demo ? "실제 대시보드" : "합성 데모"}</Link>
    </nav>
  </header>;
}
