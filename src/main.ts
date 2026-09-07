import { atom } from 'nanostores'
import './style.css'
import { seedCanvas } from './data/seed'
import type { CausalConnection, NoteColor, TheoryNote } from './domain/models'
import { createCanvasStore } from './stores/canvas-store'
import { connectionPath } from './ui/connection-geometry'

const CANVAS_STORAGE_KEY = 'ctm-theory-of-change-canvas-v2'
const CONTRIBUTOR_STORAGE_KEY = 'ctm-theory-of-change-contributor'

interface UiState {
  selectedNoteId: string | null
  connectionSourceId: string | null
  connectionMode: boolean
  showConnections: boolean
  search: string
  contributorName: string
}

const persistence = {
  load: () => localStorage.getItem(CANVAS_STORAGE_KEY),
  save: (value: string) => localStorage.setItem(CANVAS_STORAGE_KEY, value),
}

const canvasStore = createCanvasStore(seedCanvas, persistence)
const $ui = atom<UiState>({
  selectedNoteId: null,
  connectionSourceId: null,
  connectionMode: false,
  showConnections: true,
  search: '',
  contributorName: localStorage.getItem(CONTRIBUTOR_STORAGE_KEY) ?? '',
})

function element<T extends Element>(selector: string): T {
  const found = document.querySelector<T>(selector)
  if (!found) throw new Error(`Missing UI element: ${selector}`)
  return found
}

const columnsElement = element<HTMLDivElement>('#columns')
const surfaceElement = element<HTMLDivElement>('#board-surface')
const svgElement = element<SVGSVGElement>('#connection-layer')
const logicPanel = element<HTMLElement>('#logic-panel')
const searchInput = element<HTMLInputElement>('#search')
const workingAsInput = element<HTMLInputElement>('#working-as')
const contributorList = element<HTMLDataListElement>('#contributors')
const connectionButton = element<HTMLButtonElement>('#connect-mode')
const connectionsButton = element<HTMLButtonElement>('#toggle-connections')
const connectionStatus = element<HTMLElement>('#connection-status')
const connectionMessage = element<HTMLElement>('#connection-message')
const addDialog = element<HTMLDialogElement>('#add-note-dialog')
const addForm = element<HTMLFormElement>('#add-note-form')
const authorInput = element<HTMLInputElement>('#note-author')
const stageSelect = element<HTMLSelectElement>('#note-stage')
const colorSelect = element<HTMLSelectElement>('#note-color')
const textInput = element<HTMLTextAreaElement>('#note-text')
const toastElement = element<HTMLElement>('#toast')

let toastTimer: number | undefined
let draggingNoteId: string | null = null

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => {
    const replacements: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    }
    return replacements[char] ?? char
  })
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase() ?? '')
    .join('')
}

function shortText(text: string, length = 72): string {
  const oneLine = text.replace(/\s+/g, ' ').trim()
  return oneLine.length > length ? `${oneLine.slice(0, length - 1)}…` : oneLine
}

function showToast(message: string): void {
  window.clearTimeout(toastTimer)
  toastElement.textContent = message
  toastElement.classList.add('show')
  toastTimer = window.setTimeout(() => toastElement.classList.remove('show'), 2600)
}

function noteById(noteId: string): TheoryNote | undefined {
  return canvasStore.$canvas.get().notes.find((note) => note.id === noteId)
}

function contributorName(note: TheoryNote): string {
  const canvas = canvasStore.$canvas.get()
  return (
    canvas.contributors.find((contributor) => contributor.id === note.contributorId)?.name ??
    'Workshop participant'
  )
}

