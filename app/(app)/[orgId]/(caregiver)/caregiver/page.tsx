import { Metadata } from "next";
import CaregiverDashboard from "./CaregiverDashboard";

export const metadata: Metadata = {
  title: "ผู้ดูแล — บันทึกข้อมูลผู้สูงอายุ",
  description:
    "หน้าบันทึกข้อมูลสำหรับผู้ดูแลรับจ้าง — Check-in/Out, สัญญาณชีพ, Pain Map, รายการยา, อาการผิดปกติ",
};

export default function CaregiverPage() {
  return <CaregiverDashboard />;
}
