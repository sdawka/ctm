import { describe, expect, it } from 'vitest'
import {
  CausalConnection,
  Contributor,
  Stage,
  TheoryNote,
  TheoryOfChangeCanvas,
} from '../src/domain/models'

const stages = [
  new Stage('audience', 'Audience', 'Who participates', 0, 'green'),
  new Stage('activities', 'Activities', 'What happens', 1, 'yellow'),
  new Stage('impact', 'Impact', 'What changes', 2, 'purple'),
]

const people = [new Contributor('sahil', 'Sahil')]

function canvas() {
  return new TheoryOfChangeCanvas('canvas-1', 'Theory of Change', stages, people, [], [])
}

describe('TheoryOfChangeCanvas', () => {
  it('adds an attributed note to a valid stage', () => {
    const updated = canvas().addNote(
      new TheoryNote('note-1', 'activities', 'Host a build day', 'sahil', 'yellow'),
    )

    expect(updated.notes).toHaveLength(1)
    expect(updated.notes[0]?.contributorId).toBe('sahil')
    expect(updated.notes[0]?.stageId).toBe('activities')
  })

  it('rejects a note whose stage or contributor is unknown', () => {
    expect(() =>
      canvas().addNote(new TheoryNote('bad-stage', 'missing', 'Unknown stage', 'sahil', 'yellow')),
    ).toThrow('Unknown stage')

    expect(() =>
      canvas().addNote(new TheoryNote('bad-person', 'activities', 'Unknown person', 'nobody', 'yellow')),
    ).toThrow('Unknown contributor')
  })

  it('only connects notes in a forward causal direction', () => {
    const withNotes = canvas()
      .addNote(new TheoryNote('audience-note', 'audience', 'New members', 'sahil', 'green'))
      .addNote(new TheoryNote('activity-note', 'activities', 'Buddy system', 'sahil', 'blue'))

    const connected = withNotes.connect(
      new CausalConnection('edge-1', 'audience-note', 'activity-note', 'enables'),
    )

    expect(connected.connections).toHaveLength(1)
    expect(() =>
      withNotes.connect(new CausalConnection('backward', 'activity-note', 'audience-note', 'causes')),
    ).toThrow('Connections must flow forward')
  })

  it('serializes and restores domain objects without losing connections', () => {
    const original = canvas()
      .addNote(new TheoryNote('a', 'audience', 'Residents', 'sahil', 'green'))
      .addNote(new TheoryNote('b', 'activities', 'Town halls', 'sahil', 'yellow'))
      .connect(new CausalConnection('edge', 'a', 'b', 'participate in'))

    const restored = TheoryOfChangeCanvas.fromJSON(original.toJSON())

    expect(restored).toBeInstanceOf(TheoryOfChangeCanvas)
    expect(restored.notes[0]).toBeInstanceOf(TheoryNote)
    expect(restored.connections[0]).toBeInstanceOf(CausalConnection)
    expect(restored.connections[0]?.label).toBe('participate in')
  })
})
