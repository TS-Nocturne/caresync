import { Metadata } from "next";
import CaregiverDashboard from "./CaregiverDashboard";

export const metadata: Metadata = {
  title: "ผู้ดูแล — บันทึกข้อมูลผู้สูงอายุ",
  description:
    "หน้าบันทึกข้อมูลสำหรับผู้ดูแล — Check-in/Out, ค่าสถิติร่างกาย, บันทึกความไม่สบายตัว, กิจวัตรประจำวัน, ข้อสังเกตเพิ่มเติม",
};

export default function CaregiverPage() {
  return <CaregiverDashboard />;
}
