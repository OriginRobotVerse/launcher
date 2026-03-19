import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Origin — Control anything",
  description:
    "Origin is the runtime that sits between your code and any physical device. Flash the firmware once. Write apps forever.",
  openGraph: {
    title: "Origin — Control anything",
    description:
      "A runtime for Arduinos, Unitrees, Humanoid robots and physical devices. Flash the firmware once. Write apps forever.",
    images: [
      {
        url: "/og-image.png",
        width: 1168,
        height: 601,
        alt: "Origin — Control anything.",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Origin — Control anything",
    description:
      "A runtime for Arduinos, Unitrees, Humanoid robots and physical devices. and physical devices.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ scrollBehavior: "smooth" }}>
      <body className={jetbrainsMono.variable}>{children}</body>
    </html>
  );
}
