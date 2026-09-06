import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, body, display } from "../theme";
import { Body, Heading, Panel, StepTag, useReveal } from "../components/Ui";

export const StepSignIn: React.FC = () => {
  const frame = useCurrentFrame();
  const chip = useReveal(46);
  const pulse = 1 + Math.sin(frame / 10) * 0.02;

  return (
    <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 120px", gap: 90 }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 30 }}>
        <StepTag index="01" label="Get started" delay={4} />
        <Heading delay={12}>Sign in with your Pi account</Heading>
        <Body delay={22}>
          Open Pi Billboard inside the Pi Browser. One tap verifies your identity on Pi Mainnet and
          links your wallet address.
        </Body>
      </div>

      <Panel delay={26} style={{ width: 560 }}>
        <div
          style={{
            padding: "18px 24px",
            borderBottom: `1px solid ${C.line}`,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          {[C.gold, C.muted, C.muted].map((c, i) => (
            <span key={i} style={{ width: 13, height: 13, borderRadius: 99, background: c }} />
          ))}
          <span
            style={{
              marginLeft: 14,
              fontFamily: body,
              fontSize: 15,
              color: C.muted,
              letterSpacing: 1,
            }}
          >
            billboard-bloom-ai.lovable.app
          </span>
        </div>
        <div
          style={{
            padding: 44,
            display: "flex",
            flexDirection: "column",
            gap: 26,
            alignItems: "flex-start",
          }}
        >
          <div style={{ fontFamily: display, fontWeight: 700, fontSize: 30, color: C.text }}>
            Sign in with Pi
          </div>
          <div
            style={{
              transform: `scale(${pulse})`,
              fontFamily: body,
              fontWeight: 600,
              fontSize: 22,
              background: C.gold,
              color: "#0A0B0E",
              borderRadius: 14,
              padding: "16px 30px",
              boxShadow: "0 0 50px -8px rgba(232,185,35,0.8)",
            }}
          >
            π Continue with Pi
          </div>
          <div
            style={{
              opacity: chip.opacity,
              transform: `translateY(${chip.y}px)`,
              fontFamily: body,
              fontSize: 18,
              color: C.green,
              border: `1px solid rgba(61,214,140,0.4)`,
              background: "rgba(61,214,140,0.08)",
              borderRadius: 999,
              padding: "10px 20px",
            }}
          >
            ✓ Wallet linked · 0x9F4…B21 · Mainnet
          </div>
        </div>
      </Panel>
    </AbsoluteFill>
  );
};
