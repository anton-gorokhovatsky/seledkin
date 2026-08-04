import type { Metadata, Viewport } from "next";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const siteUrl = basePath
  ? `https://anton-gorokhovatsky.github.io${basePath}`
  : "https://ks.fish";
const heroUrl = `${siteUrl}/images/hero-ocean.jpg`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Рыбная лавка капитана Селедкина",
    template: "%s — капитан Селедкин",
  },
  description:
    "Качественная рыба на каждый день, морепродукты, икра и рыбные деликатесы в Москве. Доставка по Москве и магазин на улице Строителей.",
  applicationName: "Рыбная лавка капитана Селедкина",
  alternates: {
    canonical: `${siteUrl}/`,
  },
  icons: {
    icon: `${basePath}/images/logo.png`,
    shortcut: `${basePath}/images/logo.png`,
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: `${siteUrl}/`,
    siteName: "Рыбная лавка капитана Селедкина",
    title: "Рыбная лавка капитана Селедкина",
    description:
      "Рыба, морепродукты и деликатесы в Москве — выбираем сами и подсказываем, как приготовить.",
    images: [
      {
        url: heroUrl,
        width: 1680,
        height: 1120,
        alt: "Темное море — Рыбная лавка капитана Селедкина",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Рыбная лавка капитана Селедкина",
    description: "Качественная рыба на каждый день в Москве.",
    images: [heroUrl],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
