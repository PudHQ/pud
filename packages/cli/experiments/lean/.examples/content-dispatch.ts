// Adapted from LemmaScript's contentDispatch.ts. See lemmascript-license.txt.
export interface Part {
  type: string;
  toolCallId: string;
}

export function partsOrEmpty(content: string | readonly Part[]): readonly Part[] {
  if (Array.isArray(content)) return content;
  return [];
}
