export type NoteColor =
  | 'yellow'
  | 'blue'
  | 'teal'
  | 'purple'
  | 'orange'
  | 'gray'
  | 'green'
  | 'vision'

export interface ContributorDTO {
  id: string
  name: string
}

export interface StageDTO {
  id: string
  title: string
  description: string
  order: number
  defaultColor: NoteColor
}

export interface TheoryNoteDTO {
  id: string
  stageId: string
  text: string
  contributorId: string | null
  color: NoteColor
  needsReview: boolean
}

export interface CausalConnectionDTO {
  id: string
  fromNoteId: string
  toNoteId: string
  label: string
}

export interface TheoryOfChangeCanvasDTO {
  id: string
  title: string
  stages: StageDTO[]
  contributors: ContributorDTO[]
  notes: TheoryNoteDTO[]
  connections: CausalConnectionDTO[]
}

export class Contributor {
  constructor(
    readonly id: string,
    readonly name: string,
  ) {
    if (!id.trim() || !name.trim()) throw new Error('Contributor requires an id and name')
  }

  toJSON(): ContributorDTO {
    return { id: this.id, name: this.name }
  }
}

export class Stage {
  constructor(
    readonly id: string,
    readonly title: string,
    readonly description: string,
    readonly order: number,
    readonly defaultColor: NoteColor,
  ) {
    if (!id.trim() || !title.trim()) throw new Error('Stage requires an id and title')
  }

  toJSON(): StageDTO {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      order: this.order,
      defaultColor: this.defaultColor,
    }
  }
}

export class TheoryNote {
  readonly contributorId: string | null
  readonly needsReview: boolean

  constructor(
    readonly id: string,
    readonly stageId: string,
    readonly text: string,
    contributorId: string | null,
    readonly color: NoteColor,
    needsReview = false,
  ) {
    if (!id.trim() || !stageId.trim() || !text.trim()) {
      throw new Error('Note requires an id, stage, and text')
    }
    this.contributorId = contributorId
    this.needsReview = needsReview
  }

  withText(text: string): TheoryNote {
    return new TheoryNote(
      this.id,
      this.stageId,
      text,
      this.contributorId,
      this.color,
      this.needsReview,
    )
  }

  moveTo(stageId: string, color = this.color): TheoryNote {
    return new TheoryNote(
      this.id,
      stageId,
      this.text,
      this.contributorId,
      color,
      this.needsReview,
    )
  }

  toJSON(): TheoryNoteDTO {
    return {
      id: this.id,
      stageId: this.stageId,
      text: this.text,
      contributorId: this.contributorId,
      color: this.color,
      needsReview: this.needsReview,
    }
  }
}

export class CausalConnection {
  constructor(
    readonly id: string,
    readonly fromNoteId: string,
    readonly toNoteId: string,
    readonly label: string,
  ) {
    if (!id.trim() || !fromNoteId.trim() || !toNoteId.trim()) {
      throw new Error('Connection requires an id, source, and target')
    }
    if (fromNoteId === toNoteId) throw new Error('A note cannot connect to itself')
  }

  toJSON(): CausalConnectionDTO {
    return {
      id: this.id,
      fromNoteId: this.fromNoteId,
      toNoteId: this.toNoteId,
      label: this.label,
    }
  }
}

export class TheoryOfChangeCanvas {
  constructor(
    readonly id: string,
    readonly title: string,
    readonly stages: readonly Stage[],
    readonly contributors: readonly Contributor[],
    readonly notes: readonly TheoryNote[],
    readonly connections: readonly CausalConnection[],
  ) {}

  addContributor(contributor: Contributor): TheoryOfChangeCanvas {
    if (this.contributors.some((item) => item.id === contributor.id)) return this
    return this.copy({ contributors: [...this.contributors, contributor] })
  }

