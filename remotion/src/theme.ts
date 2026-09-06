import { loadFont as loadSora } from "@remotion/google-fonts/Sora";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

export const display = loadSora("normal", {
  weights: ["600", "700"],
  subsets: ["latin"],
}).fontFamily;

export const body = loadInter("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
}).fontFamily;

export const C = {
  bg: "#08090C",
  bg2: "#0E1116",
  panel: "#12161D",
  line: "#232A35",
  gold: "#E8B923",
  goldSoft: "#F3D06A",
  text: "#F2F4F8",
  muted: "#8B94A3",
  green: "#3DD68C",
};
