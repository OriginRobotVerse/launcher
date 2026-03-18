import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "Origin — Agent Controller",
  description: "Control your Origin devices through natural language",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
