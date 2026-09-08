import { atom } from 'nanostores'
import {
  CausalConnection,
  Contributor,
  type NoteColor,
  TheoryNote,
  TheoryOfChangeCanvas,
} from '../domain/models'

export interface CanvasPersistence {
  load(): string | null
  save(value: string): void
}

export interface AddNoteInput {
  stageId: string
  text: string
  contributorName: string
  color: NoteColor
}

function newId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
  return `${prefix}-${uuid}`
}

function contributorId(name: string): string {
  const slug = name
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return slug || newId('person')
}

export function createCanvasStore(seed: TheoryOfChangeCanvas, persistence: CanvasPersistence) {
  let initial = seed
  const saved = persistence.load()
  if (saved) {
    try {
      initial = TheoryOfChangeCanvas.fromJSON(JSON.parse(saved))
    } catch {
      initial = seed
    }
  }

  const $canvas = atom(initial)

  function publish(next: TheoryOfChangeCanvas): void {
    $canvas.set(next)
    persistence.save(JSON.stringify(next.toJSON()))
  }

  return {
    $canvas,

    addNoteAs(input: AddNoteInput): TheoryNote {
      const name = input.contributorName.trim()
      if (!name) throw new Error('Enter a contributor name')
      let next = $canvas.get()
      let contributor = next.contributors.find(
        (item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
      )
      if (!contributor) {
        contributor = new Contributor(contributorId(name), name)
        next = next.addContributor(contributor)
      }
      const note = new TheoryNote(
        newId('note'),
        input.stageId,
        input.text.trim(),
        contributor.id,
        input.color,
      )
      next = next.addNote(note)
      publish(next)
      return note
    },

    connectNotes(fromNoteId: string, toNoteId: string, label: string): CausalConnection {
      const connection = new CausalConnection(
        newId('connection'),
        fromNoteId,
        toNoteId,
        label.trim() || 'contributes to',
      )
      publish($canvas.get().connect(connection))
      return connection
    },

    updateNote(noteId: string, text: string): void {
      publish($canvas.get().updateNote(noteId, text))
    },

    updateConnection(
      connectionId: string,
      fromNoteId: string,
      toNoteId: string,
      label: string,
    ): void {
      publish($canvas.get().updateConnection(connectionId, fromNoteId, toNoteId, label))
    },

    moveNote(noteId: string, stageId: string): void {
      publish($canvas.get().moveNote(noteId, stageId))
    },

    removeConnection(connectionId: string): void {
      publish($canvas.get().removeConnection(connectionId))
    },

    reset(): void {
      publish(seed)
    },
  }
}
