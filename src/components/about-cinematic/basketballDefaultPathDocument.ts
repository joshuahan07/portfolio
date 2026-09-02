import type { PathDocument } from "./basketballPathDocument";

/**
 * Shipped animation paths for production visitors (no dev path editor / localStorage).
 * Dev edits in localStorage still override when they include locked segments.
 */
export const PRODUCTION_PATH_DOCUMENT: PathDocument = {
  version: 2,
  shot: {
    id: "prod-shot",
    label: "Shot",
    anchors: [
      { x: 0.84, y: 0.9 },
      { x: 0.64, y: 0.54 },
      { x: 0.41, y: 0.31 },
    ],
    locked: true,
  },
  bounces: [
    {
      id: "prod-bounce-1",
      label: "Bounce 1",
      anchors: [
        { x: 0.38, y: 0.2 },
        { x: 0.42, y: 0.58 },
      ],
      locked: true,
    },
    {
      id: "prod-bounce-2",
      label: "Bounce 2",
      anchors: [
        { x: 0.42, y: 0.58 },
        { x: 0.56, y: 0.36 },
      ],
      locked: true,
    },
    {
      id: "prod-bounce-3",
      label: "Bounce 3",
      anchors: [
        { x: 0.56, y: 0.36 },
        { x: 0.46, y: 0.64 },
      ],
      locked: true,
    },
    {
      id: "prod-bounce-4",
      label: "Bounce 4",
      anchors: [
        { x: 0.46, y: 0.64 },
        { x: 0.58, y: 0.44 },
      ],
      locked: true,
    },
    {
      id: "prod-bounce-5",
      label: "Bounce 5",
      anchors: [
        { x: 0.58, y: 0.44 },
        { x: 0.5, y: 0.54 },
      ],
      locked: true,
    },
  ],
};
