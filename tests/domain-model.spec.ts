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

  it('traces only directed ancestors and descendants for a selected note', () => {
    const flowStages = [
      new Stage('s0', 'Start', '', 0, 'green'),
      new Stage('s1', 'Early middle', '', 1, 'yellow'),
      new Stage('s2', 'Middle', '', 2, 'yellow'),
      new Stage('s3', 'Outcome', '', 3, 'purple'),
      new Stage('s4', 'Impact', '', 4, 'vision'),
    ]
    const flow = new TheoryOfChangeCanvas('flow', 'Flow', flowStages, people, [], [])
      .addNote(new TheoryNote('upstream', 's0', 'Upstream', 'sahil', 'green'))
      .addNote(new TheoryNote('origin', 's1', 'Origin', 'sahil', 'yellow'))
      .addNote(new TheoryNote('selected', 's2', 'Selected', 'sahil', 'yellow'))
      .addNote(new TheoryNote('sibling', 's2', 'Sibling', 'sahil', 'yellow'))
      .addNote(new TheoryNote('co-parent', 's2', 'Co-parent', 'sahil', 'yellow'))
      .addNote(new TheoryNote('outcome', 's3', 'Outcome', 'sahil', 'purple'))
      .addNote(new TheoryNote('impact', 's4', 'Impact', 'sahil', 'vision'))
      .addNote(new TheoryNote('unrelated', 's3', 'Unrelated', 'sahil', 'purple'))
      .connect(new CausalConnection('upstream-origin', 'upstream', 'origin', 'leads to'))
      .connect(new CausalConnection('origin-selected', 'origin', 'selected', 'leads to'))
      .connect(new CausalConnection('selected-outcome', 'selected', 'outcome', 'leads to'))
      .connect(new CausalConnection('outcome-impact', 'outcome', 'impact', 'leads to'))
      .connect(new CausalConnection('origin-sibling', 'origin', 'sibling', 'also leads to'))
      .connect(new CausalConnection('sibling-unrelated', 'sibling', 'unrelated', 'leads to'))
      .connect(new CausalConnection('co-parent-outcome', 'co-parent', 'outcome', 'also leads to'))

    const full = flow.traceFlow('selected')
    expect(full.noteIds).toEqual(new Set(['upstream', 'origin', 'selected', 'outcome', 'impact']))
    expect(full.connectionIds).toEqual(
      new Set(['upstream-origin', 'origin-selected', 'selected-outcome', 'outcome-impact']),
    )

    const direct = flow.traceFlow('selected', 'direct')
    expect(direct.noteIds).toEqual(new Set(['origin', 'selected', 'outcome']))
    expect(direct.connectionIds).toEqual(new Set(['origin-selected', 'selected-outcome']))
  })

  it('updates a connection in place while enforcing connection invariants', () => {
    const withNotes = canvas()
      .addNote(new TheoryNote('a', 'audience', 'Residents', 'sahil', 'green'))
      .addNote(new TheoryNote('b', 'activities', 'Town halls', 'sahil', 'yellow'))
      .addNote(new TheoryNote('c', 'impact', 'Agency', 'sahil', 'purple'))
      .addNote(new TheoryNote('d', 'activities', 'Workshops', 'sahil', 'yellow'))
      .connect(new CausalConnection('a-b', 'a', 'b', 'enables'))
      .connect(new CausalConnection('a-c', 'a', 'c', 'supports'))

    const updated = withNotes.updateConnection('a-b', 'b', 'c', 'builds trust')
    expect(updated.connections.find((connection) => connection.id === 'a-b')).toMatchObject({
      fromNoteId: 'b',
      toNoteId: 'c',
      label: 'builds trust',
    })
    const restored = TheoryOfChangeCanvas.fromJSON(updated.toJSON())
    expect(restored.connections.find((connection) => connection.id === 'a-b')).toMatchObject({
      fromNoteId: 'b',
      toNoteId: 'c',
      label: 'builds trust',
    })

    expect(() => withNotes.updateConnection('missing', 'a', 'b', 'valid')).toThrow('Unknown connection')
    expect(() => withNotes.updateConnection('a-b', 'missing', 'b', 'unknown')).toThrow('Unknown note')
    expect(() => withNotes.updateConnection('a-b', 'b', 'a', 'backwards')).toThrow('Connections must flow forward')
    expect(() => withNotes.updateConnection('a-b', 'b', 'd', 'same stage')).toThrow('Connections must flow forward')
    expect(() => withNotes.updateConnection('a-b', 'a', 'a', 'self')).toThrow('cannot connect to itself')
    expect(() => withNotes.updateConnection('a-b', 'a', 'b', '   ')).toThrow('Connection label cannot be empty')
    expect(() => withNotes.updateConnection('a-c', 'a', 'b', 'duplicate')).toThrow('Duplicate connection')
  })
})