function noteMarkup(note: TheoryNote, ui: UiState): string {
  const author = contributorName(note)
  const related = ui.selectedNoteId
    ? canvasStore.$canvas.get().connectedNoteIds(ui.selectedNoteId).has(note.id)
    : true
  const matches = !ui.search || `${note.text} ${author}`.toLocaleLowerCase().includes(ui.search)
  const classes = [
    'note',
    ui.selectedNoteId === note.id ? 'selected' : '',
    ui.connectionSourceId === note.id ? 'connect-source' : '',
    !related ? 'unrelated' : '',
    !matches ? 'search-hidden' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return `
    <article class="${classes}" draggable="true" data-note-id="${note.id}" data-color="${note.color}" tabindex="0" aria-label="${escapeHtml(shortText(note.text))}">
      ${note.needsReview ? '<span class="review-dot" title="OCR wording needs review"></span>' : ''}
      <div class="note-text" contenteditable="true" role="textbox" aria-label="Edit note">${escapeHtml(note.text)}</div>
      <footer class="note-meta"><span class="avatar">${escapeHtml(initials(author))}</span><span>${escapeHtml(author)}</span></footer>
    </article>`
}

function renderBoard(): void {
  const canvas = canvasStore.$canvas.get()
  const ui = $ui.get()
  const scroll = element<HTMLDivElement>('#board-scroll')
  const previousScroll = { left: scroll.scrollLeft, top: scroll.scrollTop }

  columnsElement.innerHTML = canvas.stages
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((stage, index) => {
      const stageNotes = canvas.notes.filter((note) => note.stageId === stage.id)
      return `
        <section class="column" data-stage="${stage.id}">
          <header class="column-head">
            <p class="mono-label">0${index + 1} · causal stage</p>
            <h3>${escapeHtml(stage.title)}</h3>
            <p>${escapeHtml(stage.description)}</p>
          </header>
          <div class="column-notes" data-drop-stage="${stage.id}">
            ${stageNotes.map((note) => noteMarkup(note, ui)).join('')}
          </div>
          <button class="add-stage-note" type="button" data-add-stage="${stage.id}">+ Add note as ${escapeHtml(ui.contributorName || 'someone')}</button>
        </section>`
    })
    .join('')

  element<HTMLElement>('#note-count').textContent = String(canvas.notes.length)
  element<HTMLElement>('#connection-count').textContent = String(canvas.connections.length)
  renderContributorOptions()
  renderConnectionControls()
  renderInspector()
  bindBoardEvents()

  scroll.scrollTo(previousScroll)
  requestAnimationFrame(drawConnections)
}

function renderContributorOptions(): void {
  const canvas = canvasStore.$canvas.get()
  contributorList.innerHTML = canvas.contributors
    .map((contributor) => `<option value="${escapeHtml(contributor.name)}"></option>`)
    .join('')
  workingAsInput.value = $ui.get().contributorName
}

function renderConnectionControls(): void {
  const ui = $ui.get()
  document.body.classList.toggle('connecting', ui.connectionMode)
  document.body.classList.toggle('connections-hidden', !ui.showConnections)
  connectionButton.classList.toggle('active', ui.connectionMode)
  connectionButton.textContent = ui.connectionMode ? 'Connecting…' : 'Connect notes'
  connectionsButton.textContent = ui.showConnections ? 'Hide connections' : 'Show connections'
  connectionStatus.hidden = !ui.connectionMode
  connectionMessage.textContent = ui.connectionSourceId
    ? 'Now choose an effect in a later column.'
    : 'Choose a cause note.'
}

function renderInspector(): void {
  const canvas = canvasStore.$canvas.get()
  const noteId = $ui.get().selectedNoteId
  const selected = noteId ? noteById(noteId) : undefined
  if (!selected) {
    logicPanel.innerHTML = `
      <p class="mono-label">Logic inspector</p>
      <h2>Select a note</h2>
      <p>Its incoming causes and outgoing effects will appear here while unrelated paths fade.</p>`
    return
  }

  const links = canvas.connections.filter(
    (connection) => connection.fromNoteId === noteId || connection.toNoteId === noteId,
  )
  logicPanel.innerHTML = `
    <p class="mono-label">Logic inspector · ${links.length} direct link${links.length === 1 ? '' : 's'}</p>
    <h2>${escapeHtml(shortText(selected.text, 95))}</h2>
    <p>Added by ${escapeHtml(contributorName(selected))}</p>
    <div class="logic-list">
      ${
        links.length
          ? links
              .map((connection) => {
                const outgoing = connection.fromNoteId === noteId
                const other = noteById(outgoing ? connection.toNoteId : connection.fromNoteId)
                return `<div class="logic-link"><span class="logic-direction">${outgoing ? '→' : '←'}</span><span><strong>${escapeHtml(connection.label)}</strong><br>${escapeHtml(shortText(other?.text ?? 'Missing note', 65))}</span></div>`
              })
              .join('')
          : '<div class="logic-link">No causal links yet. Use “Connect notes” to add one.</div>'
      }
    </div>`
}

function bindBoardEvents(): void {
  document.querySelectorAll<HTMLElement>('.note').forEach((noteElement) => {
    const noteId = noteElement.dataset.noteId
    if (!noteId) return

    noteElement.addEventListener('click', (event) => {
      if ((event.target as Element).closest('.note-text') && document.activeElement === event.target) {
        return
      }
      handleNoteSelection(noteId)
    })
    noteElement.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !(event.target as Element).classList.contains('note-text')) {
        event.preventDefault()
        handleNoteSelection(noteId)
      }
    })
    noteElement.addEventListener('mouseenter', () => {
      if (!$ui.get().selectedNoteId && !$ui.get().connectionMode) {
        $ui.set({ ...$ui.get(), selectedNoteId: noteId })
      }
    })
    noteElement.addEventListener('mouseleave', () => {
      if (!$ui.get().connectionMode && $ui.get().selectedNoteId === noteId) {
        $ui.set({ ...$ui.get(), selectedNoteId: null })
      }
    })
    noteElement.addEventListener('dragstart', () => {
      draggingNoteId = noteId
      noteElement.classList.add('dragging')
    })
    noteElement.addEventListener('dragend', () => {
      draggingNoteId = null
      noteElement.classList.remove('dragging')
      document.querySelectorAll('.drop-target').forEach((item) => item.classList.remove('drop-target'))
    })
    const text = noteElement.querySelector<HTMLElement>('.note-text')
    text?.addEventListener('click', (event) => event.stopPropagation())
    text?.addEventListener('blur', () => {
      const value = text.innerText.trim()
      const current = noteById(noteId)
      if (current && value && value !== current.text) {
        canvasStore.updateNote(noteId, value)
        showToast('Note updated')
      } else if (!value && current) {
        text.textContent = current.text
        showToast('A note cannot be empty')
      }
    })
  })

  document.querySelectorAll<HTMLElement>('[data-drop-stage]').forEach((dropZone) => {
    const stageId = dropZone.dataset.dropStage
    dropZone.addEventListener('dragover', (event) => {
      event.preventDefault()
      dropZone.closest('.column')?.classList.add('drop-target')
    })
    dropZone.addEventListener('dragleave', () => dropZone.closest('.column')?.classList.remove('drop-target'))
    dropZone.addEventListener('drop', (event) => {
      event.preventDefault()
      dropZone.closest('.column')?.classList.remove('drop-target')
      if (!draggingNoteId || !stageId) return
      try {
        canvasStore.moveNote(draggingNoteId, stageId)
        showToast('Note moved; existing causal links were preserved')
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Could not move note')
      }
    })
  })

  document.querySelectorAll<HTMLButtonElement>('[data-add-stage]').forEach((button) => {
    button.addEventListener('click', () => openAddDialog(button.dataset.addStage))
  })
}

