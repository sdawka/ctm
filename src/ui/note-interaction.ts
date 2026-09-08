export interface NoteSelectionState {
  selectedNoteId: string | null
  selectedNoteIds?: string[]
  multiSelectMode?: boolean
  connectionSourceId: string | null
  connectionMode: boolean
}

export interface NoteSelectionOptions {
  toggle?: boolean
}

type SelectionResult<T> = Omit<T, 'selectedNoteId' | 'selectedNoteIds'> &
  NoteSelectionState & { selectedNoteIds: string[] }

function selectedIds(state: NoteSelectionState): string[] {
  return state.selectedNoteIds?.length
    ? [...new Set(state.selectedNoteIds)]
    : state.selectedNoteId
      ? [state.selectedNoteId]
      : []
}

/**
 * A normal selection remains selected until the user explicitly deselects it.
 * Connection mode retains its two-step cause/effect selection.
 */
export function selectNote<T extends NoteSelectionState>(
  state: T,
  noteId: string,
  options: NoteSelectionOptions = {},
): SelectionResult<T> {
  if (!state.connectionMode) {
    const currentIds = selectedIds(state)
    const toggle = options.toggle || state.multiSelectMode === true
    if (!toggle) {
      return { ...state, selectedNoteId: noteId, selectedNoteIds: [noteId] } as SelectionResult<T>
    }

    const nextIds = currentIds.includes(noteId)
      ? currentIds.filter((id) => id !== noteId)
      : [...currentIds, noteId]
    return {
      ...state,
      selectedNoteIds: nextIds,
      selectedNoteId: nextIds.includes(noteId) ? noteId : (nextIds.at(-1) ?? null),
    } as SelectionResult<T>
  }

  if (!state.connectionSourceId) {
    return {
      ...state,
      connectionSourceId: noteId,
      selectedNoteId: noteId,
      selectedNoteIds: [noteId],
    } as SelectionResult<T>
  }

  if (state.connectionSourceId === noteId) {
    return { ...state, connectionSourceId: null, selectedNoteId: null, selectedNoteIds: [] } as SelectionResult<T>
  }

  return {
    ...state,
    connectionSourceId: null,
    selectedNoteId: noteId,
    selectedNoteIds: [noteId],
  } as SelectionResult<T>
}

export function isNoteActivationKey(key: string): boolean {
  return key === 'Enter' || key === ' '
}
