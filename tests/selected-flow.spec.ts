import { describe, expect, it } from 'vitest'
import {
  CausalConnection,
  Contributor,
  Stage,
  TheoryNote,
  TheoryOfChangeCanvas,
} from '../src/domain/models'
import { traceSelectedFlow } from '../src/ui/selected-flow'

const stages = [
  new Stage('s0', 'Inputs', '', 0, 'green'),
  new Stage('s1', 'Activities', '', 1, 'yellow'),
  new Stage('s2', 'Outcomes', '', 2, 'purple'),
  new Stage('s3', 'Impact', '', 3, 'vision'),
]
const people = [new Contributor('person', 'Person')]

function canvas(noteIds: Array<[string, string]>, edges: Array<[string, string, string]>) {
  let result = new TheoryOfChangeCanvas('canvas', 'Canvas', stages, people, [], [])
  for (const [id, stageId] of noteIds) {
    result = result.addNote(new TheoryNote(id, stageId, id, 'person', 'yellow'))
  }
  for (const [id, from, to] of edges) {
    result = result.connect(new CausalConnection(id, from, to, 'leads to'))
  }
  return result
}

describe('traceSelectedFlow', () => {
  it('finds every node and edge on the directed path between selected endpoints', () => {
    const graph = canvas(
      [['a', 's0'], ['b', 's1'], ['c', 's2']],
      [['a-b', 'a', 'b'], ['b-c', 'b', 'c']],
    )

    expect(traceSelectedFlow(graph, ['a', 'c'])).toEqual({
      noteIds: new Set(['a', 'b', 'c']),
      connectionIds: new Set(['a-b', 'b-c']),
      connected: true,
    })
  })

  it('keeps all paths through a fork that reconnects', () => {
    const graph = canvas(
      [['a', 's0'], ['left', 's1'], ['right', 's1'], ['c', 's2']],
      [['a-left', 'a', 'left'], ['a-right', 'a', 'right'], ['left-c', 'left', 'c'], ['right-c', 'right', 'c']],
    )

    expect(traceSelectedFlow(graph, ['a', 'c'])).toEqual({
      noteIds: new Set(['a', 'left', 'right', 'c']),
      connectionIds: new Set(['a-left', 'a-right', 'left-c', 'right-c']),
      connected: true,
    })
  })

  it('excludes sibling, dead-end, and co-parent branches outside the selected path', () => {
    const graph = canvas(
      [
        ['a', 's0'], ['path', 's1'], ['sibling', 's1'], ['co-parent', 's1'],
        ['dead-end', 's2'], ['c', 's2'],
      ],
      [
        ['a-path', 'a', 'path'], ['path-c', 'path', 'c'], ['a-sibling', 'a', 'sibling'],
        ['sibling-dead', 'sibling', 'dead-end'], ['co-parent-c', 'co-parent', 'c'],
      ],
    )

    const trace = traceSelectedFlow(graph, ['a', 'c'])
    expect(trace.noteIds).toEqual(new Set(['a', 'path', 'c']))
    expect(trace.connectionIds).toEqual(new Set(['a-path', 'path-c']))
    expect(trace.connected).toBe(true)
  })

  it('orders a reversed selection into its causal direction', () => {
    const graph = canvas(
      [['a', 's0'], ['b', 's1'], ['c', 's2']],
      [['a-b', 'a', 'b'], ['b-c', 'b', 'c']],
    )

    expect(traceSelectedFlow(graph, ['c', 'a']).connectionIds).toEqual(new Set(['a-b', 'b-c']))
  })

  it('does not invent a chain for disconnected or same-stage selections', () => {
    const graph = canvas(
      [['a', 's0'], ['b', 's1'], ['c', 's1'], ['d', 's2']],
      [['a-b', 'a', 'b'], ['c-d', 'c', 'd']],
    )

    expect(traceSelectedFlow(graph, ['a', 'd'])).toEqual({
      noteIds: new Set(['a', 'd']), connectionIds: new Set(), connected: false,
    })
    expect(traceSelectedFlow(graph, ['b', 'c'])).toEqual({
      noteIds: new Set(['b', 'c']), connectionIds: new Set(), connected: false,
    })
  })

  it('deduplicates valid selections, ignores missing notes, handles no selection, and does not mutate', () => {
    const graph = canvas(
      [['a', 's0'], ['b', 's1']],
      [['a-b', 'a', 'b']],
    )
    const before = graph.toJSON()

    expect(traceSelectedFlow(graph, ['a', 'a', 'missing', 'b']).connectionIds).toEqual(new Set(['a-b']))
    expect(traceSelectedFlow(graph, [])).toEqual({
      noteIds: new Set(), connectionIds: new Set(), connected: false,
    })
    expect(graph.toJSON()).toEqual(before)
  })
})