function handleNoteSelection(noteId: string): void {
  const ui = $ui.get()
  if (!ui.connectionMode) {
    $ui.set({ ...ui, selectedNoteId: ui.selectedNoteId === noteId ? null : noteId })
    return
  }
  if (!ui.connectionSourceId) {
    $ui.set({ ...ui, connectionSourceId: noteId, selectedNoteId: noteId })
    return
  }
  if (ui.connectionSourceId === noteId) {
    $ui.set({ ...ui, connectionSourceId: null, selectedNoteId: null })
    return
  }
  try {
    canvasStore.connectNotes(ui.connectionSourceId, noteId, 'contributes to')
    $ui.set({ ...ui, connectionSourceId: null, selectedNoteId: noteId })
    showToast('Causal connection added')
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Could not connect notes')
  }
}

function drawConnections(): void {
  const canvas = canvasStore.$canvas.get()
  const ui = $ui.get()
  const surfaceRect = surfaceElement.getBoundingClientRect()
  const selectedId = ui.selectedNoteId
  const visibleNoteIds = new Set(
    Array.from(document.querySelectorAll<HTMLElement>('.note:not(.search-hidden)'))
      .map((element) => element.dataset.noteId)
      .filter((id): id is string => Boolean(id)),
  )

  svgElement.setAttribute('viewBox', `0 0 ${surfaceElement.scrollWidth} ${surfaceElement.scrollHeight}`)
  svgElement.innerHTML = `
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#7650a4"></path>
      </marker>
    </defs>`

  for (const connection of canvas.connections) {
    const source = document.querySelector<HTMLElement>(`[data-note-id="${connection.fromNoteId}"]`)
    const target = document.querySelector<HTMLElement>(`[data-note-id="${connection.toNoteId}"]`)
    if (!source || !target) continue
    if (!visibleNoteIds.has(connection.fromNoteId) || !visibleNoteIds.has(connection.toNoteId)) continue
    const sourceRect = source.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const sourcePoint = {
      x: sourceRect.right - surfaceRect.left,
      y: sourceRect.top - surfaceRect.top + sourceRect.height / 2,
    }
    const targetPoint = {
      x: targetRect.left - surfaceRect.left,
      y: targetRect.top - surfaceRect.top + targetRect.height / 2,
    }
    const active = selectedId
      ? connection.fromNoteId === selectedId || connection.toNoteId === selectedId
      : false
    const dimmed = selectedId ? !active : false
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', connectionPath(sourcePoint, targetPoint))
    path.setAttribute('class', `connection-path${active ? ' active' : ''}${dimmed ? ' dimmed' : ''}`)
    path.dataset.connectionId = connection.id
    svgElement.appendChild(path)

    if (active) drawConnectionLabel(connection, sourcePoint, targetPoint)
  }
}

