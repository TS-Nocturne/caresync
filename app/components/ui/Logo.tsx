import React from 'react';

export default function Logo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 28C16 28 4 20.5 4 11.5C4 7.35786 7.35786 4 11.5 4C14.0416 4 16 6 16 6C16 6 17.9584 4 20.5 4C24.6421 4 28 7.35786 28 11.5C28 20.5 16 28 16 28Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary"/>
      <path d="M10 14L13 14L15 9L18 19L20 14L23 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary"/>
    </svg>
  );
}
