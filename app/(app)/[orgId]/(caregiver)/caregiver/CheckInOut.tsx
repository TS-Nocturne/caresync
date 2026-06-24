"use client";

import { useState, useEffect } from "react";

export default function CheckInOut() {
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const update = () => {
      setCurrentTime(
        new Date().toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCheckIn = () => {
    const now = new Date().toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });
    setCheckedIn(true);
    setCheckInTime(now);
  };

  const handleCheckOut = () => {
    setCheckedIn(false);
    setCheckInTime(null);
  };

  return (
    <div className="glass-card p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        <h2 className="text-lg font-semibold">บันทึกเวลา</h2>
        <span className="ml-auto text-2xl font-mono font-bold text-primary tabular-nums">
          {currentTime}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Check In */}
        <button
          onClick={handleCheckIn}
          disabled={checkedIn}
          className={`relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-300 ${
            checkedIn
              ? "border-status-ok bg-status-ok-bg cursor-default"
              : "border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 hover:shadow-lg cursor-pointer active:scale-95"
          }`}
        >
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-full transition-all ${
              checkedIn
                ? "bg-status-ok text-white"
                : "bg-primary/10 text-primary"
            }`}
          >
            {checkedIn ? (
              <svg className="w-7 h-7 animate-check-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            ) : (
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
              </svg>
            )}
          </div>
          <span className="font-semibold text-base">เข้างาน</span>
          {checkedIn && checkInTime && (
            <span className="text-xs text-status-ok font-medium">
              เข้าเมื่อ {checkInTime} น.
            </span>
          )}
        </button>

        {/* Check Out */}
        <button
          onClick={handleCheckOut}
          disabled={!checkedIn}
          className={`relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-300 ${
            !checkedIn
              ? "border-dashed border-border text-muted-foreground/50 cursor-not-allowed"
              : "border-dashed border-rose-300 hover:border-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:shadow-lg cursor-pointer active:scale-95"
          }`}
        >
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-full transition-all ${
              !checkedIn
                ? "bg-muted text-muted-foreground/40"
                : "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
            }`}
          >
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
            </svg>
          </div>
          <span className="font-semibold text-base">ออกงาน</span>
          {!checkedIn && (
            <span className="text-xs text-muted-foreground">
              ต้องเข้างานก่อน
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