function drawConnectionLabel(
  connection: CausalConnection,
  source: { x: number; y: number },
  target: { x: number; y: number },
): void {
  const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  label.setAttribute('x', String((source.x + target.x) / 2))
  label.setAttribute('y', String((source.y + target.y) / 2 - 8))
  label.setAttribute('text-anchor', 'middle')
  label.setAttribute('class', 'connection-label')
  label.textContent = connection.label
  svgElement.appendChild(label)
}

function openAddDialog(stageId?: string): void {
  const ui = $ui.get()
  authorInput.value = ui.contributorName
  if (stageId) stageSelect.value = stageId
  textInput.value = ''
  const stage = canvasStore.$canvas.get().stages.find((item) => item.id === stageSelect.value)
  colorSelect.value = stage?.defaultColor === 'vision' ? 'purple' : (stage?.defaultColor ?? 'yellow')
  addDialog.showModal()
  window.setTimeout(() => (authorInput.value ? textInput.focus() : authorInput.focus()), 0)
}

function populateStageSelect(): void {
  stageSelect.innerHTML = canvasStore.$canvas
    .get()
    .stages.slice()
    .sort((left, right) => left.order - right.order)
    .map((stage) => `<option value="${stage.id}">${escapeHtml(stage.title)}</option>`)
    .join('')
}

addForm.addEventListener('submit', (event) => {
  event.preventDefault()
  try {
    const note = canvasStore.addNoteAs({
      stageId: stageSelect.value,
      text: textInput.value,
      contributorName: authorInput.value,
      color: colorSelect.value as NoteColor,
    })
    const name = authorInput.value.trim()
    localStorage.setItem(CONTRIBUTOR_STORAGE_KEY, name)
    $ui.set({ ...$ui.get(), contributorName: name, selectedNoteId: note.id })
    addDialog.close()
    showToast(`Note added as ${name}`)
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Could not add note')
  }
})

workingAsInput.addEventListener('change', () => {
  const name = workingAsInput.value.trim()
  localStorage.setItem(CONTRIBUTOR_STORAGE_KEY, name)
  $ui.set({ ...$ui.get(), contributorName: name })
})
searchInput.addEventListener('input', () => {
  $ui.set({ ...$ui.get(), search: searchInput.value.trim().toLocaleLowerCase() })
})
connectionButton.addEventListener('click', () => {
  const ui = $ui.get()
  $ui.set({
    ...ui,
    connectionMode: !ui.connectionMode,
    connectionSourceId: null,
    selectedNoteId: null,
  })
})
connectionsButton.addEventListener('click', () => {
  $ui.set({ ...$ui.get(), showConnections: !($ui.get().showConnections) })
})
element<HTMLButtonElement>('#cancel-connect').addEventListener('click', () => {
  $ui.set({ ...$ui.get(), connectionMode: false, connectionSourceId: null, selectedNoteId: null })
})
element<HTMLButtonElement>('#open-add-note').addEventListener('click', () => openAddDialog())
element<HTMLButtonElement>('#more-actions').addEventListener('click', () => {
  const menu = element<HTMLElement>('#more-menu')
  menu.hidden = !menu.hidden
})
element<HTMLButtonElement>('#export').addEventListener('click', () => {
  const payload = JSON.stringify(canvasStore.$canvas.get().toJSON(), null, 2)
  const blob = new Blob([payload], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'civic-tech-montreal-theory-of-change.json'
  link.click()
  URL.revokeObjectURL(link.href)
})
element<HTMLButtonElement>('#print').addEventListener('click', () => window.print())
element<HTMLButtonElement>('#reset').addEventListener('click', () => {
  if (!window.confirm('Reset all notes, contributors, and causal links to the source model?')) return
  canvasStore.reset()
  $ui.set({ ...$ui.get(), selectedNoteId: null, connectionSourceId: null })
  showToast('Canvas reset to source')
})
stageSelect.addEventListener('change', () => {
  const stage = canvasStore.$canvas.get().stages.find((item) => item.id === stageSelect.value)
  colorSelect.value = stage?.defaultColor === 'vision' ? 'purple' : (stage?.defaultColor ?? 'yellow')
})
element<HTMLDivElement>('#board-scroll').addEventListener('scroll', () => requestAnimationFrame(drawConnections))
window.addEventListener('resize', () => requestAnimationFrame(drawConnections))

populateStageSelect()
canvasStore.$canvas.subscribe(() => renderBoard())
$ui.subscribe(() => renderBoard())
