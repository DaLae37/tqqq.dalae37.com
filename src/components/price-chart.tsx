"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const symbols = { TQQQ: "NASDAQ:TQQQ", QQQ: "NASDAQ:QQQ", SPYM: "AMEX:SPYM" };

export function PriceChart({ preview = false }: { preview?: boolean }) {
  const [symbol, setSymbol] = useState<keyof typeof symbols>("TQQQ");
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [refresh, setRefresh] = useState(0);
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setTheme(media.matches ? "dark" : "light");
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const target = host.current;
    if (!target || !theme) return;
    let disposed = false;
    setState("loading");
    const container = document.createElement("div");
    container.className = "tradingview-widget-container";
    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.textContent = JSON.stringify({
      autosize: true, symbol: symbols[symbol], interval: "D", timezone: "America/New_York", theme, style: "1", locale: "kr",
      allow_symbol_change: false, hide_top_toolbar: preview, hide_side_toolbar: preview, withdateranges: !preview,
      save_image: false, calendar: false, support_host: "https://www.tradingview.com",
    });
    // Only public chart settings enter the widget. Engine data stays in separate panels.
    const timeout = window.setTimeout(() => { if (!disposed) setState("error"); }, 15000);
    script.onerror = () => { if (!disposed) { window.clearTimeout(timeout); setState("error"); } };
    const observer = new MutationObserver(() => {
      const frame = container.querySelector("iframe");
      if (!frame) return;
      frame.title = `${symbol} 시세 — TradingView 공식 위젯`;
      frame.addEventListener("load", () => { if (!disposed) { window.clearTimeout(timeout); setState("ready"); } }, { once: true });
      observer.disconnect();
    });
    observer.observe(container, { childList: true, subtree: true });
    container.append(widget, script); target.replaceChildren(container);
    return () => { disposed = true; observer.disconnect(); window.clearTimeout(timeout); script.onerror = null; target.replaceChildren(); };
  }, [symbol, theme, preview, refresh]);
  return <section className="panel chart-panel" aria-labelledby="chart-title">
    <div className="panel-heading"><div><p className="eyebrow">MARKET</p><h2 id="chart-title">{preview ? "TQQQ 시세 미리보기" : "종목별 시세 차트"}</h2></div><span className="badge">TradingView</span></div>
    {!preview && <div className="chart-toolbar"><div className="segmented" aria-label="종목 선택">{(Object.keys(symbols) as Array<keyof typeof symbols>).map((item) => <button key={item} aria-pressed={symbol === item} onClick={() => setSymbol(item)}>{item}</button>)}</div></div>}
    <div className="chart-heading"><strong>{symbol}<small>{symbol === "QQQ" ? "전략 판단용 / 거래 종목 아님" : symbol === "SPYM" ? "장기 적립 종목" : "거래 종목"}</small></strong></div>
    <div ref={host} className="chart-canvas tradingview-host" aria-label={`${symbol} 시세 차트`} />
    <p className="tradingview-widget-copyright"><a href={`https://www.tradingview.com/symbols/${symbols[symbol].replace(":", "-")}/`} target="_blank" rel="noreferrer"><span className="blue-text">{symbol} chart</span></a><span> by TradingView</span></p>
    {state === "loading" && <p className="data-source" role="status">TradingView 위젯을 불러오고 있습니다.</p>}
    {state === "error" && <p className="notice" role="status">TradingView 위젯을 불러오지 못했습니다. 위 링크에서 차트를 확인하거나 <button className="text-link" onClick={() => setRefresh((value) => value + 1)}>다시 불러오기</button>를 선택하세요.</p>}
    <p className="footnote">시세 차트는 TradingView 공식 위젯을 사용합니다. 데이터 출처와 지연 여부는 위젯에서 확인하세요.</p>
    <p className="footnote">엔진이 판단한 SMA·완충 폭·신호는 <Link className="text-link" href="/strategy">Strategy</Link>에서, 본인의 주문·체결과 운용 성과는 <Link className="text-link" href="/trades">Trades</Link>와 <Link className="text-link" href="/portfolio">Portfolio</Link>에서 확인합니다. 위젯의 시세와 엔진의 판단 시점은 다를 수 있습니다.</p>
  </section>;
}
