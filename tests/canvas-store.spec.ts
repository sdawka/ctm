import { describe, expect, it } from 'vitest'
import { Contributor, Stage, TheoryOfChangeCanvas, TheoryNote } from '../src/domain/models'
import { createCanvasStore } from '../src/stores/canvas-store'

function initialCanvas() {
  return new TheoryOfChangeCanvas(
    'canvas',
    'Test canvas',
    [
      new Stage('audience', 'Audience', '', 0, 'green'),
      new Stage('activities', 'Activities', '', 1, 'yellow'),
      new Stage('impact', 'Impact', '', 2, 'purple'),
    ],
    [new Contributor('seed-person', 'Seed Person')],
    [
      new TheoryNote('a', 'audience', 'Residents', 'seed-person', 'green'),
      new TheoryNote('b', 'activities', 'Town halls', 'seed-person', 'yellow'),
    ],
    [],
  )
}

describe('canvas nanostore', () => {
  it('adds a note as a named contributor and persists the domain snapshot', () => {
    let saved = ''
    const store = createCanvasStore(initialCanvas(), {
      load: () => null,
      save: (value) => {
        saved = value
      },
    })

    store.addNoteAs({
      stageId: 'impact',
      text: 'People gain agency',
      contributorName: 'Sahil',
      color: 'purple',
    })

    const state = store.$canvas.get()
    expect(state).toBeInstanceOf(TheoryOfChangeCanvas)
    expect(state.notes.at(-1)?.text).toBe('People gain agency')
    expect(state.contributors.at(-1)?.name).toBe('Sahil')
    expect(JSON.parse(saved).notes.at(-1).text).toBe('People gain agency')
  })

  it('adds a forward connection through a domain-validated action', () => {
    const store = createCanvasStore(initialCanvas(), { load: () => null, save: () => undefined })

    store.connectNotes('a', 'b', 'participate in')

    expect(store.$canvas.get().connections).toHaveLength(1)
    expect(store.$canvas.get().connections[0]?.label).toBe('participate in')
  })

  it('persists one successful connection update and leaves state untouched after a rejected update', () => {
    let writes = 0
    const store = createCanvasStore(initialCanvas(), {
      load: () => null,
      save: () => {
        writes += 1
      },
    })
    const connection = store.connectNotes('a', 'b', 'participate in')
    writes = 0

    store.updateConnection(connection.id, 'a', 'b', 'builds trust')
    expect(writes).toBe(1)
    expect(store.$canvas.get().connections[0]).toMatchObject({
      id: connection.id,
      label: 'builds trust',
    })

    const before = store.$canvas.get().toJSON()
    expect(() => store.updateConnection(connection.id, 'b', 'a', 'backwards')).toThrow(
      'Connections must flow forward',
    )
    expect(writes).toBe(1)
    expect(store.$canvas.get().toJSON()).toEqual(before)
  })
})
