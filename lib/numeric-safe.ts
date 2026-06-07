/** Safe min/max for large arrays — avoids Hermes stack overflow from spread. */

export function arrayMax(values: number[], fallback = 0): number {
  if (values.length === 0) return fallback;
  let max = values[0];
  for (let i = 1; i < values.length; i++) {
    if (values[i] > max) max = values[i];
  }
  return max;
}

export function arrayMin(values: number[], fallback = 0): number {
  if (values.length === 0) return fallback;
  let min = values[0];
  for (let i = 1; i < values.length; i++) {
    if (values[i] < min) min = values[i];
  }
  return min;
}
