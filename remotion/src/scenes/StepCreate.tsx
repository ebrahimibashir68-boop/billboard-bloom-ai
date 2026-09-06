import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, body, display } from "../theme";
import { Body, Heading, Panel, StepTag } from "../components/Ui";

const PROMPT = "Neon sneaker launch, stadium energy, gold sparks";

export const StepCreate: React.FC = () => {
  const frame = useCurrentFrame();
  const typed = Math.min(
    PROMPT.length,
    Math.max(0, Math.floor((frame - 34) * 1.4)),
  );
  const progress = interpolate(frame, [80, 112], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const done = progress >= 100;

  return (
    <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 120px", gap: 90 }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 30 }}>
        <StepTag index="02" label="AI Creative Engine" delay={4} />
        <Heading delay={12}>Describe it. AI builds your ad.</Heading>
        <Body delay={22}>
          Type one sentence in the Creative Studio. The AI produces a stadium-ready billboard
          design in seconds — no designer needed.
        </Body>
      </div>

      <Panel delay={26} style={{ width: 580 }}>
        <div
          style={{
            padding: "20px 26px",
            borderBottom: `1px solid ${C.line}`,
            fontFamily: body,
            fontSize: 17,
            fontWeight: 600,
            color: C.text,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ color: C.gold }}>✦</span> AI Creative Engine
        </div>
        <div style={{ padding: 30, display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              background: C.bg,
              border: `1px solid ${C.line}`,
              borderRadius: 14,
              padding: 20,
              minHeight: 88,
              fontFamily: body,
              fontSize: 21,
              color: C.text,
            }}
          >
            {PROMPT.slice(0, typed)}
            <span
              style={{
                display: "inline-block",
                width: 2,
                height: 22,
                background: C.gold,
                marginLeft: 2,
                opacity: Math.floor(frame / 6) % 2 === 0 ? 1 : 0,
                verticalAlign: "middle",
              }}
            />
          </div>
          <div
            style={{
              height: 10,
              borderRadius: 99,
              background: C.bg2,
              border: `1px solid ${C.line}`,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                background: `linear-gradient(90deg, ${C.gold}, ${C.goldSoft})`,
                borderRadius: 99,
              }}
            />
          </div>
          <div
            style={{
              fontFamily: body,
              fontSize: 19,
              fontWeight: 600,
              color: done ? C.green : C.muted,
            }}
          >
            {done ? "✓ Creative ready — 12 π" : `Generating… ${Math.floor(progress)}%`}
          </div>
        </div>
      </Panel>
    </AbsoluteFill>
  );
};
