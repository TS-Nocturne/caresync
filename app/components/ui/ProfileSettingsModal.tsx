"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type ProfileData = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

interface ProfileSettingsModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: (profile: ProfileData) => void;
}

export default function ProfileSettingsModal({ open, onClose, onSaved }: ProfileSettingsModalProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      setSelectedFile(null);
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
      try {
        const res = await fetch("/api/me/profile", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "โหลดโปรไฟล์ไม่สำเร็จ");
        setProfile(json.data);
        setName(json.data.name ?? "");
        setImage(json.data.image ?? "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "โหลดโปรไฟล์ไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [open]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!open) return null;

  const uploadSelectedFile = async () => {
    if (!selectedFile) return image || null;

    const formData = new FormData();
    formData.append("file", selectedFile);
    const res = await fetch("/api/me/profile/image", {
      method: "POST",
      body: formData,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "อัปโหลดรูปโปรไฟล์ไม่สำเร็จ");
    return json.data.image as string;
  };

  const saveProfile = async () => {
    setSaving(true);
    setError("");

    try {
      const uploadedImage = await uploadSelectedFile();
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, image: uploadedImage }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "บันทึกโปรไฟล์ไม่สำเร็จ");
      setProfile(json.data);
      setImage(json.data.image ?? "");
      setSelectedFile(null);
      onSaved?.(json.data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกโปรไฟล์ไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const removeImage = () => {
    setImage("");
    setSelectedFile(null);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  };

  const displayedImage = previewUrl || image;
  const initial = (profile?.name || name || "U").charAt(0);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/50 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-settings-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="profile-settings-title" className="text-xl font-bold text-foreground">
              โปรไฟล์ของฉัน
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">แก้ชื่อและรูปที่แสดงในห้องดูแล</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xl leading-none text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="ปิดหน้าต่างโปรไฟล์"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-16 rounded-xl bg-muted" />
            <div className="h-10 rounded-xl bg-muted" />
            <div className="h-10 rounded-xl bg-muted" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {displayedImage ? (
                <div className="relative h-20 w-20 overflow-hidden rounded-full border border-border bg-muted">
                  <Image src={displayedImage} alt={name || "Profile"} fill className="object-cover" unoptimized />
                </div>
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                  {initial}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{name || "ยังไม่ได้ตั้งชื่อ"}</p>
                <p className="truncate text-sm text-muted-foreground">{profile?.email}</p>
              </div>
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-foreground">ชื่อที่แสดง</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="ชื่อของคุณ"
              />
            </label>

            <div>
              <span className="mb-2 block text-sm font-semibold text-foreground">รูปโปรไฟล์</span>
              <div className="flex flex-col gap-2 min-[420px]:flex-row">
                <label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-dark">
                  เลือกรูปจากเครื่อง
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setSelectedFile(file);
                      setPreviewUrl((current) => {
                        if (current) URL.revokeObjectURL(current);
                        return file ? URL.createObjectURL(file) : null;
                      });
                    }}
                  />
                </label>
                {displayedImage && (
                  <button
                    type="button"
                    onClick={removeImage}
                    className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    ลบรูป
                  </button>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">รองรับ JPG หรือ PNG ขนาดไม่เกิน 2 MB</p>
              {selectedFile && (
                <p className="mt-1 truncate text-xs text-muted-foreground">เลือกแล้ว: {selectedFile.name}</p>
              )}
            </div>

            {error && <p className="text-sm text-rose-600">{error}</p>}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={saveProfile}
                disabled={saving || !name.trim()}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "กำลังบันทึก..." : "บันทึกโปรไฟล์"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
