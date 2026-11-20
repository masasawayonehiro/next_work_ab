import type { Metadata } from "next";
import { Noto_Sans_JP, Quicksand, Zen_Maru_Gothic } from "next/font/google";
import "./globals.css";

const fontBody = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--nw-font-body",
  display: "swap",
});

const fontRound = Zen_Maru_Gothic({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--nw-font-round",
  display: "swap",
});

const fontLatin = Quicksand({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--nw-font-latin",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "next work 札幌", template: "%s｜next work 札幌" },
  description:
    "札幌市の就労継続支援A型・B型、就労移行支援などの事業所と障害者求人を、やさしく探せる検索サイト。",
  icons: { icon: "/assets/img/favicon.svg" },
};

export const viewport = {
  themeColor: "#fff0f4",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${fontBody.variable} ${fontRound.variable} ${fontLatin.variable}`}>
      <body>
        <div className="bg-blobs" aria-hidden="true">
          <span className="blob blob--1" />
          <span className="blob blob--2" />
          <span className="blob blob--3" />
        </div>
        {children}
      </body>
    </html>
  );
}
