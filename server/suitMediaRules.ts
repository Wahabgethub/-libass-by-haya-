export const REQUIRED_SUIT_VIEWS = ["front", "back", "detail"] as const;
export type SuitViewLabel = (typeof REQUIRED_SUIT_VIEWS)[number] | "editorial" | "other";

export function assertNextStudioSuitView(existingViewCount: number, labels: string[], uploadCount: number) {
  if (existingViewCount >= REQUIRED_SUIT_VIEWS.length) return;
  const expected = REQUIRED_SUIT_VIEWS[existingViewCount];
  if (uploadCount !== 1 || labels[0] !== expected) throw new Error(`Add the ${expected} image next. New Studio suits are guided one view at a time: front, back, then detail.`);
}
