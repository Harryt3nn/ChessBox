import { describe, expect, it } from 'vitest';
import type { Folder } from '../../types/Folder';
import { UNCATEGORISED_ID, storedFolders, withUncategorised } from './uncategorised';

const folder = (id: string): Folder => ({ id, name: id, collapsed: false, sortOrder: 0, createdAt: 0, updatedAt: 0 });

describe('withUncategorised', () => {
  it('adds the permanent Uncategorised folder after the saved ones', () => {
    expect(withUncategorised([folder('a')]).map(f => f.id)).toEqual(['a', UNCATEGORISED_ID]);
  });

  it('adds it even when nothing is saved yet', () => {
    expect(withUncategorised([]).map(f => f.id)).toEqual([UNCATEGORISED_ID]);
  });

  it('replaces a copy that was saved to disk by mistake, so it never shows twice', () => {
    const stale = { ...folder(UNCATEGORISED_ID), name: 'Renamed' };
    const result = withUncategorised([stale, folder('a')]);
    expect(result.map(f => f.id)).toEqual(['a', UNCATEGORISED_ID]);
    expect(result[1].name).toBe('Uncategorised');
  });
});

describe('storedFolders', () => {
  it('leaves the virtual folder out of what gets saved', () => {
    expect(storedFolders(withUncategorised([folder('a')])).map(f => f.id)).toEqual(['a']);
  });
});
