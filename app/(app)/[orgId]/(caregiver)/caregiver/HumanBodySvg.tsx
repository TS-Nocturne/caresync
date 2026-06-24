"use client";

import React from "react";
import type { BodyPart } from "./pain-body-config";

interface HumanBodySvgProps {
  view: "anterior" | "posterior";
  data: Array<{ muscle: BodyPart; color: string; level: number }>;
  onPartClick: (part: BodyPart) => void;
  selectedPart: BodyPart | null;
}

export default function HumanBodySvg({ view, data, onPartClick, selectedPart }: HumanBodySvgProps) {
  const getPartData = (part: BodyPart) => data.find((d) => d.muscle === part);

  const getStyle = (part: BodyPart): React.CSSProperties => {
    const partData = getPartData(part);
    const isSelected = selectedPart === part;
    
    // Base color or custom color if provided. Default to a very light blue/gray for empty.
    const fillColor = partData ? partData.color : "#f8fafc";
    
    return {
      fill: fillColor,
      stroke: isSelected ? "#0f172a" : "#cbd5e1",
      strokeWidth: isSelected ? 3 : 2,
      cursor: "pointer",
      transition: "all 0.2s ease-in-out",
      vectorEffect: "non-scaling-stroke",
    };
  };

  // Helper to map screen regions to anatomical parts based on view
  const mapRegion = (
    anteriorPart: BodyPart,
    posteriorPart: BodyPart
  ): BodyPart => {
    return view === "anterior" ? anteriorPart : posteriorPart;
  };

  // Note: "Screen Left" (X < 100) is the Patient's Right Side (Anterior view)
  const R_SHOULDER = mapRegion("right-shoulder", "left-shoulder");
  const L_SHOULDER = mapRegion("left-shoulder", "right-shoulder");
  
  const R_CHEST = mapRegion("right-chest", "upper-back");
  const L_CHEST = mapRegion("left-chest", "upper-back");
  
  const MID_TORSO = mapRegion("abdomen", "lower-back");
  
  const R_ARM = mapRegion("right-arm", "left-arm");
  const L_ARM = mapRegion("left-arm", "right-arm");
  
  const R_LEG = mapRegion("right-leg", "left-leg");
  const L_LEG = mapRegion("left-leg", "right-leg");
  
  const R_KNEE = mapRegion("right-knee", "left-knee");
  const L_KNEE = mapRegion("left-knee", "right-knee");

  const Part = ({ part, d, clipPathUrl }: { part: BodyPart; d: string; clipPathUrl?: string }) => {
    const style = getStyle(part);
    if (clipPathUrl) {
      style.clipPath = `url(#${clipPathUrl})`;
    }
    return (
      <path
        d={d.replace(/\s+/g, ' ').trim()}
        style={style}
        onClick={() => onPartClick(part)}
        onMouseEnter={(e) => {
          e.currentTarget.style.filter = "brightness(0.95)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.filter = "none";
        }}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  };

  const CHEST_PATH = "M65 115 C50 120, 40 135, 40 155 C40 175, 45 190, 55 200 C75 205, 125 205, 145 200 C155 190, 160 175, 160 155 C160 135, 150 120, 135 115 C115 125, 85 125, 65 115 Z";

  return (
    <div className="w-full max-w-[320px] mx-auto select-none">
      <svg viewBox="0 0 200 500" className="w-full h-auto drop-shadow-sm">
        <defs>
          <clipPath id="clip-screen-left">
            <rect x="0" y="0" width="100" height="500" />
          </clipPath>
          <clipPath id="clip-screen-right">
            <rect x="100" y="0" width="100" height="500" />
          </clipPath>
        </defs>

        <Part part="head" d="M100 15 C85 15, 80 25, 80 40 C80 55, 90 65, 100 70 C110 65, 120 55, 120 40 C120 25, 115 15, 100 15 Z" />
        <Part part="neck" d="M90 65 C85 75, 80 80, 75 85 C90 85, 110 85, 125 85 C120 80, 115 75, 110 65 C105 68, 95 68, 90 65 Z" />
        
        {/* Shoulders */}
        <Part part={R_SHOULDER} d="M75 85 C55 85, 30 95, 20 115 C20 130, 25 140, 30 145 C40 130, 50 120, 65 115 C70 105, 75 95, 75 85 Z" />
        <Part part={L_SHOULDER} d="M125 85 C145 85, 170 95, 180 115 C180 130, 175 140, 170 145 C160 130, 150 120, 135 115 C130 105, 125 95, 125 85 Z" />

        {/* Chest (Split into L and R via clipPath) */}
        <Part part={R_CHEST} d={CHEST_PATH} clipPathUrl="clip-screen-left" />
        <Part part={L_CHEST} d={CHEST_PATH} clipPathUrl="clip-screen-right" />

        <Part part={MID_TORSO} d="M55 200 C50 220, 50 240, 55 260 C65 275, 80 280, 100 280 C120 280, 135 275, 145 260 C150 240, 150 220, 145 200 C125 205, 75 205, 55 200 Z" />

        {/* Arms */}
        <Part part={R_ARM} d="M30 145 C20 160, 15 180, 15 205 C15 235, 10 265, 10 285 C10 295, 20 300, 25 285 C30 265, 35 235, 40 205 C40 185, 40 160, 30 145 Z" />
        <Part part={L_ARM} d="M170 145 C180 160, 185 180, 185 205 C185 235, 190 265, 190 285 C190 295, 180 300, 175 285 C170 265, 165 235, 160 205 C160 185, 160 160, 170 145 Z" />

        {/* Legs */}
        <Part part={R_LEG} d="M100 280 C95 280, 85 305, 80 335 C75 350, 60 350, 55 335 C45 305, 45 275, 55 260 C65 275, 80 280, 100 280 Z M80 375 C75 445, 65 475, 65 485 C60 490, 40 490, 40 475 C45 445, 45 405, 55 375 C60 385, 75 385, 80 375 Z" />
        <Part part={L_LEG} d="M100 280 C105 280, 115 305, 120 335 C125 350, 140 350, 145 335 C155 305, 155 275, 145 260 C135 275, 120 280, 100 280 Z M120 375 C125 445, 135 475, 135 485 C140 490, 160 490, 160 475 C155 445, 155 405, 145 375 C140 385, 125 385, 120 375 Z" />

        {/* Knees */}
        <Part part={R_KNEE} d="M55 335 C60 350, 75 350, 80 335 C80 355, 75 375, 80 375 C75 385, 60 385, 55 375 C50 375, 55 355, 55 335 Z" />
        <Part part={L_KNEE} d="M145 335 C140 350, 125 350, 120 335 C120 355, 125 375, 120 375 C125 385, 140 385, 145 375 C150 375, 145 355, 145 335 Z" />

      </svg>
    </div>
  );
}
