import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, interpolate, useVideoConfig } from "remotion";
import { COLORS } from "../theme";
import { display, body, mono } from "../fonts";

const Row: React.FC<{ label: string; value: string; delay: number; accent?: boolean }> = ({ label, value, delay, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame: frame - delay, fps, config: { damping: 18 } });
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "22px 0", borderBottom: `1px solid ${COLORS.border}`,
      opacity: t, transform: `translateX(${interpolate(t, [0, 1], [-20, 0])}px)`,
    }}>
      <div style={{ fontFamily: mono, fontSize: 18, color: COLORS.inkSoft, letterSpacing: 1.5 }}>{label}</div>
      <div style={{ fontFamily: display, fontSize: 32, fontWeight: 600, color: accent ? COLORS.gold : COLORS.ink }}>{value}</div>
    </div>
  );
};

export const Scene3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const head = spring({ frame, fps, config: { damping: 20 } });
  const card = spring({ frame: frame - 8, fps, config: { damping: 22, stiffness: 110 } });
  return (
    <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", paddingLeft: 160, paddingRight: 160, gap: 100 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: mono, color: COLORS.accent, letterSpacing: 4, fontSize: 20, opacity: head }}>
          STEP 02 / 03
        </div>
        <div style={{
          fontFamily: display, fontWeight: 700, fontSize: 96, color: COLORS.ink, marginTop: 14,
          opacity: head, transform: `translateY(${interpolate(head, [0, 1], [30, 0])}px)`, lineHeight: 1.0,
        }}>
          Pick a recipient.<br /><span style={{ color: COLORS.brand }}>Any currency.</span>
        </div>
        <div style={{
          fontFamily: body, fontSize: 26, color: COLORS.inkSoft, marginTop: 22, maxWidth: 540, opacity: head,
        }}>
          10+ corridors. AED, INR, IDR, PHP, PKR — recipients receive value, not fees.
        </div>
      </div>
      <div style={{
        flex: 1, padding: 44, borderRadius: 28,
        background: COLORS.card, border: `1px solid ${COLORS.border}`,
        opacity: card, transform: `translateY(${interpolate(card, [0, 1], [60, 0])}px) scale(${interpolate(card, [0, 1], [0.95, 1])})`,
        boxShadow: `0 40px 100px -30px ${COLORS.brand}55`,
      }}>
        <div style={{ fontFamily: mono, fontSize: 14, color: COLORS.accent, letterSpacing: 3 }}>NEW TRANSFER</div>
        <div style={{ fontFamily: display, fontSize: 40, fontWeight: 700, color: COLORS.ink, marginTop: 8, marginBottom: 24 }}>
          Send to Jakarta
        </div>
        <Row label="RECIPIENT" value="Andi P." delay={14} />
        <Row label="COUNTRY" value="🇮🇩 Indonesia" delay={22} />
        <Row label="CURRENCY" value="IDR" delay={30} accent />
        <Row label="AMOUNT" value="500.00 USDC" delay={38} />
        <Row label="FEE" value="~ $0.02" delay={46} />
        <Row label="ETA" value="< 5 sec" delay={54} accent />
      </div>
    </AbsoluteFill>
  );
};
