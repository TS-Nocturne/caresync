import { Metadata } from "next";
import FamilyDashboard from "./FamilyDashboard";

export const metadata: Metadata = {
  title: "ครอบครัว — ศูนย์บัญชาการ",
  description: "แดชบอร์ดสำหรับครอบครัว — ดูสถานะ ตารางนัดหมาย ประวัติกิจกรรม แบบ Real-time",
};

export default function FamilyPage() {
  return <FamilyDashboard />;
}
