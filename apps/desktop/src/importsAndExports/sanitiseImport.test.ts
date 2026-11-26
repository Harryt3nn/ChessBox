import { describe, expect, it } from 'vitest';
import { IMPORT_LIMITS, ImportError, sanitiseFolders, sanitiseImport, sanitiseRepertoire } from './sanitiseImport';

const rep = (overrides: Record<string, unknown> = {}) => ({
  id: 'rep1', name: 'Italian', side: 'white', rootNodeId: 'root', folderId: null, ...overrides,
});

const node = (id: string, childIDs: string[] = [], extra: Record<string, unknown> = {}) => ({
  id, parentId: null, move: 'e4', childIDs, ...extra,
});

describe('sanitiseImport', () => {
  it('keeps a valid export and reports no warnings', () => {
    const result = sanitiseImport({
      folders: [{ id: 'f1', name: 'White' }],
      repertoires: [rep({ folderId: 'f1' })],
      nodes: { root: node('root', ['a']), a: node('a') },
    });

    expect(result.warnings).toEqual([]);
    expect(result.repertoires).toHaveLength(1);
    expect(result.repertoires[0].folderId).toBe('f1');
    expect(Object.keys(result.nodes).sort()).toEqual(['a', 'root']);
  });

  it('accepts nodes as an array (chessgraph v3) as well as an id-keyed object', () => {
    const result = sanitiseImport({ repertoires: [rep()], nodes: [node('root')] });
    expect(result.nodes.root).toBeDefined();
  });

  it.each(['childIds', 'children'])('normalises chessgraph "%s" to childIDs', key => {
    const result = sanitiseImport({
      repertoires: [rep()],
      nodes: [{ id: 'root', move: null, [key]: ['a'] }, node('a')],
    });
    expect(result.nodes.root.childIDs).toEqual(['a']);
  });

  // chessgraph files carry both childIds and children, often with one of them empty; childrenOf
  // reads the first non-empty list, so the sanitiser must too or a re-save drops the children
  it('takes children when childIds is empty', () => {
    const result = sanitiseImport({
      repertoires: [rep()],
      nodes: [{ id: 'root', move: null, childIds: [], children: ['a'] }, node('a')],
    });
    expect(result.nodes.root.childIDs).toEqual(['a']);
  });

  it('gives no children when every list is empty', () => {
    const result = sanitiseImport({
      repertoires: [rep()],
      nodes: [{ id: 'root', move: null, childIDs: [], childIds: [], children: [] }],
    });
    expect(result.nodes.root.childIDs).toEqual([]);
  });

  it.each(['../evil', '..\\evil', 'a/b', '', 'x'.repeat(65)])('rejects the unsafe id %j', id => {
    const result = sanitiseImport({ repertoires: [rep(), rep({ id })], nodes: [node('root')] });
    expect(result.repertoires.map(r => r.id)).toEqual(['rep1']);
    expect(result.warnings).toContain('Skipped 1 invalid repertoire.');
  });

  it('skips a repertoire whose root position is missing', () => {
    expect(() => sanitiseImport({ repertoires: [rep({ rootNodeId: 'gone' })], nodes: [node('root')] }))
      .toThrow(new ImportError('No valid repertoires were found in this file.'));
  });

  it('removes links to missing positions', () => {
    const result = sanitiseImport({ repertoires: [rep()], nodes: [node('root', ['gone'])] });
    expect(result.nodes.root.childIDs).toEqual([]);
    expect(result.warnings).toContain('Removed 1 move link to missing positions.');
  });

  it('cuts cycles so the graph can be walked safely', () => {
    const result = sanitiseImport({
      repertoires: [rep()],
      nodes: [node('root', ['a']), node('a', ['b']), node('b', ['root'])],
    });
    expect(result.nodes.b.childIDs).toEqual([]);
    expect(result.warnings).toContain('Removed 1 looping move link.');
  });

  it('handles a very deep line without overflowing the stack', () => {
    const depth = 50_000;
    const nodes = Array.from({ length: depth }, (_, i) => node(`n${i}`, i < depth - 1 ? [`n${i + 1}`] : []));
    const result = sanitiseImport({ repertoires: [rep({ rootNodeId: 'n0' })], nodes });
    expect(Object.keys(result.nodes)).toHaveLength(depth);
  });

  it('drops a non-SAN move and unknown fields', () => {
    const result = sanitiseImport({
      repertoires: [rep()],
      nodes: [node('root', [], { move: '<script>', evil: true })],
    });
    expect(result.nodes.root.move).toBeNull();
    expect(result.nodes.root).not.toHaveProperty('evil');
  });

  it('refuses more positions than the limit', () => {
    const tooMany = Array.from({ length: IMPORT_LIMITS.maxNodes + 1 }, (_, i) => ({ id: `n${i}` }));
    expect(() => sanitiseImport({ repertoires: [rep()], nodes: tooMany })).toThrow(ImportError);
  });

  // ids that are also Object.prototype keys must be treated as plain ids, not inherited properties
  describe('ids that clash with Object.prototype', () => {
    it('removes a link to a missing "constructor" position instead of crashing', () => {
      const result = sanitiseImport({ repertoires: [rep()], nodes: [node('root', ['constructor'])] });
      expect(result.nodes.root.childIDs).toEqual([]);
    });

    it('removes a transposition edge to a missing "toString" position', () => {
      const edge = { targetId: 'toString', move: 'Nf3' };
      const result = sanitiseImport({ repertoires: [rep()], nodes: [node('root', [], { transpositionEdges: [edge] })] });
      expect(result.nodes.root.transpositionEdges).toBeUndefined();
    });

    it('skips a repertoire whose root "toString" does not exist', () => {
      const result = sanitiseImport({ repertoires: [rep(), rep({ id: 'rep2', rootNodeId: 'toString' })], nodes: [node('root')] });
      expect(result.repertoires.map(r => r.id)).toEqual(['rep1']);
    });

    it('keeps a real position whose id is "toString"', () => {
      const result = sanitiseImport({ repertoires: [rep({ rootNodeId: 'toString' })], nodes: [node('toString')] });
      expect(Object.keys(result.nodes)).toEqual(['toString']);
    });

    it('stores a "__proto__" position as data without touching the prototype', () => {
      const result = sanitiseImport({ repertoires: [rep({ rootNodeId: '__proto__' })], nodes: [node('__proto__')] });
      expect(Object.keys(result.nodes)).toEqual(['__proto__']);
      expect(Object.getPrototypeOf(result.nodes)).toBe(Object.prototype);
    });
  });

  it('rejects something that is not an object', () => {
    expect(() => sanitiseImport([])).toThrow(new ImportError('File is not a valid repertoire export.'));
  });
});

describe('sanitiseFolders', () => {
  it('drops duplicate and unsafe folder ids', () => {
    const warnings: string[] = [];
    const folders = sanitiseFolders([{ id: 'f1' }, { id: 'f1' }, { id: '../x' }], warnings);
    expect(folders.map(f => f.id)).toEqual(['f1']);
    expect(warnings).toEqual(['Skipped 2 invalid folders.']);
  });
});

describe('sanitiseRepertoire', () => {
  it('rejects a side that is not white or black', () => {
    expect(sanitiseRepertoire(rep({ side: 'red' }))).toBeNull();
  });
});
