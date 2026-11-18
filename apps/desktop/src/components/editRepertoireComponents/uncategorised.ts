/*apps/desktop/src/components/editRepertoireComponents/uncategorised.ts*/

import type { Folder } from '../../types/Folder';

// Repertoires with folderId null are shown in a permanent "Uncategorised" folder. It only exists
// on screen: it is added after loading and stripped before saving, so it can't be renamed, deleted
// or duplicated on disk.

export const UNCATEGORISED_ID = '__uncategorised__';

const UNCATEGORISED: Folder = {
  id: UNCATEGORISED_ID,
  name: 'Uncategorised',
  collapsed: false,
  sortOrder: 9999,
  createdAt: 0,
  updatedAt: 0,
};

export function storedFolders(folders: Folder[]): Folder[] {
  return folders.filter(f => f.id !== UNCATEGORISED_ID);
}

export function withUncategorised(folders: Folder[]): Folder[] {
  return [...storedFolders(folders), UNCATEGORISED];
}
