import { describe, expect, it } from 'vitest'
import { connectionPath, type Point } from '../src/ui/connection-geometry'

describe('connectionPath', () => {
  it('draws a forward bezier from the source edge to the target edge', () => {
    const source: Point = { x: 100, y: 50 }
    const target: Point = { x: 300, y: 150 }

    expect(connectionPath(source, target)).toBe('M 100 50 C 180 50, 220 150, 300 150')
  })

  it('keeps control points forward when adjacent cards are close', () => {
    expect(connectionPath({ x: 100, y: 50 }, { x: 120, y: 80 })).toBe(
      'M 100 50 C 124 50, 96 80, 120 80',
    )
  })
})
