import { siteName, siteTitle } from "@/lib/site";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const notoSansKr = localFont({ src: "./fonts/noto-sans-kr.ttf", weight: "100 900", display: "swap", preload: false, variable: "--font-noto-sans-kr" });
export const metadata: Metadata = {
  title: { default: siteTitle, template: `%s — ${siteTitle}` },
  openGraph: { title: siteTitle, description: "메리츠증권 Open API·Super365로 운용하는 QQQ SMA200 전략과 TQQQ·SPYM 자동매매 대시보드", type: "website" },
  description: "메리츠증권 Open API와 Super365 계좌를 사용하는 QQQ SMA200 기반 TQQQ·SPYM 자동매매 대시보드",
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko" className={notoSansKr.variable}><body><a className="skip-link" href="#main">본문 바로가기</a><SiteHeader /><main id="main" aria-label={siteName} className="site-main">{children}</main>
    <footer className="site-footer"><span><span className="footer-credit"><span>© 2026 DaLae37.</span><a className="cc-license" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="license noreferrer noopener" aria-label="Creative Commons Attribution 4.0 International 라이선스"><span>CC BY 4.0.</span><span className="cc-license-icons" aria-hidden="true"><img src="/license/cc.svg" width="14" height="14" alt="" /><img src="/license/by.svg" width="14" height="14" alt="" /></span></a></span> <span className="footer-separator">/</span> <a href="https://openapi.imeritz.com/" target="_blank" rel="noreferrer">메리츠증권 Open API</a> · Super365</span><span>Charts by <a href="https://www.tradingview.com/" target="_blank" rel="noreferrer">TradingView</a> <span className="footer-separator">/</span> Built with OpenAI Codex <span className="footer-separator">/</span> Code: BSD 3-Clause</span></footer></body></html>;
}
