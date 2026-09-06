import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, body, display } from "../theme";
import { Body, Heading, Panel, StepTag, useReveal } from "../components/Ui";

const STEPS = [
  "Create payment in Pi wallet",
  "Server approves the transaction",
  "Completed & written to ledger",
];

const Step: React.FC<{ label: string; delay: number; index: number }> = ({
  label,
  delay,
  index,
}) => {
  const frame = useCurrentFrame();
  const { opacity, y } = useReveal(delay, 26);
  const done = frame > delay + 20;
  return (
    <div
      style={{
        opacity,
        transform: `translateY(${y}px)`,
        display: "flex",
        alignItems: "center",
        gap: 16,
        fontFamily: body,
        fontSize: 20,
        color: done ? C.text : C.muted,
      }}
    >
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 99,
          border: `2px solid ${done ? C.green : C.line}`,
          background: done ? "rgba(61,214,140,0.15)" : "transparent",
          color: C.green,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 15,
          fontWeight: 700,
        }}
      >
        {done ? "✓" : index + 1}
      </span>
      {label}
    </div>
  );
};

export const StepPay: React.FC = () => {
  const frame = useCurrentFrame();
  const glow = 0.6 + Math.sin(frame / 12) * 0.2;

  return (
    <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 120px", gap: 90 }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 30 }}>
        <StepTag index="04" label="Pay in π" delay={4} />
        <Heading delay={12}>Settle every campaign in real Pi</Heading>
        <Body delay={22}>
          No fiat, no simulated balances. Each booking runs through the Pi Network payment flow and
          is recorded as a verifiable, hash-chained contract.
        </Body>
      </div>

      <Panel delay={26} style={{ width: 560 }}>
        <div
          style={{
            padding: 36,
            display: "flex",
            flexDirection: "column",
            gap: 26,
          }}
        >
          <div style={{ fontFamily: body, fontSize: 16, color: C.muted, letterSpacing: 2 }}>
            CAMPAIGN TOTAL
          </div>
          <div
            style={{
              fontFamily: display,
              fontWeight: 700,
              fontSize: 72,
              color: C.gold,
              textShadow: `0 0 ${40 * glow}px rgba(232,185,35,${glow})`,
              lineHeight: 1,
            }}
          >
            248.6 π
          </div>
          <div style={{ height: 1, background: C.line }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {STEPS.map((s, i) => (
              <Step key={s} label={s} index={i} delay={44 + i * 20} />
            ))}
          </div>
        </div>
      </Panel>
    </AbsoluteFill>
  );
};
