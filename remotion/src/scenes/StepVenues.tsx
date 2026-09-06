import { AbsoluteFill, Sequence } from "remotion";
import { C, body } from "../theme";
import { Body, Heading, Panel, StepTag, useReveal } from "../components/Ui";

const VENUES = [
  { code: "MNU", name: "Old Trafford, Manchester", rate: "12.4k π/min", live: true },
  { code: "MON", name: "Circuit de Monaco", rate: "21.0k π/min", live: true },
  { code: "LAL", name: "Crypto.com Arena, LA", rate: "8.1k π/min", live: false },
  { code: "TYO", name: "Tokyo Dome", rate: "6.8k π/min", live: false },
];

const Row: React.FC<{ v: (typeof VENUES)[number]; delay: number }> = ({ v, delay }) => {
  const { opacity, y } = useReveal(delay, 26);
  return (
    <div
      style={{
        opacity,
        transform: `translateX(${y}px)`,
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "18px 26px",
        borderBottom: `1px solid rgba(35,42,53,0.7)`,
        fontFamily: body,
      }}
    >
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: 12,
          background: C.bg2,
          border: `1px solid ${C.line}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          fontWeight: 600,
          color: C.text,
        }}
      >
        {v.code}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 19, color: C.text, fontWeight: 500 }}>{v.name}</div>
        <div style={{ fontSize: 16, color: C.muted, marginTop: 4 }}>{v.rate}</div>
      </div>
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: 99,
          background: v.live ? C.gold : "#39414E",
          boxShadow: v.live ? "0 0 14px rgba(232,185,35,0.9)" : "none",
        }}
      />
    </div>
  );
};

export const StepVenues: React.FC = () => (
  <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 120px", gap: 90 }}>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 30 }}>
      <StepTag index="03" label="Global node network" delay={4} />
      <Heading delay={12}>Pick your venues, anywhere on earth</Heading>
      <Body delay={22}>
        Browse 1,400+ stadiums, arenas and live venues. Filter by sport or city, see the live π
        rate per minute, and book the exact moments you want.
      </Body>
    </div>

    <Panel delay={26} style={{ width: 600 }}>
      <div
        style={{
          padding: "20px 26px",
          borderBottom: `1px solid ${C.line}`,
          fontFamily: body,
          fontSize: 17,
          fontWeight: 600,
          color: C.text,
        }}
      >
        Available slots
      </div>
      {VENUES.map((v, i) => (
        <Sequence key={v.code} from={0} layout="none">
          <Row v={v} delay={34 + i * 9} />
        </Sequence>
      ))}
    </Panel>
  </AbsoluteFill>
);
