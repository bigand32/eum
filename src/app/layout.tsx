import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/Providers";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: `${BRAND_NAME} - 보컬 코칭`,
  description: BRAND_TAGLINE,
};

export const viewport: Viewport = {
  themeColor: "#4401a9",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.8/dist/web/static/pretendard.css"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
      </head>
      <body className="flex justify-center antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
