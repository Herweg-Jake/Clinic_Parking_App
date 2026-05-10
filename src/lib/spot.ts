// Database stores spot labels as "A1".."A20" but PT staff want the "A" hidden.
// Use these helpers anywhere a spot label is shown to a user.
export function displaySpot(label: string | null | undefined): string {
  if (!label) return "";
  return label.replace(/^A/i, "");
}
