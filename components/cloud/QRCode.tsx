"use client";

import { useMemo } from "react";
import qrcode from "qrcode-generator";

const QUIET_ZONE = 4;

/**
 * A real, scannable QR code (made in the browser, no network). Drawn as one SVG path on a white
 * square, with the standard 4-module quiet zone, so it scans from the screen in any theme.
 */
export function QRCode({ text, size = 208 }: { text: string; size?: number }) {
  const drawing = useMemo(() => {
    try {
      const qr = qrcode(0, "L");
      qr.addData(text);
      qr.make();
      const count = qr.getModuleCount();
      let path = "";
      for (let row = 0; row < count; row++) {
        for (let col = 0; col < count; col++) {
          if (qr.isDark(row, col)) path += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`;
        }
      }
      return { path, span: count + QUIET_ZONE * 2 };
    } catch {
      return null; // text too long for any QR code
    }
  }, [text]);

  if (!drawing) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-600">
        This link is too long to fit in a QR code (the limit is about 2,900 characters). Use the link itself, or share a
        smaller report.
      </p>
    );
  }

  return (
    <svg
      role="img"
      aria-label="QR code for the share link"
      viewBox={`0 0 ${drawing.span} ${drawing.span}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className="rounded-lg border border-slate-200"
    >
      <rect width={drawing.span} height={drawing.span} fill="#ffffff" />
      <path d={drawing.path} fill="#0f172a" />
    </svg>
  );
}
