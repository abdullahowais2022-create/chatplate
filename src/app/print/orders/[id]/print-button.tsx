"use client";
import { useEffect } from "react";

export function PrintButton() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);
  return (
    <button onClick={() => window.print()} className="no-print mb-3 w-full rounded border border-black py-1 text-sm">
      Print
    </button>
  );
}
