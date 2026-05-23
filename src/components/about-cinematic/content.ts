export const ABOUT_COPY = {
  greeting: "Hi, I'm Joshua!",
  school:
    "I'm currently pursuing a Joint Business and Computer Science degree at Washington University in St. Louis.",
  build:
    "I enjoy automating things, simplifying difficult problems, building thoughtful experiences, and thinking through product strategy.",
  life: "Outside of building, I love basketball, ping pong, watching great shows and movies, and trying new restaurants while rating them on Beli.",
} as const;

export const ABOUT_PARAGRAPHS = [
  `${ABOUT_COPY.greeting} ${ABOUT_COPY.school}`,
  ABOUT_COPY.build,
  ABOUT_COPY.life,
] as const;

