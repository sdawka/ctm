import { describe, expect, it } from 'vitest'
import { seedCanvas } from '../src/data/seed'
import { TheoryOfChangeCanvas } from '../src/domain/models'

describe('seedCanvas', () => {
  it('loads the complete workshop into domain objects with causal connections', () => {
    expect(seedCanvas).toBeInstanceOf(TheoryOfChangeCanvas)
    expect(seedCanvas.stages).toHaveLength(5)
    expect(seedCanvas.notes).toHaveLength(63)
    expect(seedCanvas.connections.length).toBeGreaterThanOrEqual(20)

    const noteIds = new Set(seedCanvas.notes.map((note) => note.id))
    for (const connection of seedCanvas.connections) {
      expect(noteIds.has(connection.fromNoteId)).toBe(true)
      expect(noteIds.has(connection.toNoteId)).toBe(true)
    }
  })
})
