import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "./theme";

export const BG: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const drift = Math.sin(frame / 90) * 40;
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, overflow: "hidden" }}>
      <div style={{
        position: "absolute",
        inset: -200,
        background: `radial-gradient(900px 600px at ${30 + drift}% ${20 + drift / 2}%, ${COLORS.brandDeep}88, transparent 60%), radial-gradient(700px 500px at ${75 - drift}% ${80 - drift / 2}%, ${COLORS.accent}22, transparent 65%)`,
      }} />
      <svg width={width} height={height} style={{ position: "absolute", inset: 0, opacity: 0.15 }}>
        <defs>
          <pattern id="grid" width={80} height={80} patternUnits="userSpaceOnUse">
            <path d="M 80 0 L 0 0 0 80" fill="none" stroke={COLORS.border} strokeWidth={1} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      {Array.from({ length: 18 }).map((_, i) => {
        const seed = i * 137.5;
        const x = (seed % 100);
        const y = ((seed * 1.3) % 100);
        const o = interpolate(Math.sin(frame / 60 + i), [-1, 1], [0.2, 0.7]);
        return (
          <div key={i} style={{
            position: "absolute",
            left: `${x}%`, top: `${y}%`,
            width: 4, height: 4, borderRadius: "50%",
            background: i % 3 === 0 ? COLORS.accent : COLORS.brand,
            opacity: o, filter: "blur(0.5px)",
          }} />
        );
      })}
    </AbsoluteFill>
  );
};
