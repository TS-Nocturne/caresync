"use client";

import { useState } from "react";
import HumanBodySvg from "./HumanBodySvg";
import { type BodyPart, type PainPoint, BODY_PART_LABELS } from "./pain-body-config";
import { X, RotateCcw } from "lucide-react";

export default function PainBodyMap() {
  const [painPoints, setPainPoints] = useState<PainPoint[]>([]);
  const [isFront, setIsFront] = useState(true);

  const handleBodyClick = (part: BodyPart) => {
    setPainPoints((prev) => {
      const exists = prev.find((p) => p.muscle === part);
      if (exists) {
        if (exists.level >= 10) {
          return prev.filter((p) => p.muscle !== part);
        }
        return prev.map((p) =>
          p.muscle === part ? { ...p, level: p.level + 1 } : p
        );
      }
      return [...prev, { muscle: part, level: 1 }];
    });
  };

  const handleRemovePoint = (muscle: BodyPart) => {
    setPainPoints((prev) => prev.filter((p) => p.muscle !== muscle));
  };

  const getLevelColor = (level: number) => {
    if (level === 10) return { fill: "#ef4444", bg: "bg-red-500", border: "border-red-500 text-slate-800" };
    if (level >= 8) return { fill: "#f97316", bg: "bg-orange-500", border: "border-orange-500 text-slate-800" };
    if (level >= 6) return { fill: "#f59e0b", bg: "bg-yellow-500", border: "border-yellow-500 text-slate-800" };
    if (level >= 4) return { fill: "#84cc16", bg: "bg-lime-500", border: "border-lime-500 text-slate-800" };
    return { fill: "#14b8a6", bg: "bg-teal-50", border: "border-teal-200 text-slate-800" };
  };

  // Convert pain points for SVG
  const svgData = painPoints.map((p) => ({
    muscle: p.muscle,
    color: getLevelColor(p.level).fill,
    level: p.level,
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-xl border border-slate-200">
      {/* 3D Model Area */}
      <div className="relative flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border border-slate-100 min-h-[500px]">
        {/* View Toggle */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setIsFront(!isFront)}
            className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm hover:shadow-md transition-shadow text-sm font-medium text-slate-700 border border-slate-200"
          >
            <RotateCcw className="w-4 h-4" />
            {isFront ? "ดูด้านหลัง" : "ดูด้านหน้า"}
          </button>
        </div>

        {/* The Model */}
        <div className="w-full max-w-[300px]">
          <HumanBodySvg
            view={isFront ? "anterior" : "posterior"}
            data={svgData}
            onPartClick={handleBodyClick}
            selectedPart={null}
          />
        </div>
      </div>

      {/* Selected Points Panel */}
      <div className="flex flex-col h-full max-h-[500px]">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-800">
            ตำแหน่งที่ปวด ({painPoints.length})
          </h3>
          <p className="text-sm text-slate-500">
            คลิกที่สัดส่วนบนหุ่นเพื่อเพิ่มตำแหน่งที่ปวด และคลิกซ้ำเพื่อเพิ่มระดับความเจ็บปวด (1-10)
          </p>
        </div>

        {painPoints.length === 0 ? (
          <div className="flex-1 flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400">
            ยังไม่ได้ระบุตำแหน่งที่ปวด
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            {painPoints.map((point) => {
              const colors = getLevelColor(point.level);
              const isMax = point.level === 10;
              
              // Extract Thai and English from "หน้าอก (Chest)" format
              const label = BODY_PART_LABELS[point.muscle] || point.muscle;
              const match = label.match(/^(.*?)(?:\s*\((.*?)\))?$/);
              const thaiName = match ? match[1].trim() : label;
              const engName = match && match[2] ? match[2].trim() : point.muscle;
              
              return (
                <div
                  key={point.muscle}
                  className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-slate-300 transition-colors group"
                >
                  <div className="flex items-center gap-5">
                    {/* Pain Level Badge like the screenshot */}
                    <div
                      className={`flex items-center justify-center w-14 h-14 rounded-full border-2 ${
                        isMax 
                          ? 'border-red-500 bg-red-500 ring-2 ring-red-500 ring-offset-2' 
                          : 'border-teal-100 bg-teal-50'
                      }`}
                    >
                      <span className={`text-xl font-bold ${isMax ? 'text-slate-900' : 'text-slate-800'}`}>
                        {point.level}
                      </span>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <span className="text-lg font-medium text-slate-800">
                        {thaiName}
                      </span>
                      <span className="text-xs text-slate-500 uppercase tracking-wider">
                        {engName}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemovePoint(point.muscle)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                    title="ลบออก"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
