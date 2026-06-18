import React from "react";
import { AbsoluteFill, useCurrentFrame, spring, interpolate, useVideoConfig } from "remotion";
import { COLORS } from "../theme";
import { display, body, mono } from "../fonts";

const Pill: React.FC<{ delay: number; label: string; sub: string; tone?: string }> = ({ delay, label, sub, tone }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame: frame - delay, fps, config: { damping: 18 } });
  return (
    <div style={{
      opacity: t,
      transform: `translateY(${interpolate(t, [0, 1], [40, 0])}px)`,
      padding: "26px 32px", borderRadius: 22,
      background: COLORS.card, border: `1px solid ${tone ?? COLORS.border}`,
      minWidth: 320, boxShadow: `0 20px 60px -20px ${tone ?? COLORS.brand}33`,
    }}>
      <div style={{ fontFamily: mono, fontSize: 16, color: tone ?? COLORS.accent, letterSpacing: 2 }}>{sub}</div>
      <div style={{ fontFamily: display, fontSize: 44, fontWeight: 700, color: COLORS.ink, marginTop: 8 }}>{label}</div>
    </div>
  );
};

export const Scene2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const head = spring({ frame, fps, config: { damping: 20 } });
  return (
    <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 160, paddingRight: 160 }}>
      <div style={{
        fontFamily: mono, color: COLORS.accent, letterSpacing: 4, fontSize: 20, opacity: head,
      }}>STEP 01 / 03</div>
      <div style={{
        fontFamily: display, fontWeight: 700, fontSize: 96, color: COLORS.ink,
        marginTop: 14, opacity: head, transform: `translateY(${interpolate(head, [0, 1], [30, 0])}px)`,
      }}>
        Sign in. Get your wallet.
      </div>
      <div style={{
        fontFamily: body, fontSize: 28, color: COLORS.inkSoft, marginTop: 18, maxWidth: 1100,
        opacity: head,
      }}>
        Every user gets an isolated Circle wallet on Polygon — separate from the treasury, secured by RLS.
      </div>
      <div style={{ display: "flex", gap: 28, marginTop: 70 }}>
        <Pill delay={10} sub="AUTH" label="Email + Google" />
        <Pill delay={22} sub="PROVISION" label="Circle Wallet" tone={COLORS.brand} />
        <Pill delay={34} sub="NETWORK" label="Polygon Amoy" tone={COLORS.accent} />
      </div>
      <div style={{
        marginTop: 50, fontFamily: mono, fontSize: 18, color: COLORS.inkSoft,
        opacity: spring({ frame: frame - 50, fps, config: { damping: 20 } }),
      }}>
        0x7a2f…b41c &nbsp;·&nbsp; balance: 1,250.00 USDC
      </div>
    </AbsoluteFill>
  );
};
