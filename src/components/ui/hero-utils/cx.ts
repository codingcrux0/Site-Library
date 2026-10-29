// Joins class names and drops the empty ones.
// cx("a", false, "b") gives "a b". The hero uses this to switch on optional classes.
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
