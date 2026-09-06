import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, body, display } from "../theme";

export const useReveal = (delay: number, damping = 22) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping, stiffness: 140 } });
  return {
    opacity: interpolate(s, [0, 1], [0, 1]),
    y: interpolate(s, [0, 1], [26, 0]),
    s,
  };
};

export const StepTag: React.FC<{ index: string; label: string; delay: number }> = ({
  index,
  label,
  delay,
}) => {
  const { opacity, y } = useReveal(delay);
  return (
    <div
      style={{
        opacity,
        transform: `translateY(${y}px)`,
        display: "inline-flex",
        alignItems: "center",
        gap: 14,
        fontFamily: body,
      }}
    >
      <span
        style={{
          width: 46,
          height: 46,
          borderRadius: 12,
          background: C.gold,
          color: "#0A0B0E",
          fontFamily: display,
          fontWeight: 700,
          fontSize: 22,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 40px -6px rgba(232,185,35,0.7)",
        }}
      >
        {index}
      </span>
      <span
        style={{
          color: C.gold,
          letterSpacing: 4,
          textTransform: "uppercase",
          fontSize: 15,
          fontWeight: 600,
        }}
      >
        {label}
      </span>
    </div>
  );
};

export const Heading: React.FC<{ children: React.ReactNode; delay: number; size?: number }> = ({
  children,
  delay,
  size = 74,
}) => {
  const { opacity, y } = useReveal(delay, 26);
  return (
    <h1
      style={{
        opacity,
        transform: `translateY(${y}px)`,
        fontFamily: display,
        fontWeight: 700,
        fontSize: size,
        lineHeight: 1.05,
        color: C.text,
        margin: 0,
        letterSpacing: -1.5,
        maxWidth: 940,
      }}
    >
      {children}
    </h1>
  );
};

export const Body: React.FC<{ children: React.ReactNode; delay: number }> = ({
  children,
  delay,
}) => {
  const { opacity, y } = useReveal(delay, 30);
  return (
    <p
      style={{
        opacity,
        transform: `translateY(${y}px)`,
        fontFamily: body,
        fontSize: 26,
        lineHeight: 1.5,
        color: C.muted,
        margin: 0,
        maxWidth: 720,
      }}
    >
      {children}
    </p>
  );
};

export const Panel: React.FC<{
  children?: React.ReactNode;
  delay: number;
  style?: React.CSSProperties;
}> = ({ children, delay, style }) => {
  const { opacity, s } = useReveal(delay, 24);
  return (
    <div
      style={{
        opacity,
        transform: `translateY(${interpolate(s, [0, 1], [40, 0])}px) scale(${interpolate(
          s,
          [0, 1],
          [0.96, 1],
        )})`,
        background: "rgba(18,22,29,0.86)",
        border: `1px solid ${C.line}`,
        borderRadius: 22,
        boxShadow: "0 40px 90px -40px rgba(0,0,0,0.9)",
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
};
