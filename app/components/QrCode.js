"use client";

import { useEffect, useRef } from "react";

export default function QrCode({ value, size = 220 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!value) return;
    let cancelled = false;
    (async () => {
      const QRCode = (await import("qrcode")).default;
      if (cancelled || !canvasRef.current) return;
      await QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 2,
        color: { dark: "#1A1035", light: "#FFFFFF" },
      });
    })();
    return () => { cancelled = true; };
  }, [value, size]);

  return <canvas ref={canvasRef} style={{ borderRadius: 10, display: "block" }} />;
}
