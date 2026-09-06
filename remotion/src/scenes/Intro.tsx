import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, body, display } from "../theme";

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logo = spring({ frame: frame - 4, fps, config: { damping: 16, stiffness: 120 } });
  const title = spring({ frame: frame - 16, fps, config: { damping: 26 } });
  const sub = spring({ frame: frame - 30, fps, config: { damping: 30 } });
  const badge = spring({ frame: frame - 44, fps, config: { damping: 20 } });

  const float = Math.sin(frame / 24) * 6;

  return (
    <AbsoluteFill
      style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 26 }}
    >
      <div
        style={{
          opacity: interpolate(logo, [0, 1], [0, 1]),
          transform: `scale(${interpolate(logo, [0, 1], [0.6, 1])}) translateY(${float}px)`,
          width: 132,
          height: 132,
          borderRadius: 34,
          background: `linear-gradient(145deg, ${C.gold}, #C9930F)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 90px -10px rgba(232,185,35,0.75)",
        }}
      >
        <span style={{ fontFamily: display, fontWeight: 700, fontSize: 74, color: "#0A0B0E" }}>
          π
        </span>
      </div>

      <div
        style={{
          opacity: interpolate(title, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(title, [0, 1], [36, 0])}px)`,
          fontFamily: display,
          fontWeight: 700,
          fontSize: 118,
          color: C.text,
          letterSpacing: -3,
        }}
      >
        Pi <span style={{ color: C.gold }}>Billboard</span>
      </div>

      <div
        style={{
          opacity: interpolate(sub, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(sub, [0, 1], [26, 0])}px)`,
          fontFamily: body,
          fontSize: 30,
          color: C.muted,
          letterSpacing: 0.5,
        }}
      >
        AI advertising on stadiums & live venues worldwide — settled in π
      </div>

      <div
        style={{
          opacity: interpolate(badge, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(badge, [0, 1], [18, 0])}px)`,
          marginTop: 22,
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontFamily: body,
          fontSize: 20,
          fontWeight: 600,
          color: C.green,
          border: `1px solid rgba(61,214,140,0.35)`,
          background: "rgba(61,214,140,0.08)",
          borderRadius: 999,
          padding: "12px 26px",
        }}
      >
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: 999,
            background: C.green,
            boxShadow: "0 0 14px rgba(61,214,140,0.9)",
          }}
        />
        1,402 active venues · Pi Mainnet
      </div>
    </AbsoluteFill>
  );
};
