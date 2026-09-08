import { describe, expect, it } from 'vitest'
import { isNoteActivationKey, selectNote } from '../src/ui/note-interaction'

describe('note interaction', () => {
  it('keeps a normal selection when the same card is activated again', () => {
    const selected = selectNote(
      { selectedNoteId: 'note-1', connectionSourceId: null, connectionMode: false },
      'note-1',
    )

    expect(selected.selectedNoteId).toBe('note-1')
  })

  it('treats Enter and Space as card activation keys', () => {
    expect(isNoteActivationKey('Enter')).toBe(true)
    expect(isNoteActivationKey(' ')).toBe(true)
    expect(isNoteActivationKey('Escape')).toBe(false)
  })

  it('keeps connection mode cause/effect selection semantics', () => {
    const source = selectNote(
      { selectedNoteId: null, connectionSourceId: null, connectionMode: true },
      'cause',
    )
    const effect = selectNote(source, 'effect')

    expect(source).toMatchObject({ connectionSourceId: 'cause', selectedNoteId: 'cause' })
    expect(effect).toMatchObject({ connectionSourceId: null, selectedNoteId: 'effect' })
  })
})
