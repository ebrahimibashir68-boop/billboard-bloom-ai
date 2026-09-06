import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, body, display } from "../theme";
import { Body, Heading, Panel, StepTag, useReveal } from "../components/Ui";

const BARS = [38, 62, 45, 78, 56, 92, 70, 84, 61, 97];

const Stat: React.FC<{ label: string; value: string; delay: number }> = ({
  label,
  value,
  delay,
}) => {
  const { opacity, y } = useReveal(delay, 26);
  return (
    <div style={{ opacity, transform: `translateY(${y}px)`, fontFamily: body }}>
      <div style={{ fontSize: 15, color: C.muted, letterSpacing: 2, textTransform: "uppercase" }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: display,
          fontWeight: 700,
          fontSize: 40,
          color: C.text,
          marginTop: 6,
        }}
      >
        {value}
      </div>
    </div>
  );
};

export const StepTrack: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 120px", gap: 90 }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 30 }}>
        <StepTag index="05" label="Proof & analytics" delay={4} />
        <Heading delay={12}>Watch it play. Prove it played.</Heading>
        <Body delay={22}>
          Live impressions, π burn rate and per-venue performance — with proof-of-play receipts you
          can verify on the ledger at any time.
        </Body>
      </div>

      <Panel delay={26} style={{ width: 600 }}>
        <div style={{ padding: 34, display: "flex", flexDirection: "column", gap: 30 }}>
          <div style={{ display: "flex", gap: 54 }}>
            <Stat label="Impressions" value="1.2M" delay={38} />
            <Stat label="Burn rate" value="42 π/hr" delay={46} />
            <Stat label="Venues" value="7 live" delay={54} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 180 }}>
            {BARS.map((h, i) => {
              const grow = interpolate(frame, [50 + i * 4, 78 + i * 4], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${h * grow}%`,
                    borderRadius: 8,
                    background:
                      i === BARS.length - 1
                        ? `linear-gradient(180deg, ${C.gold}, #A87A0B)`
                        : "linear-gradient(180deg, #2C3543, #1A202A)",
                  }}
                />
              );
            })}
          </div>
        </div>
      </Panel>
    </AbsoluteFill>
  );
};
