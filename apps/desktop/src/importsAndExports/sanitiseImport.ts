/*apps/desktop/src/importsAndExports/sanitiseImport.ts*/

import type { Folder } from "../types/Folder";
import type { Repertoire } from "../types/Repertoire";
import type { Node } from "../types/Node";

// turns untrusted repertoire data (an imported file, or anything the renderer sends over IPC)
// into data that is safe to save and render:
//  - ids are restricted to [A-Za-z0-9_-] because they become file names (no "../" path tricks)
//  - every field is type-checked, strings are length-capped, unknown fields are dropped
//  - references (rootNodeId, folderId, childIDs, parentId) must point at something that exists
//  - cycles in the move graph are cut, so walking a graph can never loop forever
//  - overall size is capped so a huge file can't exhaust memory
// pure TypeScript with no Node/DOM APIs, so the renderer and the main process both run it

export const IMPORT_LIMITS = {
  maxFileBytes: 20 * 1024 * 1024,
  maxFolders: 1_000,
  maxRepertoires: 5_000,
  maxNodes: 250_000,
  maxChildren: 256,
  maxNameLength: 100,
  maxMoveLength: 12,
  maxFenLength: 100,
  maxCommentLength: 5_000,
  maxTags: 50,
  maxTagLength: 50,
  maxAnnotations: 64,
};

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;
// SAN moves: pieces, squares, captures, castling, promotion, check/mate marks
const SAN_MOVE = /^[A-Za-z0-9+#=x-]+$/;
const SQUARE = /^[a-h][1-8]$/;

export function isSafeId(value: unknown): value is string {
  return typeof value === "string" && SAFE_ID.test(value);
}

export class ImportError extends Error {}

export interface SanitisedImport {
  folders: Folder[];
  repertoires: Repertoire[];
  nodes: Record<string, Node>;
  // human-readable notes about anything that was dropped or repaired
  warnings: string[];
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function cleanString(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

function cleanTime(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : fallback;
}

/** accepts either an array or an id-keyed object, returns the values */
function valuesOf(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  if (isObject(v)) return Object.values(v);
  return [];
}

// ── folders ───────────────────────────────────────────────────────────────────

export function sanitiseFolders(raw: unknown, warnings: string[] = []): Folder[] {
  const now = Date.now();
  const list = valuesOf(raw);
  if (list.length > IMPORT_LIMITS.maxFolders) {
    throw new ImportError(`Too many folders (${list.length}, limit ${IMPORT_LIMITS.maxFolders}).`);
  }

  const seen = new Set<string>();
  const folders: Folder[] = [];
  let dropped = 0;

  for (const f of list) {
    if (!isObject(f) || !isSafeId(f.id) || seen.has(f.id)) {
      dropped++;
      continue;
    }
    seen.add(f.id);
    folders.push({
      id: f.id,
      name: cleanString(f.name, IMPORT_LIMITS.maxNameLength) ?? "Imported Folder",
      collapsed: f.collapsed === true,
      sortOrder: typeof f.sortOrder === "number" && Number.isFinite(f.sortOrder) ? f.sortOrder : 0,
      createdAt: cleanTime(f.createdAt, now),
      updatedAt: cleanTime(f.updatedAt, now),
    });
  }

  if (dropped) warnings.push(`Skipped ${dropped} invalid folder${dropped === 1 ? "" : "s"}.`);
  return folders;
}

// ── repertoires ───────────────────────────────────────────────────────────────

export function sanitiseRepertoire(r: unknown, now = Date.now()): Repertoire | null {
  if (!isObject(r) || !isSafeId(r.id) || !isSafeId(r.rootNodeId)) return null;
  if (r.side !== "white" && r.side !== "black") return null;

  return {
    id: r.id,
    name: cleanString(r.name, IMPORT_LIMITS.maxNameLength) ?? "Untitled Repertoire",
    side: r.side,
    rootNodeId: r.rootNodeId,
    folderId: isSafeId(r.folderId) ? r.folderId : null,
    createdAt: cleanTime(r.createdAt, now),
    updatedAt: cleanTime(r.updatedAt, now),
  };
}

// ── nodes ─────────────────────────────────────────────────────────────────────

function sanitiseNode(n: Record<string, unknown>): Node | null {
  if (!isSafeId(n.id)) return null;

  // chessgraph exports have used childIds / children for the same list
  const rawChildren = Array.isArray(n.childIDs) ? n.childIDs : Array.isArray(n.childIds) ? n.childIds : Array.isArray(n.children) ? n.children : [];
  const childIDs = [...new Set(rawChildren.filter(isSafeId))].slice(0, IMPORT_LIMITS.maxChildren);

  const move = cleanString(n.move, IMPORT_LIMITS.maxMoveLength);

  const node: Node = {
    id: n.id,
    parentId: isSafeId(n.parentId) ? n.parentId : null,
    move: move && SAN_MOVE.test(move) ? move : null,
    childIDs,
  };

  if (isSafeId(n.repertoireId)) node.repertoireId = n.repertoireId;

  const fen = cleanString(n.fen, IMPORT_LIMITS.maxFenLength);
  if (fen) node.fen = fen;

  const comment = typeof n.comment === "string" ? n.comment.slice(0, IMPORT_LIMITS.maxCommentLength) : undefined;
  if (comment) node.comment = comment;

  const color = cleanString(n.color, 32);
  if (color) node.color = color;

  if (Array.isArray(n.tags)) {
    const tags = n.tags
      .map(t => cleanString(t, IMPORT_LIMITS.maxTagLength))
      .filter((t): t is string => !!t)
      .slice(0, IMPORT_LIMITS.maxTags);
    if (tags.length) node.tags = tags;
  }

  if (Array.isArray(n.transpositionEdges)) {
    const edges = n.transpositionEdges
      .filter(isObject)
      .map(e => ({ targetId: e.targetId, move: cleanString(e.move, IMPORT_LIMITS.maxMoveLength) }))
      .filter((e): e is { targetId: string; move: string } => isSafeId(e.targetId) && !!e.move && SAN_MOVE.test(e.move))
      .slice(0, IMPORT_LIMITS.maxChildren);
    if (edges.length) node.transpositionEdges = edges;
  }

  // board annotations: squares must be real squares, colours are short strings
  if (Array.isArray(n.arrows)) {
    const arrows = n.arrows
      .filter(isObject)
      .filter(a => typeof a.startSquare === "string" && SQUARE.test(a.startSquare) && typeof a.endSquare === "string" && SQUARE.test(a.endSquare))
      .map(a => ({ startSquare: a.startSquare as string, endSquare: a.endSquare as string, color: cleanString(a.color, 32) ?? "" }))
      .slice(0, IMPORT_LIMITS.maxAnnotations);
    if (arrows.length) node.arrows = arrows;
  }

  if (Array.isArray(n.highlightedSquares)) {
    const squares = n.highlightedSquares
      .filter(isObject)
      .filter(h => typeof h.square === "string" && SQUARE.test(h.square))
      .map(h => ({ square: h.square as string, color: cleanString(h.color, 32) ?? "" }))
      .slice(0, IMPORT_LIMITS.maxAnnotations);
    if (squares.length) node.highlightedSquares = squares;
  }

  return node;
}

/** removes edges that point at missing nodes or would form a cycle (iterative, so deep lines can't overflow the stack) */
// a Map, not a plain object: ids like "constructor" or "__proto__" would otherwise hit Object.prototype
function repairGraph(nodes: Map<string, Node>, warnings: string[]) {
  let danglingEdges = 0;
  let cycleEdges = 0;

  for (const node of nodes.values()) {
    const before = node.childIDs.length;
    node.childIDs = node.childIDs.filter(id => nodes.has(id) && id !== node.id);
    danglingEdges += before - node.childIDs.length;

    if (node.parentId !== null && !nodes.has(node.parentId)) node.parentId = null;
    if (node.transpositionEdges) {
      node.transpositionEdges = node.transpositionEdges.filter(e => nodes.has(e.targetId));
      if (!node.transpositionEdges.length) delete node.transpositionEdges;
    }
  }

  // depth-first search; an edge to a node still on the current path is a back edge (a cycle)
  const state = new Map<string, 1 | 2>(); // 1 = on current path, 2 = finished
  for (const start of nodes.keys()) {
    if (state.has(start)) continue;

    const stack: [id: string, nextChild: number][] = [[start, 0]];
    state.set(start, 1);

    while (stack.length) {
      const top = stack[stack.length - 1];
      const node = nodes.get(top[0]) as Node;

      if (top[1] >= node.childIDs.length) {
        state.set(top[0], 2);
        stack.pop();
        continue;
      }

      const childId = node.childIDs[top[1]];
      const childState = state.get(childId);

      if (childState === 1) {
        node.childIDs.splice(top[1], 1);
        cycleEdges++;
        continue;
      }

      top[1]++;
      if (childState === undefined) {
        state.set(childId, 1);
        stack.push([childId, 0]);
      }
    }
  }

  if (danglingEdges) warnings.push(`Removed ${danglingEdges} move link${danglingEdges === 1 ? "" : "s"} to missing positions.`);
  if (cycleEdges) warnings.push(`Removed ${cycleEdges} looping move link${cycleEdges === 1 ? "" : "s"}.`);
}

// ── whole import ──────────────────────────────────────────────────────────────

/**
 * validates and cleans a full import (folders + repertoires + nodes)
 * throws ImportError with a readable message if nothing usable is left
 */
export function sanitiseImport(raw: unknown): SanitisedImport {
  if (!isObject(raw)) throw new ImportError("File is not a valid repertoire export.");

  const warnings: string[] = [];
  const now = Date.now();

  // nodes
  const rawNodes = valuesOf(raw.nodes);
  if (rawNodes.length > IMPORT_LIMITS.maxNodes) {
    throw new ImportError(`Too many positions (${rawNodes.length}, limit ${IMPORT_LIMITS.maxNodes}).`);
  }

  const nodes = new Map<string, Node>();
  let badNodes = 0;
  for (const n of rawNodes) {
    const node = isObject(n) ? sanitiseNode(n) : null;
    if (!node || nodes.has(node.id)) {
      badNodes++;
      continue;
    }
    nodes.set(node.id, node);
  }
  if (badNodes) warnings.push(`Skipped ${badNodes} invalid position${badNodes === 1 ? "" : "s"}.`);

  repairGraph(nodes, warnings);

  // folders
  const folders = sanitiseFolders(raw.folders, warnings);
  const folderIds = new Set(folders.map(f => f.id));

  // repertoires
  const rawReps = valuesOf(raw.repertoires);
  if (rawReps.length > IMPORT_LIMITS.maxRepertoires) {
    throw new ImportError(`Too many repertoires (${rawReps.length}, limit ${IMPORT_LIMITS.maxRepertoires}).`);
  }

  const repertoires: Repertoire[] = [];
  const repIds = new Set<string>();
  let badReps = 0;
  for (const r of rawReps) {
    const rep = sanitiseRepertoire(r, now);
    // a repertoire whose root position is missing can't be opened, so it's skipped
    if (!rep || repIds.has(rep.id) || !nodes.has(rep.rootNodeId)) {
      badReps++;
      continue;
    }
    if (rep.folderId !== null && !folderIds.has(rep.folderId)) rep.folderId = null;
    repIds.add(rep.id);
    repertoires.push(rep);
  }
  if (badReps) warnings.push(`Skipped ${badReps} invalid repertoire${badReps === 1 ? "" : "s"}.`);

  if (repertoires.length === 0) {
    throw new ImportError("No valid repertoires were found in this file.");
  }

  return { folders, repertoires, nodes: Object.fromEntries(nodes), warnings };
}
