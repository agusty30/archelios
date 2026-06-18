import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, interpolate, useVideoConfig } from "remotion";
import { COLORS } from "../theme";
import { display, body, mono } from "../fonts";

export const Scene5: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame, fps, config: { damping: 20 } });
  const b = spring({ frame: frame - 18, fps, config: { damping: 22 } });
  const c = spring({ frame: frame - 36, fps, config: { damping: 22 } });
  const d = spring({ frame: frame - 58, fps, config: { damping: 20 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <div style={{
        fontFamily: mono, color: COLORS.accent, letterSpacing: 6, fontSize: 22, opacity: a,
      }}>
        ◆ &nbsp; ARCHELIOS &nbsp; ◆
      </div>
      <div style={{
        fontFamily: display, fontWeight: 700, fontSize: 200, color: COLORS.ink,
        lineHeight: 1, marginTop: 30,
        opacity: b, transform: `scale(${interpolate(b, [0, 1], [0.9, 1])})`,
      }}>
        Try it<br /><span style={{ color: COLORS.brand, fontStyle: "italic", fontWeight: 500 }}>live.</span>
      </div>
      <div style={{
        marginTop: 50, fontFamily: body, fontSize: 32, color: COLORS.inkSoft,
        opacity: c, maxWidth: 1200,
      }}>
        Cross-border stablecoin remittance · built on Circle
      </div>
      <div style={{
        marginTop: 60, padding: "26px 56px", borderRadius: 999,
        background: COLORS.card, border: `2px solid ${COLORS.brand}`,
        fontFamily: mono, fontSize: 36, color: COLORS.ink,
        opacity: d, transform: `translateY(${interpolate(d, [0, 1], [30, 0])}px)`,
        boxShadow: `0 30px 80px -20px ${COLORS.brand}66`,
      }}>
        archelios.lovable.app
      </div>
    </AbsoluteFill>
  );
};
