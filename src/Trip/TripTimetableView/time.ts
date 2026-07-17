export function pad2(num: number): string {
  if (num >= 10) {
    return String(num);
  }
  return `0${String(num)}`;
}
