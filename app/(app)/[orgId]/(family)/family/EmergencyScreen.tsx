"use client";

import { useState, useEffect } from "react";

interface EmergencyContact {
  name: string;
  phone: string;
  relation: string | null;
}

interface EmergencyScreenProps {
  patientName: string;
  message: string;
  emergencyPhone: string;
  emergencyContacts?: EmergencyContact[];
  triggeredAt: string;
  onDismiss: () => void;
}

export default function EmergencyScreen({
  patientName,
  message,
  emergencyPhone,
  emergencyContacts = [],
  triggeredAt,
  onDismiss,
}: EmergencyScreenProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(triggeredAt).getTime();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [triggeredAt]);

  const formatElapsed = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="emergency-screen">
      {/* Pulsing background overlay */}
      <div className="emergency-screen__pulse" />

      {/* Top-right Close Button (X) */}
      <button 
        onClick={onDismiss} 
        className="emergency-screen__close-btn"
        aria-label="ปิดหน้าจอฉุกเฉิน"
      >
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="emergency-screen__content">
        {/* Emergency icon */}
        <div className="emergency-screen__icon-ring">
          <span className="emergency-screen__icon">🚨</span>
        </div>

        {/* Title */}
        <h1 className="emergency-screen__title">
          ส่งสัญญาณฉุกเฉินแล้ว
        </h1>

        {/* Timer */}
        <div className="emergency-screen__timer">
          <div className="emergency-screen__timer-dot" />
          <span>เวลาที่ผ่านไป {formatElapsed(elapsed)}</span>
        </div>

        {/* Message */}
        <div className="emergency-screen__message-box">
          <p className="emergency-screen__message">{message}</p>
        </div>

        {/* Primary CTA: Call 1669 */}
        <a
          href={`tel:${emergencyPhone}`}
          className="emergency-screen__call-btn"
          id="emergency-call-1669"
        >
          <svg className="emergency-screen__phone-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
          </svg>
          <div>
            <span className="emergency-screen__call-label">โทรฉุกเฉิน</span>
            <span className="emergency-screen__call-number">{emergencyPhone}</span>
          </div>
        </a>

        {/* Emergency Contacts */}
        {emergencyContacts.length > 0 && (
          <div className="emergency-screen__contacts">
            <p className="emergency-screen__contacts-label">ผู้ติดต่อฉุกเฉิน</p>
            <div className="emergency-screen__contacts-grid">
              {emergencyContacts.map((contact, i) => (
                <a
                  key={i}
                  href={`tel:${contact.phone}`}
                  className="emergency-screen__contact-card"
                >
                  <div className="emergency-screen__contact-info">
                    <span className="emergency-screen__contact-name">{contact.name}</span>
                    {contact.relation && (
                      <span className="emergency-screen__contact-relation">{contact.relation}</span>
                    )}
                  </div>
                  <span className="emergency-screen__contact-phone">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                    </svg>
                    {contact.phone}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Patient info */}
        <div className="emergency-screen__patient-info">
          <span>ผู้ป่วย: {patientName}</span>
        </div>

        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="emergency-screen__dismiss-btn"
          id="emergency-dismiss"
        >
          กลับสู่หน้าปกติ
        </button>
      </div>
    </div>
  );
}
