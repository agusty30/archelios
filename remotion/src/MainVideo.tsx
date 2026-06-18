import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, springTiming, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { BG } from "./components/BG";
import { Scene1 } from "./scenes/Scene1";
import { Scene2 } from "./scenes/Scene2";
import { Scene3 } from "./scenes/Scene3";
import { Scene4 } from "./scenes/Scene4";
import { Scene5 } from "./scenes/Scene5";

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <BG />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={140}>
          <Scene1 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-right" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: 22 })} />

        <TransitionSeries.Sequence durationInFrames={150}>
          <Scene2 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: 22 })} />

        <TransitionSeries.Sequence durationInFrames={170}>
          <Scene3 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-bottom-right" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: 22 })} />

        <TransitionSeries.Sequence durationInFrames={170}>
          <Scene4 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 18 })} />

        <TransitionSeries.Sequence durationInFrames={150}>
          <Scene5 />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
