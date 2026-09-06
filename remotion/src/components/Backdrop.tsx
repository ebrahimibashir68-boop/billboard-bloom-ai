import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C } from "../theme";

export const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 90) * 40;
  const drift2 = Math.cos(frame / 120) * 60;

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 700px at ${18 + drift / 8}% ${30 + drift2 / 20}%, rgba(232,185,35,0.16), transparent 60%),
                       radial-gradient(1100px 800px at ${85 - drift / 10}% ${75 + drift / 25}%, rgba(61,214,140,0.07), transparent 62%),
                       linear-gradient(160deg, #0A0C10 0%, #08090C 55%, #0B0E14 100%)`,
        }}
      />
      {/* tactical grid */}
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)`,
          backgroundSize: "72px 72px",
          transform: `translate(${(frame % 72) * -0.35}px, ${(frame % 72) * -0.2}px)`,
          opacity: 0.7,
        }}
      />
      {/* vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(closest-side at 50% 50%, transparent 40%, rgba(0,0,0,0.65) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
