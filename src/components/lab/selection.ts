/** What is chosen on the bench: one part or one wire. */
export interface Selection {
  parts: string[];
  wire: string | null;
}
export const NOTHING: Selection = { parts: [], wire: null };
