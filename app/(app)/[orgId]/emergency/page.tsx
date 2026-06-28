import { Metadata } from "next";
import EmergencyPage from "./EmergencyPage";

export const metadata: Metadata = {
  title: "ติดต่อด่วน — CareSync",
  description: "หน้าส่งข้อความขอความช่วยเหลือถึงครอบครัว พร้อมแสดงเบอร์ติดต่อฉุกเฉินให้ผู้ใช้เลือกโทรเอง",
};

export default function Page() {
  return <EmergencyPage />;
}
