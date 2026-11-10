/** Trims a campfire draft and rejects whitespace-only messages. */
export function sendableLine(draft: string): string {
  return draft.replace(/\s+$/g, "").replace(/^\s+/g, "");
}
