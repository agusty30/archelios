import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, interpolate, useVideoConfig } from "remotion";
import { COLORS } from "../theme";
import { display, body, mono } from "../fonts";

export const Scene1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame, fps, config: { damping: 18, stiffness: 120 } });
  const t2 = spring({ frame: frame - 12, fps, config: { damping: 20, stiffness: 130 } });
  const t3 = spring({ frame: frame - 24, fps, config: { damping: 22, stiffness: 140 } });
  const t4 = spring({ frame: frame - 40, fps, config: { damping: 22 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 160 }}>
      <div style={{
        opacity: t,
        transform: `translateY(${interpolate(t, [0, 1], [20, 0])}px)`,
        fontFamily: mono, color: COLORS.accent,
        letterSpacing: 4, fontSize: 22, marginBottom: 28,
      }}>
        ◆ &nbsp; ARCHELIOS — STABLECOIN REMITTANCE
      </div>
      <div style={{
        fontFamily: display, fontWeight: 700,
        fontSize: 168, lineHeight: 0.95, color: COLORS.ink,
        opacity: t2,
        transform: `translateY(${interpolate(t2, [0, 1], [60, 0])}px)`,
        maxWidth: 1500,
      }}>
        Send USDC<br />
        <span style={{ color: COLORS.brand }}>across borders</span><br />
        <span style={{ fontStyle: "italic", fontWeight: 500 }}>in seconds.</span>
      </div>
      <div style={{
        marginTop: 40, fontFamily: body, fontSize: 30, color: COLORS.inkSoft,
        opacity: t3, transform: `translateX(${interpolate(t3, [0, 1], [-30, 0])}px)`,
        maxWidth: 1100,
      }}>
        UAE → world. Built on Circle Programmable Wallets.
      </div>
      <div style={{
        marginTop: 60, display: "flex", gap: 16, opacity: t4,
        fontFamily: mono, fontSize: 18, color: COLORS.inkSoft,
      }}>
        {["AED", "USD", "EUR", "INR", "IDR", "PHP", "PKR"].map((c, i) => (
          <span key={c} style={{
            padding: "10px 18px", border: `1px solid ${COLORS.border}`,
            borderRadius: 999, background: `${COLORS.card}99`,
            color: i === 4 ? COLORS.gold : COLORS.inkSoft,
            borderColor: i === 4 ? COLORS.gold : COLORS.border,
          }}>{c}</span>
        ))}
      </div>
    </AbsoluteFill>
  );
};
