import { atom } from 'nanostores'
import './style.css'
import { seedCanvas } from './data/seed'
import type { CausalConnection, NoteColor, TheoryNote } from './domain/models'
import { createCanvasStore } from './stores/canvas-store'
import { connectionPath } from './ui/connection-geometry'
import { isNoteActivationKey, selectNote } from './ui/note-interaction'

const CANVAS_STORAGE_KEY = 'ctm-theory-of-change-canvas-v2'
const CONTRIBUTOR_STORAGE_KEY = 'ctm-theory-of-change-contributor'

interface UiState {
  selectedNoteId: string | null
  flowMode: 'full' | 'direct'
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
  flowMode: 'full',
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
const boardScroll = element<HTMLDivElement>('#board-scroll')
const stageHeaderViewport = element<HTMLDivElement>('#stage-header-viewport')
const stageHeadersElement = element<HTMLDivElement>('#stage-headers')
const svgElement = element<SVGSVGElement>('#connection-layer')
const activeSvgElement = element<SVGSVGElement>('#active-connection-layer')
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
const moreActionsButton = element<HTMLButtonElement>('#more-actions')
const moreMenu = element<HTMLElement>('#more-menu')
const relationDialog = element<HTMLDialogElement>('#edit-relation-dialog')
const relationForm = element<HTMLFormElement>('#edit-relation-form')
const relationSource = element<HTMLSelectElement>('#relation-source')
const relationTarget = element<HTMLSelectElement>('#relation-target')
const relationLabel = element<HTMLInputElement>('#relation-label')
const relationError = element<HTMLElement>('#relation-error')
const deleteRelationButton = element<HTMLButtonElement>('#delete-relation')

let editingConnectionId: string | null = null
let relationFocusConnectionId: string | null = null

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

function tracedFlow(noteId = $ui.get().selectedNoteId) {
  if (!noteId) return null
  return canvasStore.$canvas.get().traceFlow(noteId, $ui.get().flowMode)
}

function stageSortedNotes(): TheoryNote[] {
  const stageOrder = new Map(
    canvasStore.$canvas.get().stages.map((stage) => [stage.id, stage.order]),
  )
  return canvasStore.$canvas
    .get()
    .notes.slice()
    .sort((left, right) =>
      (stageOrder.get(left.stageId) ?? 0) - (stageOrder.get(right.stageId) ?? 0) ||
      left.text.localeCompare(right.text),
    )
}

function noteMarkup(note: TheoryNote, ui: UiState, related = true): string {
  const author = contributorName(note)
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
    <article class="${classes}" draggable="true" data-note-id="${note.id}" data-color="${note.color}" tabindex="0" aria-label="${escapeHtml(shortText(note.text))}. Press F2 or double-click the text to edit.">
      ${note.needsReview ? '<span class="review-dot" title="OCR wording needs review"></span>' : ''}
      <div class="note-text" contenteditable="false" role="textbox" aria-label="Note text. Double-click to edit.">${escapeHtml(note.text)}</div>
      <footer class="note-meta"><span class="avatar">${escapeHtml(initials(author))}</span><span>${escapeHtml(author)}</span></footer>
    </article>`
}

function stageHeaderId(stageId: string): string {
  return `stage-header-${stageId}`
}

function syncStageHeaderScroll(): void {
  const width = `${boardScroll.clientWidth}px`
  if (stageHeaderViewport.style.width !== width) stageHeaderViewport.style.width = width
  stageHeaderViewport.scrollLeft = boardScroll.scrollLeft
}

function renderBoard(): void {
  const canvas = canvasStore.$canvas.get()
  const ui = $ui.get()
  const previousScroll = { left: boardScroll.scrollLeft, top: boardScroll.scrollTop }
  const stages = canvas.stages.slice().sort((left, right) => left.order - right.order)
  const flow = tracedFlow(ui.selectedNoteId)

  stageHeadersElement.innerHTML = stages
    .map(
      (stage, index) => `
        <header class="stage-header" id="${stageHeaderId(stage.id)}" title="${escapeHtml(stage.description)}" aria-label="Stage ${index + 1}: ${escapeHtml(stage.title)}. ${escapeHtml(stage.description)}">
          <p class="mono-label">${String(index + 1).padStart(2, '0')}</p>
          <h3>${escapeHtml(stage.title)}</h3>
        </header>`,
    )
    .join('')

  columnsElement.innerHTML = stages
    .map((stage) => {
      const stageNotes = canvas.notes.filter((note) => note.stageId === stage.id)
      return `
        <section class="column" data-stage="${stage.id}" aria-labelledby="${stageHeaderId(stage.id)}">
          <div class="column-notes" data-drop-stage="${stage.id}">
            ${stageNotes.map((note) => noteMarkup(note, ui, flow?.noteIds.has(note.id) ?? true)).join('')}
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

  boardScroll.scrollTo(previousScroll)
  requestAnimationFrame(() => {
    syncStageHeaderScroll()
    drawConnections()
  })
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
  const ui = $ui.get()
  const noteId = ui.selectedNoteId
  const selected = noteId ? noteById(noteId) : undefined
  logicPanel.hidden = !selected
  if (!selected) {
    logicPanel.innerHTML = `
      <p class="mono-label">Logic inspector</p>
      <h2>Select a note</h2>
      <p>Its incoming causes and outgoing effects will appear here while unrelated paths fade.</p>`
    return
  }

  const flow = canvas.traceFlow(selected.id, ui.flowMode)
  const stageOrder = new Map(canvas.stages.map((stage) => [stage.id, stage.order]))
  const links = canvas.connections
    .filter((connection) => flow.connectionIds.has(connection.id))
    .sort((left, right) => {
      const leftSource = noteById(left.fromNoteId)
      const rightSource = noteById(right.fromNoteId)
      const leftTarget = noteById(left.toNoteId)
      const rightTarget = noteById(right.toNoteId)
      return (
        (stageOrder.get(leftSource?.stageId ?? '') ?? 0) -
          (stageOrder.get(rightSource?.stageId ?? '') ?? 0) ||
        (stageOrder.get(leftTarget?.stageId ?? '') ?? 0) -
          (stageOrder.get(rightTarget?.stageId ?? '') ?? 0) ||
        left.label.localeCompare(right.label)
      )
    })
  const visibleNoteIds = new Set(
    Array.from(document.querySelectorAll<HTMLElement>('.note:not(.search-hidden)'))
      .map((element) => element.dataset.noteId)
      .filter((id): id is string => Boolean(id)),
  )
  const visibleFlowNotes = Array.from(flow.noteIds).filter((id) => visibleNoteIds.has(id)).length
  const visibleFlowConnections = links.filter(
    (connection) => visibleNoteIds.has(connection.fromNoteId) && visibleNoteIds.has(connection.toNoteId),
  ).length
  const flowIsFiltered = visibleFlowNotes !== flow.noteIds.size || visibleFlowConnections !== links.length
  const relationRows = links
    .map((connection) => {
      const source = noteById(connection.fromNoteId)
      const target = noteById(connection.toNoteId)
      const sourceText = source?.text ?? 'Missing note'
      const targetText = target?.text ?? 'Missing note'
      return `<div class="relation-row">
        <div><strong>${escapeHtml(shortText(sourceText, 44))}</strong><span class="logic-direction"> → </span><strong>${escapeHtml(shortText(targetText, 44))}</strong><br><span>${escapeHtml(connection.label)}</span></div>
        <div class="relation-actions">
          <button class="relation-endpoint" type="button" data-select-note="${escapeHtml(connection.fromNoteId)}" aria-label="Go to cause: ${escapeHtml(sourceText)}">Cause</button>
          <button class="relation-endpoint" type="button" data-select-note="${escapeHtml(connection.toNoteId)}" aria-label="Go to effect: ${escapeHtml(targetText)}">Effect</button>
          <button class="relation-edit" type="button" data-edit-relation="${escapeHtml(connection.id)}" aria-label="Edit relation: ${escapeHtml(connection.label)}, from ${escapeHtml(shortText(sourceText, 45))} to ${escapeHtml(shortText(targetText, 45))}">Edit relation</button>
        </div>
      </div>`
    })
    .join('')
  logicPanel.innerHTML = `
    <p class="mono-label">Logic inspector</p>
    <button class="logic-close" type="button" data-deselect-note aria-label="Close inspector and deselect note">×</button>
    <h2>${escapeHtml(selected.text)}</h2>
    <p>Added by ${escapeHtml(contributorName(selected))}</p>
    <div class="flow-controls">
      <label>Flow
        <select data-flow-mode aria-label="Relationship flow to highlight">
          <option value="full"${ui.flowMode === 'full' ? ' selected' : ''}>Full flow</option>
          <option value="direct"${ui.flowMode === 'direct' ? ' selected' : ''}>Direct links</option>
        </select>
      </label>
      <p>Upstream causes and downstream effects.</p>
    </div>
    <p class="flow-summary">${visibleFlowNotes} notes · ${visibleFlowConnections} relation${visibleFlowConnections === 1 ? '' : 's'} highlighted${flowIsFiltered ? ' · search filters the rest' : ''}</p>
    <div class="logic-list">
      ${
        links.length
          ? relationRows
          : '<div class="logic-link">No causal links yet. Use “Connect notes” to add one.</div>'
      }
    </div>`
  logicPanel.querySelector<HTMLSelectElement>('[data-flow-mode]')?.addEventListener('change', (event) => {
    $ui.set({ ...$ui.get(), flowMode: (event.target as HTMLSelectElement).value as UiState['flowMode'] })
  })
  logicPanel.querySelectorAll<HTMLButtonElement>('[data-select-note]').forEach((button) => {
    button.addEventListener('click', () => {
      const targetNoteId = button.dataset.selectNote
      if (!targetNoteId) return
      searchInput.value = ''
      $ui.set({ ...$ui.get(), search: '', selectedNoteId: targetNoteId })
      requestAnimationFrame(() => {
        revealSelectedWithinBoard()
        Array.from(document.querySelectorAll<HTMLElement>('.note'))
          .find((note) => note.dataset.noteId === targetNoteId)?.focus({ preventScroll: true })
      })
    })
  })
  logicPanel.querySelectorAll<HTMLButtonElement>('[data-edit-relation]').forEach((button) => {
    button.addEventListener('click', () => openRelationDialog(button.dataset.editRelation))
  })
  logicPanel.querySelector<HTMLButtonElement>('[data-deselect-note]')?.addEventListener('click', () => {
    const ui = $ui.get()
    const selectedElement = Array.from(document.querySelectorAll<HTMLElement>('.note')).find(
      (note) => note.dataset.noteId === noteId,
    )
    $ui.set({
      ...ui,
      selectedNoteId: null,
      connectionSourceId: ui.connectionSourceId === noteId ? null : ui.connectionSourceId,
    })
    selectedElement?.focus({ preventScroll: true })
  })
}

function renderNoteState(): void {
  const ui = $ui.get()
  const flow = tracedFlow(ui.selectedNoteId)
  document.querySelectorAll<HTMLElement>('.note').forEach((noteElement) => {
    const noteId = noteElement.dataset.noteId
    if (!noteId) return
    const related = flow?.noteIds.has(noteId) ?? true
    noteElement.classList.toggle('selected', ui.selectedNoteId === noteId)
    noteElement.classList.toggle('connect-source', ui.connectionSourceId === noteId)
    noteElement.classList.toggle('unrelated', !related)
  })
}

function populateRelationNoteOptions(): void {
  const options = stageSortedNotes()
    .map((note) => {
      const stage = canvasStore.$canvas.get().stages.find((item) => item.id === note.stageId)
      const description = `${stage?.title ?? 'Stage'} · ${shortText(note.text, 70)}`
      return `<option value="${escapeHtml(note.id)}" title="${escapeHtml(note.text)}">${escapeHtml(description)}</option>`
    })
    .join('')
  relationSource.innerHTML = options
  relationTarget.innerHTML = options
}

function openRelationDialog(connectionId?: string): void {
  const connection = canvasStore.$canvas.get().connections.find((item) => item.id === connectionId)
  if (!connection) return
  editingConnectionId = connection.id
  relationFocusConnectionId = connection.id
  populateRelationNoteOptions()
  relationSource.value = connection.fromNoteId
  relationTarget.value = connection.toNoteId
  relationLabel.value = connection.label
  relationError.hidden = true
  relationError.textContent = ''
  deleteRelationButton.hidden = false
  relationDialog.showModal()
  window.setTimeout(() => relationLabel.focus(), 0)
}

function restoreRelationFocus(): void {
  const connectionId = relationFocusConnectionId
  relationFocusConnectionId = null
  requestAnimationFrame(() => {
    const editButton = connectionId
      ? document.querySelector<HTMLButtonElement>(`[data-edit-relation="${connectionId}"]`)
      : undefined
    const selectedNote = $ui.get().selectedNoteId
      ? document.querySelector<HTMLElement>(`[data-note-id="${$ui.get().selectedNoteId}"]`)
      : undefined
    ;(editButton ?? selectedNote)?.focus({ preventScroll: true })
  })
}

function bindBoardEvents(): void {
  document.querySelectorAll<HTMLElement>('.note').forEach((noteElement) => {
    const noteId = noteElement.dataset.noteId
    if (!noteId) return

    noteElement.addEventListener('click', (event) => {
      const textTarget = (event.target as Element).closest<HTMLElement>('.note-text')
      if (textTarget?.contentEditable === 'true' || (textTarget && event.detail > 1)) return
      handleNoteSelection(noteId)
    })
    noteElement.addEventListener('keydown', (event) => {
      if (event.target === noteElement && event.key === 'F2') {
        event.preventDefault()
        const text = noteElement.querySelector<HTMLElement>('.note-text')
        if (!$ui.get().connectionMode && text) {
          text.contentEditable = 'true'
          text.focus()
        }
        return
      }
      if (event.target === noteElement && isNoteActivationKey(event.key)) {
        event.preventDefault()
        handleNoteSelection(noteId)
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
    text?.addEventListener('dblclick', (event) => {
      event.preventDefault()
      if ($ui.get().connectionMode) return
      text.contentEditable = 'true'
      text.focus()
    })
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
      text.contentEditable = 'false'
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
    $ui.set(selectNote(ui, noteId))
    return
  }
  if (!ui.connectionSourceId) {
    $ui.set(selectNote(ui, noteId))
    return
  }
  if (ui.connectionSourceId === noteId) {
    $ui.set(selectNote(ui, noteId))
    return
  }
  try {
    canvasStore.connectNotes(ui.connectionSourceId, noteId, 'contributes to')
    $ui.set(selectNote(ui, noteId))
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
  const flow = tracedFlow(selectedId)
  const directFlow = selectedId
    ? ui.flowMode === 'direct'
      ? flow
      : canvas.traceFlow(selectedId, 'direct')
    : null
  const visibleNoteIds = new Set(
    Array.from(document.querySelectorAll<HTMLElement>('.note:not(.search-hidden)'))
      .map((element) => element.dataset.noteId)
      .filter((id): id is string => Boolean(id)),
  )

  const viewBox = `0 0 ${surfaceElement.scrollWidth} ${surfaceElement.scrollHeight}`
  svgElement.setAttribute('viewBox', viewBox)
  activeSvgElement.setAttribute('viewBox', viewBox)
  svgElement.innerHTML = `
    <defs>
      <marker id="arrow-base" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#7650a4"></path>
      </marker>
    </defs>`
  activeSvgElement.innerHTML = `
    <defs>
      <marker id="arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#5c259c"></path>
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
    const active = flow?.connectionIds.has(connection.id) ?? false
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', connectionPath(sourcePoint, targetPoint))
    path.setAttribute('class', `connection-path${active ? ' active' : ''}${selectedId && !active ? ' dimmed' : ''}`)
    path.setAttribute('marker-end', `url(#${active ? 'arrow-active' : 'arrow-base'})`)
    path.dataset.connectionId = connection.id
    ;(active ? activeSvgElement : svgElement).appendChild(path)

    if (directFlow?.connectionIds.has(connection.id)) {
      drawConnectionLabel(connection, sourcePoint, targetPoint, activeSvgElement)
    }
  }
}

function drawConnectionLabel(
  connection: CausalConnection,
  source: { x: number; y: number },
  target: { x: number; y: number },
  layer: SVGSVGElement,
): void {
  const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  label.setAttribute('x', String((source.x + target.x) / 2))
  label.setAttribute('y', String((source.y + target.y) / 2 - 8))
  label.setAttribute('text-anchor', 'middle')
  label.setAttribute('class', 'connection-label')
  label.textContent = connection.label
  layer.appendChild(label)
}

function revealSelectedWithinBoard(): void {
  const selectedId = $ui.get().selectedNoteId
  if (!selectedId) return
  const selected = Array.from(document.querySelectorAll<HTMLElement>('.note')).find(
    (note) => note.dataset.noteId === selectedId,
  )
  if (!selected || selected.classList.contains('search-hidden')) return

  const selectedRect = selected.getBoundingClientRect()
  const boardRect = boardScroll.getBoundingClientRect()
  const topInset = boardRect.top + 16
  const bottomInset = boardRect.bottom - 16
  const availableHeight = bottomInset - topInset
  const leftDelta =
    selectedRect.left < boardRect.left
      ? selectedRect.left - boardRect.left
      : selectedRect.right > boardRect.right
        ? selectedRect.right - boardRect.right
        : 0
  const topDelta =
    selectedRect.height >= availableHeight
      ? selectedRect.top < topInset || selectedRect.top >= bottomInset
        ? selectedRect.top - topInset
        : 0
      : selectedRect.top < topInset
        ? selectedRect.top - topInset
        : selectedRect.bottom > bottomInset
          ? selectedRect.bottom - bottomInset
          : 0
  if (leftDelta || topDelta) {
    boardScroll.scrollBy({ left: leftDelta, top: topDelta, behavior: 'instant' })
  }
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

relationForm.addEventListener('submit', (event) => {
  event.preventDefault()
  if (!editingConnectionId) return
  try {
    canvasStore.updateConnection(
      editingConnectionId,
      relationSource.value,
      relationTarget.value,
      relationLabel.value,
    )
    relationDialog.close()
    editingConnectionId = null
    restoreRelationFocus()
    showToast('Relation updated')
  } catch (error) {
    relationError.textContent = error instanceof Error ? error.message : 'Could not update relation'
    relationError.hidden = false
  }
})

deleteRelationButton.addEventListener('click', () => {
  if (!editingConnectionId) return
  const connection = canvasStore.$canvas.get().connections.find((item) => item.id === editingConnectionId)
  if (!connection) return
  if (!window.confirm(`Remove the relation “${connection.label}”?`)) return
  canvasStore.removeConnection(connection.id)
  relationDialog.close()
  editingConnectionId = null
  restoreRelationFocus()
  showToast('Relation removed')
})

document.querySelectorAll<HTMLButtonElement>('[data-close-relation]').forEach((button) => {
  button.addEventListener('click', () => {
    relationDialog.close()
    editingConnectionId = null
    restoreRelationFocus()
  })
})
relationDialog.addEventListener('close', () => {
  relationError.hidden = true
  editingConnectionId = null
  if (relationFocusConnectionId) restoreRelationFocus()
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
function setMoreMenuOpen(open: boolean): void {
  moreMenu.hidden = !open
  moreActionsButton.setAttribute('aria-expanded', String(open))
}

moreActionsButton.addEventListener('click', () => {
  setMoreMenuOpen(moreMenu.hidden)
})
moreMenu.addEventListener('click', (event) => {
  const action = (event.target as Element).closest<HTMLButtonElement>('button')
  if (!action) return
  setMoreMenuOpen(false)
  if (action.id !== 'export' && action.id !== 'print') moreActionsButton.focus()
})
document.addEventListener('click', (event) => {
  const target = event.target as Node
  if (!moreMenu.contains(target) && !moreActionsButton.contains(target)) setMoreMenuOpen(false)
})
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || moreMenu.hidden) return
  setMoreMenuOpen(false)
  moreActionsButton.focus()
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
boardScroll.addEventListener('scroll', () =>
  requestAnimationFrame(() => {
    syncStageHeaderScroll()
    drawConnections()
  }),
)
window.addEventListener('resize', () =>
  requestAnimationFrame(() => {
    syncStageHeaderScroll()
    drawConnections()
  }),
)
new ResizeObserver(() => {
  revealSelectedWithinBoard()
  requestAnimationFrame(() => {
    syncStageHeaderScroll()
    drawConnections()
  })
}).observe(boardScroll)

populateStageSelect()
setMoreMenuOpen(false)
canvasStore.$canvas.subscribe(() => renderBoard())

let previousUi: UiState | undefined
$ui.subscribe((ui) => {
  const requiresBoardRender =
    !previousUi ||
    ui.search !== previousUi.search ||
    ui.contributorName !== previousUi.contributorName
  previousUi = ui
  if (requiresBoardRender) {
    renderBoard()
    return
  }
  renderNoteState()
  renderConnectionControls()
  renderInspector()
  requestAnimationFrame(drawConnections)
})
