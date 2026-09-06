import { Composition } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { wipe } from "@remotion/transitions/wipe";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Backdrop } from "./components/Backdrop";
import { Intro } from "./scenes/Intro";
import { StepSignIn } from "./scenes/StepSignIn";
import { StepCreate } from "./scenes/StepCreate";
import { StepVenues } from "./scenes/StepVenues";
import { StepPay } from "./scenes/StepPay";
import { StepTrack } from "./scenes/StepTrack";
import { Outro } from "./scenes/Outro";

const D = { intro: 150, s1: 180, s2: 180, s3: 170, s4: 180, s5: 170, outro: 170 };
const T = 20;

const MainVideo: React.FC = () => (
  <>
    <Backdrop />
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={D.intro}>
        <Intro />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={wipe({ direction: "from-left" })}
        timing={springTiming({ config: { damping: 200 }, durationInFrames: T })}
      />
      <TransitionSeries.Sequence durationInFrames={D.s1}>
        <StepSignIn />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-right" })}
        timing={springTiming({ config: { damping: 200 }, durationInFrames: T })}
      />
      <TransitionSeries.Sequence durationInFrames={D.s2}>
        <StepCreate />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={wipe({ direction: "from-bottom" })}
        timing={springTiming({ config: { damping: 200 }, durationInFrames: T })}
      />
      <TransitionSeries.Sequence durationInFrames={D.s3}>
        <StepVenues />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-left" })}
        timing={springTiming({ config: { damping: 200 }, durationInFrames: T })}
      />
      <TransitionSeries.Sequence durationInFrames={D.s4}>
        <StepPay />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={wipe({ direction: "from-right" })}
        timing={springTiming({ config: { damping: 200 }, durationInFrames: T })}
      />
      <TransitionSeries.Sequence durationInFrames={D.s5}>
        <StepTrack />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={springTiming({ config: { damping: 200 }, durationInFrames: T })}
      />
      <TransitionSeries.Sequence durationInFrames={D.outro}>
        <Outro />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  </>
);

const total =
  Object.values(D).reduce((a, b) => a + b, 0) - T * 6;

export const RemotionRoot: React.FC = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={total}
    fps={30}
    width={1920}
    height={1080}
  />
);
