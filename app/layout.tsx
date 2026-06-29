import type { Metadata } from "next";
import { ThemeScript } from "@/app/components/ThemeScript";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CareSync — ระบบดูแลผู้สูงอายุอัจฉริยะ",
    template: "%s | CareSync",
  },
  description:
    "ระบบ Generative UI สำหรับดูแลผู้สูงอายุ — บันทึกค่าสถิติร่างกาย ติดตามสถานะ และแสดงข้อมูลเฝ้าระวังสุขภาพเบื้องต้น",
  keywords: [
    "CareSync",
    "ดูแลผู้สูงอายุ",
    "Generative UI",
    "Smart Care",
    "Vital Signs",
    "Care Coordination",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}
