export interface Point {
  x: number
  y: number
}

export function connectionPath(source: Point, target: Point): string {
  const bend = Math.max(24, (target.x - source.x) * 0.4)
  return `M ${source.x} ${source.y} C ${source.x + bend} ${source.y}, ${target.x - bend} ${target.y}, ${target.x} ${target.y}`
}
