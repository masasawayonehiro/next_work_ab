"use client";

/**
 * site と同じクライアントJS（GSAP・データ・common・ページ固有）を順に読む。
 * データは /api/data（D1）優先。無いときだけ /data/items.js にフォールバック。
 * D1 をローカルで見るときは next dev ではなく npm run dev:pages（wrangler pages dev）。
 */
import { useEffect } from "react";

type Page = "search" | "mypage";

declare global {
  interface Window {
    NW_DATA?: { meta: Record<string, unknown>; items: unknown[] };
  }
}

const PAGE_SCRIPTS: Record<Page, string[]> = {
  search: ["/assets/js/common.js", "/assets/js/search.js"],
  mypage: ["/assets/js/common.js", "/assets/js/mypage.js"],
};

const GSAP = [
  "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/Flip.min.js",
];

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-nw-src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "1") resolve();
      else existing.addEventListener("load", () => resolve(), { once: true });
      return;
    }
    const el = document.createElement("script");
    el.src = src;
    el.async = false;
    el.dataset.nwSrc = src;
    el.onload = () => {
      el.dataset.loaded = "1";
      resolve();
    };
    el.onerror = () => reject(new Error(`script failed: ${src}`));
    document.body.appendChild(el);
  });
}

/** D1 API → 失敗時は静的 items.js（next dev / API 障害時のフォールバック） */
async function loadNwData() {
  try {
    const res = await fetch("/api/data", { credentials: "same-origin" });
    if (!res.ok) throw new Error(`api ${res.status}`);
    const data = (await res.json()) as { meta?: unknown; items?: unknown[]; error?: string };
    if (data.error || !Array.isArray(data.items)) throw new Error(data.error ?? "bad payload");
    window.NW_DATA = { meta: (data.meta as Record<string, unknown>) ?? {}, items: data.items };
    return "api";
  } catch {
    await loadScript("/data/items.js");
    return "items.js";
  }
}

export function SiteScripts({ page }: { page: Page }) {
  useEffect(() => {
    document.body.dataset.page = page;
    let cancelled = false;
    (async () => {
      try {
        for (const src of GSAP) {
          if (cancelled) return;
          await loadScript(src);
        }
        if (cancelled) return;
        const source = await loadNwData();
        if (cancelled) return;
        if (process.env.NODE_ENV === "development") {
          console.info(`[NW] data source: ${source}`);
        }
        for (const src of PAGE_SCRIPTS[page]) {
          if (cancelled) return;
          await loadScript(src);
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page]);

  // App Router のソフト遷移だと page 固有 JS が再実行されないため、ページ間はフル読み込みにする
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!(a instanceof HTMLAnchorElement)) return;
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("tel:") || href.startsWith("http")) return;
      if (href === "/" || href.startsWith("/?") || href === "/mypage" || href.startsWith("/mypage?")) {
        e.preventDefault();
        window.location.assign(a.href);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
