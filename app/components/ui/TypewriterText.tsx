"use client";

import { useEffect, useState } from "react";

export default function TypewriterText({
  text,
  speed = 24,
  className = "",
}: {
  text: string;
  speed?: number;
  className?: string;
}) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let index = 0;
    let intervalId: number | null = null;

    const timeoutId = window.setTimeout(() => {
      setDisplayed("");
      setDone(false);

      if (!text) {
        setDone(true);
        return;
      }

      intervalId = window.setInterval(() => {
      index += 1;
      setDisplayed(text.slice(0, index));
      if (index >= text.length) {
        if (intervalId != null) window.clearInterval(intervalId);
        setDone(true);
      }
      }, speed);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId != null) window.clearInterval(intervalId);
    };
  }, [text, speed]);

  return (
    <span className={className}>
      {displayed}
      {!done && <span className="inline-block w-0.5 h-[1em] bg-current ml-0.5 animate-pulse align-middle" />}
    </span>
  );
}
