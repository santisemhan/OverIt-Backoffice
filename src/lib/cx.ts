/** Joins class names, dropping falsy values. */
export const cx = (...c: (string | number | false | null | undefined)[]) =>
  c.filter((x) => typeof x === "string" && x).join(" ");
