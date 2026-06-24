import { Metadata } from "next";
import EmergencyPage from "./EmergencyPage";

export const metadata: Metadata = {
  title: "แจ้งเหตุฉุกเฉิน — CareSync",
  description: "หน้าส่งสัญญาณฉุกเฉินถึงครอบครัวทันที พร้อมเบอร์โทรฉุกเฉิน 1669",
};

export default function Page() {
  return <EmergencyPage />;
}
