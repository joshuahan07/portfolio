export const ABOUT_GREETING = "Hi, I'm Joshua!";

export const ABOUT_SCHOOL =
  "I'm currently pursuing a Joint Business & Computer Science degree at Washington University in St. Louis.";

export const ABOUT_BUILD =
  "I'm into shipping real product bets—automating the boring stuff, simplifying messy problems, and helping teams go from fuzzy insight to launch without the drama.";

export const ABOUT_LIFE =
  "Outside of building, I love basketball and ping-pong, bingeing shows and movies, and trying new restaurants to rate on Beli.";

export type AboutMeVariantId = "inferno" | "tide" | "ink" | "smoke";

export const ABOUT_VARIANTS: {
  id: AboutMeVariantId;
  label: string;
  tagline: string;
}[] = [
  {
    id: "inferno",
    label: "01 · Inferno",
    tagline: "Phoenix rises — magma rivers, ember storm",
  },
  {
    id: "tide",
    label: "02 · Tide",
    tagline: "Waves crash the screen — bio in the deep",
  },
  {
    id: "ink",
    label: "03 · Ink Bloom",
    tagline: "Drop · splatter · flood · reveal",
  },
  {
    id: "smoke",
    label: "04 · Smoke",
    tagline: "Ball drops · burst · waft · appear",
  },
];
