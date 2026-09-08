import { describe, expect, it } from 'vitest'
import { isNoteActivationKey, selectNote } from '../src/ui/note-interaction'

describe('note interaction', () => {
  it('keeps a normal selection when the same card is activated again', () => {
    const selected = selectNote(
      { selectedNoteId: 'note-1', connectionSourceId: null, connectionMode: false },
      'note-1',
    )

    expect(selected.selectedNoteId).toBe('note-1')
    expect(selected.selectedNoteIds).toEqual(['note-1'])
  })

  it('toggles extra selections and keeps a remaining note as the primary selection', () => {
    const added = selectNote(
      {
        selectedNoteId: 'note-1',
        selectedNoteIds: ['note-1'],
        connectionSourceId: null,
        connectionMode: false,
      },
      'note-2',
      { toggle: true },
    )
    const removedPrimary = selectNote(added, 'note-2', { toggle: true })
    const removedLast = selectNote(removedPrimary, 'note-1', { toggle: true })

    expect(added).toMatchObject({ selectedNoteId: 'note-2', selectedNoteIds: ['note-1', 'note-2'] })
    expect(removedPrimary).toMatchObject({ selectedNoteId: 'note-1', selectedNoteIds: ['note-1'] })
    expect(removedLast).toMatchObject({ selectedNoteId: null, selectedNoteIds: [] })
  })

  it('replaces the selection without a modifier when multi-select mode is off', () => {
    const selected = selectNote(
      {
        selectedNoteId: 'note-2',
        selectedNoteIds: ['note-1', 'note-2'],
        connectionSourceId: null,
        connectionMode: false,
      },
      'note-3',
    )

    expect(selected).toMatchObject({ selectedNoteId: 'note-3', selectedNoteIds: ['note-3'] })
  })

  it('adds selections without a modifier while multi-select mode is enabled', () => {
    const selected = selectNote(
      {
        selectedNoteId: 'note-1',
        selectedNoteIds: ['note-1'],
        multiSelectMode: true,
        connectionSourceId: null,
        connectionMode: false,
      },
      'note-2',
    )

    expect(selected).toMatchObject({ selectedNoteId: 'note-2', selectedNoteIds: ['note-1', 'note-2'] })
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
