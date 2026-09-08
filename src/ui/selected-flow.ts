import type { CausalConnection, TheoryOfChangeCanvas, TheoryNote } from '../domain/models'

export interface SelectedFlowTrace {
  noteIds: Set<string>
  connectionIds: Set<string>
  connected: boolean
}

/**
 * Returns only the directed causal paths joining each consecutive selected note.
 * Selections are normalized into causal-stage order so a user can select cards
 * in either visual order.
 */
export function traceSelectedFlow(
  canvas: TheoryOfChangeCanvas,
  selectedIds: string[],
): SelectedFlowTrace {
  const notesById = new Map(canvas.notes.map((note) => [note.id, note]))
  const stageOrder = new Map(canvas.stages.map((stage) => [stage.id, stage.order]))
  const selectedNotes = uniqueValidNotes(selectedIds, notesById)
  const selectedNoteIds = new Set(selectedNotes.map((note) => note.id))

  if (selectedNotes.length === 0) {
    return { noteIds: selectedNoteIds, connectionIds: new Set(), connected: false }
  }

  if (selectedNotes.length === 1) {
    const trace = canvas.traceFlow(selectedNotes[0]!.id)
    return { ...trace, connected: false }
  }

  selectedNotes.sort((left, right) => {
    const orderDifference = stageOrder.get(left.stageId)! - stageOrder.get(right.stageId)!
    return orderDifference || left.id.localeCompare(right.id)
  })

  const noteIds = new Set<string>()
  const connectionIds = new Set<string>()
  for (let index = 0; index < selectedNotes.length - 1; index += 1) {
    const source = selectedNotes[index]!
    const target = selectedNotes[index + 1]!
    if (stageOrder.get(source.stageId) === stageOrder.get(target.stageId)) {
      return { noteIds: selectedNoteIds, connectionIds: new Set(), connected: false }
    }

    const path = pathsBetween(canvas.connections, source.id, target.id)
    if (!path) {
      return { noteIds: selectedNoteIds, connectionIds: new Set(), connected: false }
    }
    for (const noteId of path.noteIds) noteIds.add(noteId)
    for (const connectionId of path.connectionIds) connectionIds.add(connectionId)
  }

  return { noteIds, connectionIds, connected: true }
}

function uniqueValidNotes(
  selectedIds: string[],
  notesById: Map<string, TheoryNote>,
): TheoryNote[] {
  const seen = new Set<string>()
  const notes: TheoryNote[] = []
  for (const id of selectedIds) {
    const note = notesById.get(id)
    if (!note || seen.has(id)) continue
    seen.add(id)
    notes.push(note)
  }
  return notes
}

function pathsBetween(
  connections: readonly CausalConnection[],
  sourceId: string,
  targetId: string,
): { noteIds: Set<string>; connectionIds: Set<string> } | null {
  const descendants = reachableNoteIds(connections, sourceId, 'outgoing')
  if (!descendants.has(targetId)) return null

  const ancestors = reachableNoteIds(connections, targetId, 'incoming')
  const pathNoteIds = new Set([...descendants].filter((id) => ancestors.has(id)))
  const connectionIds = new Set<string>()
  for (const connection of connections) {
    if (pathNoteIds.has(connection.fromNoteId) && pathNoteIds.has(connection.toNoteId)) {
      connectionIds.add(connection.id)
    }
  }
  return { noteIds: pathNoteIds, connectionIds }
}

function reachableNoteIds(
  connections: readonly CausalConnection[],
  startId: string,
  direction: 'incoming' | 'outgoing',
): Set<string> {
  const visited = new Set([startId])
  const pending = [startId]
  while (pending.length > 0) {
    const currentId = pending.pop()!
    for (const connection of connections) {
      const matches =
        direction === 'outgoing'
          ? connection.fromNoteId === currentId
          : connection.toNoteId === currentId
      if (!matches) continue
      const nextId = direction === 'outgoing' ? connection.toNoteId : connection.fromNoteId
      if (!visited.has(nextId)) {
        visited.add(nextId)
        pending.push(nextId)
      }
    }
  }
  return visited
}