  addNote(note: TheoryNote): TheoryOfChangeCanvas {
    if (!this.stages.some((stage) => stage.id === note.stageId)) {
      throw new Error(`Unknown stage: ${note.stageId}`)
    }
    if (
      note.contributorId !== null &&
      !this.contributors.some((contributor) => contributor.id === note.contributorId)
    ) {
      throw new Error(`Unknown contributor: ${note.contributorId}`)
    }
    if (this.notes.some((item) => item.id === note.id)) {
      throw new Error(`Duplicate note: ${note.id}`)
    }
    return this.copy({ notes: [...this.notes, note] })
  }

  updateNote(noteId: string, text: string): TheoryOfChangeCanvas {
    if (!text.trim()) throw new Error('Note text cannot be empty')
    return this.copy({
      notes: this.notes.map((note) => (note.id === noteId ? note.withText(text.trim()) : note)),
    })
  }

  moveNote(noteId: string, stageId: string): TheoryOfChangeCanvas {
    const stage = this.stage(stageId)
    return this.copy({
      notes: this.notes.map((note) =>
        note.id === noteId ? note.moveTo(stageId, stage.defaultColor) : note,
      ),
    })
  }

  connect(connection: CausalConnection): TheoryOfChangeCanvas {
    const source = this.note(connection.fromNoteId)
    const target = this.note(connection.toNoteId)
    const sourceStage = this.stage(source.stageId)
    const targetStage = this.stage(target.stageId)
    if (sourceStage.order >= targetStage.order) {
      throw new Error('Connections must flow forward through the causal stages')
    }
    if (
      this.connections.some(
        (item) =>
          item.fromNoteId === connection.fromNoteId && item.toNoteId === connection.toNoteId,
      )
    ) {
      return this
    }
    return this.copy({ connections: [...this.connections, connection] })
  }

  removeConnection(connectionId: string): TheoryOfChangeCanvas {
    return this.copy({
      connections: this.connections.filter((connection) => connection.id !== connectionId),
    })
  }

  connectedNoteIds(noteId: string): Set<string> {
    const ids = new Set([noteId])
    for (const connection of this.connections) {
      if (connection.fromNoteId === noteId) ids.add(connection.toNoteId)
      if (connection.toNoteId === noteId) ids.add(connection.fromNoteId)
    }
    return ids
  }

  toJSON(): TheoryOfChangeCanvasDTO {
    return {
      id: this.id,
      title: this.title,
      stages: this.stages.map((stage) => stage.toJSON()),
      contributors: this.contributors.map((contributor) => contributor.toJSON()),
      notes: this.notes.map((note) => note.toJSON()),
      connections: this.connections.map((connection) => connection.toJSON()),
    }
  }

  static fromJSON(dto: TheoryOfChangeCanvasDTO): TheoryOfChangeCanvas {
    return new TheoryOfChangeCanvas(
      dto.id,
      dto.title,
      dto.stages.map(
        (stage) =>
          new Stage(stage.id, stage.title, stage.description, stage.order, stage.defaultColor),
      ),
      dto.contributors.map((contributor) => new Contributor(contributor.id, contributor.name)),
      dto.notes.map(
        (note) =>
          new TheoryNote(
            note.id,
            note.stageId,
            note.text,
            note.contributorId,
            note.color,
            note.needsReview,
          ),
      ),
      dto.connections.map(
        (connection) =>
          new CausalConnection(
            connection.id,
            connection.fromNoteId,
            connection.toNoteId,
            connection.label,
          ),
      ),
    )
  }

  private stage(stageId: string): Stage {
    const stage = this.stages.find((item) => item.id === stageId)
    if (!stage) throw new Error(`Unknown stage: ${stageId}`)
    return stage
  }

  private note(noteId: string): TheoryNote {
    const note = this.notes.find((item) => item.id === noteId)
    if (!note) throw new Error(`Unknown note: ${noteId}`)
    return note
  }

  private copy(changes: {
    stages?: readonly Stage[]
    contributors?: readonly Contributor[]
    notes?: readonly TheoryNote[]
    connections?: readonly CausalConnection[]
  }): TheoryOfChangeCanvas {
    return new TheoryOfChangeCanvas(
      this.id,
      this.title,
      changes.stages ?? this.stages,
      changes.contributors ?? this.contributors,
      changes.notes ?? this.notes,
      changes.connections ?? this.connections,
    )
  }
}
