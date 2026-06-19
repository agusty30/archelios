import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, interpolate, useVideoConfig } from "remotion";
import { COLORS } from "../theme";
import { display, body, mono } from "../fonts";

export const Scene4: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const head = spring({ frame, fps, config: { damping: 20 } });
  // path positions
  const cx1 = width * 0.18, cx2 = width * 0.5, cx3 = width * 0.82;
  const cy = 580;
  const progress = interpolate(frame, [10, 80], [0, 1], { extrapolateRight: "clamp" });
  const dotX = interpolate(progress, [0, 0.5, 1], [cx1, cx2, cx3]);
  const arrived1 = progress >= 0.5;
  const arrived2 = progress >= 1;

  const checkT = spring({ frame: frame - 90, fps, config: { damping: 14 } });

  const Node = ({ x, label, sub, active }: { x: number; label: string; sub: string; active: boolean }) => (
    <div style={{
      position: "absolute", left: x - 130, top: cy - 70, width: 260,
      textAlign: "center",
    }}>
      <div style={{
        width: 130, height: 130, borderRadius: "50%",
        margin: "0 auto",
        background: active ? COLORS.brand : COLORS.card,
        border: `2px solid ${active ? COLORS.accent : COLORS.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: display, fontSize: 48, fontWeight: 700, color: COLORS.ink,
        boxShadow: active ? `0 0 60px ${COLORS.brand}88` : "none",
        transition: "none",
      }}>{label[0]}</div>
      <div style={{ marginTop: 18, fontFamily: display, fontSize: 26, fontWeight: 600, color: COLORS.ink }}>{label}</div>
      <div style={{ fontFamily: mono, fontSize: 14, color: COLORS.inkSoft, marginTop: 4, letterSpacing: 1.5 }}>{sub}</div>
    </div>
  );

  return (
    <AbsoluteFill style={{ paddingLeft: 160, paddingRight: 160, paddingTop: 140 }}>
      <div style={{ fontFamily: mono, color: COLORS.accent, letterSpacing: 4, fontSize: 20, opacity: head }}>
        STEP 03 / 03 — SETTLEMENT
      </div>
      <div style={{
        fontFamily: display, fontWeight: 700, fontSize: 96, color: COLORS.ink, marginTop: 14,
        opacity: head, transform: `translateY(${interpolate(head, [0, 1], [30, 0])}px)`,
      }}>
        On-chain in <span style={{ color: COLORS.gold, fontStyle: "italic" }}>seconds.</span>
      </div>

      {/* line */}
      <svg style={{ position: "absolute", inset: 0, pointerEvents: "none" }} width="100%" height="100%">
        <line x1={cx1} y1={cy} x2={cx3} y2={cy} stroke={COLORS.border} strokeWidth={3} strokeDasharray="8 8" />
        <line x1={cx1} y1={cy} x2={dotX} y2={cy} stroke={COLORS.accent} strokeWidth={4} />
        <circle cx={dotX} cy={cy} r={14} fill={COLORS.accent} style={{ filter: `drop-shadow(0 0 12px ${COLORS.accent})` }} />
      </svg>

      <Node x={cx1} label="Sender" sub="DUBAI · UAE" active />
      <Node x={cx2} label="USDC" sub="ARC TESTNET" active={arrived1} />
      <Node x={cx3} label="Recipient" sub="JAKARTA · ID" active={arrived2} />

      <div style={{
        position: "absolute", bottom: 100, left: 160, right: 160,
        padding: "28px 36px", borderRadius: 20,
        background: COLORS.card, border: `1px solid ${COLORS.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        opacity: checkT, transform: `translateY(${interpolate(checkT, [0, 1], [30, 0])}px)`,
      }}>
        <div>
          <div style={{ fontFamily: mono, fontSize: 14, color: COLORS.accent, letterSpacing: 3 }}>TX CONFIRMED</div>
          <div style={{ fontFamily: mono, fontSize: 22, color: COLORS.ink, marginTop: 6 }}>0x9c4e…f218 &nbsp; · &nbsp; 500.00 USDC</div>
        </div>
        <div style={{
          fontFamily: display, fontSize: 56, fontWeight: 700, color: COLORS.gold,
        }}>4.2s ✓</div>
      </div>
    </AbsoluteFill>
  );
};
