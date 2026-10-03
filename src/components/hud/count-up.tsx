"use client";
import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

/** Animates a number from its previous value to `value`. */
export function CountUp({ value, format = (n) => n.toFixed(0), duration = 1.1, className }: { value: number; format?: (n: number) => string; duration?: number; className?: string }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const controls = animate(prev.current, value, { duration, ease: [0.22, 1, 0.36, 1], onUpdate: setDisplay });
    prev.current = value;
    return () => controls.stop();
  }, [value, duration]);
  return <span className={className}>{format(display)}</span>;
}
