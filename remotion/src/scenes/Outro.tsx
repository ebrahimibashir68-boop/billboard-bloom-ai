import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, body, display } from "../theme";

const ITEMS = ["Sign in with Pi", "Generate creative", "Book venues", "Pay in π", "Track proof"];

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const title = spring({ frame: frame - 6, fps, config: { damping: 24 } });
  const url = spring({ frame: frame - 60, fps, config: { damping: 22 } });

  return (
    <AbsoluteFill
      style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 46 }}
    >
      <div
        style={{
          opacity: interpolate(title, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(title, [0, 1], [30, 0])}px)`,
          fontFamily: display,
          fontWeight: 700,
          fontSize: 82,
          color: C.text,
          letterSpacing: -2,
          textAlign: "center",
        }}
      >
        Five steps. One <span style={{ color: C.gold }}>global</span> stage.
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
        {ITEMS.map((t, i) => {
          const s = spring({ frame: frame - 22 - i * 7, fps, config: { damping: 20 } });
          return (
            <div
              key={t}
              style={{
                opacity: interpolate(s, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(s, [0, 1], [24, 0])}px) scale(${interpolate(
                  s,
                  [0, 1],
                  [0.9, 1],
                )})`,
                fontFamily: body,
                fontSize: 21,
                fontWeight: 500,
                color: C.text,
                border: `1px solid ${C.line}`,
                background: "rgba(18,22,29,0.8)",
                borderRadius: 999,
                padding: "14px 28px",
              }}
            >
              <span style={{ color: C.gold, marginRight: 10 }}>{i + 1}</span>
              {t}
            </div>
          );
        })}
      </div>

      <div
        style={{
          opacity: interpolate(url, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(url, [0, 1], [20, 0])}px)`,
          marginTop: 20,
          fontFamily: body,
          fontSize: 26,
          color: C.gold,
          letterSpacing: 1,
        }}
      >
        billboard-bloom-ai.lovable.app
      </div>
      <div
        style={{
          opacity: interpolate(url, [0, 1], [0, 0.75]),
          fontFamily: body,
          fontSize: 18,
          color: C.muted,
        }}
      >
        Open in Pi Browser · All payments settle on Pi Mainnet
      </div>
    </AbsoluteFill>
  );
};
