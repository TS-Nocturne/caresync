import type { Metadata } from "next";
import LiffPageClient from "./LiffPageClient";

export const metadata: Metadata = {
  title: "CareFlow LIFF",
  description: "LINE LIFF connection check for CareFlow",
};

export default function LiffPage() {
  return <LiffPageClient />;
}
