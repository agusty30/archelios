import { loadFont as loadSpace } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

export const display = loadSpace("normal", { weights: ["500", "700"] }).fontFamily;
export const body = loadInter("normal", { weights: ["400", "500", "600"] }).fontFamily;
export const mono = loadMono("normal", { weights: ["400", "500"] }).fontFamily;
