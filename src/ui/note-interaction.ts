export interface NoteSelectionState {
  selectedNoteId: string | null
  connectionSourceId: string | null
  connectionMode: boolean
}

/**
 * A normal selection remains selected until the user explicitly deselects it.
 * Connection mode retains its two-step cause/effect selection.
 */
export function selectNote<T extends NoteSelectionState>(
  state: T,
  noteId: string,
): T {
  if (!state.connectionMode) {
    return { ...state, selectedNoteId: noteId } as T
  }

  if (!state.connectionSourceId) {
    return { ...state, connectionSourceId: noteId, selectedNoteId: noteId } as T
  }

  if (state.connectionSourceId === noteId) {
    return { ...state, connectionSourceId: null, selectedNoteId: null } as T
  }

  return { ...state, connectionSourceId: null, selectedNoteId: noteId } as T
}

export function isNoteActivationKey(key: string): boolean {
  return key === 'Enter' || key === ' '
}
