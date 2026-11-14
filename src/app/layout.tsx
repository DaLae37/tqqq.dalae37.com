import { siteName, siteTitle } from "@/lib/site";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const notoSansKr = localFont({ src: "./fonts/noto-sans-kr.ttf", weight: "100 900", display: "swap", preload: false, variable: "--font-noto-sans-kr" });
export const metadata: Metadata = {
  title: { default: siteTitle, template: `%s — ${siteTitle}` },
  openGraph: { title: siteTitle, description: "QQQ SMA200 전략과 TQQQ·SPYM 거래를 확인하는 대시보드", type: "website" },
  description: "QQQ 전략 신호와 TQQQ, SPYM 자동매매 엔진을 관찰하는 개인 대시보드",
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko" className={notoSansKr.variable}><body><a className="skip-link" href="#main">본문 바로가기</a><SiteHeader /><main id="main" aria-label={siteName} className="site-main">{children}</main>
    <footer className="site-footer"><span>© 2026 DaLae37 <span className="footer-separator">/</span> Personal trading observatory</span><span>Charts by <a href="https://www.tradingview.com/" target="_blank" rel="noreferrer">TradingView</a> <span className="footer-separator">/</span> Built with OpenAI Codex <span className="footer-separator">/</span> BSD 3-Clause</span></footer></body></html>;
}
