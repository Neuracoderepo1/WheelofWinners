import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WheelofWinners | Rewards, made clear",
  description: "A transparent loyalty marketplace for earning points and redeeming guaranteed rewards.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
