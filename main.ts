// Room-decomposed push-optimal Sokoban solver. A box never leaves its room: a
// push through a door lands it in the hallway, where it reaches no goal. So a
// level splits into independent rooms, each solved on its own, and the rooms'
// push counts add up to the level's optimum. Each room is searched
// breadth-first over pushes (first solved state met is push-optimal), pruning
// dead squares (no push from there ever reaches a goal) and frozen 2x2 blocks.
// The walk between two pushes is the shortest path; the whole run is
// work-bounded, never clock-bounded, so two runs write the same bytes.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const D: [number, number, string, string][] = [[0, -1, 'u', 'U'], [0, 1, 'd', 'D'], [-1, 0, 'l', 'L'], [1, 0, 'r', 'R']];
const MAX = 250000;
type Lvl = { w: number; h: number; wall: Uint8Array; goals: number[]; boxes: number[]; player: number };

function parse(t: string): Lvl {
  const rows = t.split('\n').filter((r) => r.length > 0);
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const wall = new Uint8Array(w * h).fill(1);
  const goals: number[] = [];
  const boxes: number[] = [];
  let player = -1;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const i = y * w + x;
      const c = row[x];
      if (c === '#') continue;
      wall[i] = 0;
      if (c === '.' || c === '*' || c === '+') goals.push(i);
      if (c === '$' || c === '*') boxes.push(i);
      if (c === '@' || c === '+') player = i;
    }
  });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1) wall[y * w + x] = 1;
  return { w, h, wall, goals, boxes: boxes.sort((a, b) => a - b), player };
}

/** Squares a box alone can be pushed onto some goal, pulled back from the goals. */
function liveSq(l: Lvl): Uint8Array {
  const live = new Uint8Array(l.w * l.h);
  const q = [...l.goals];
  for (const g of l.goals) live[g] = 1;
  while (q.length > 0) {
    const x = q.shift()!;
    for (const [dx, dy] of D) {
      const d = dy * l.w + dx;
      const y = x - d;
      if (!l.wall[y] && !l.wall[y - d] && !live[y]) { live[y] = 1; q.push(y); }
    }
  }
  return live;
}

/** Flood-fill from `from` around walls and boxes; returns its lowest square. */
function reach(l: Lvl, occ: Uint8Array, from: number, seen: Int32Array, stamp: number, stack: Int32Array): number {
  let low = from;
  let n = 0;
  stack[n++] = from;
  seen[from] = stamp;
  while (n > 0) {
    const p = stack[--n];
    if (p < low) low = p;
    for (const q of [p - l.w, p + l.w, p - 1, p + 1])
      if (!l.wall[q] && !occ[q] && seen[q] !== stamp) { seen[q] = stamp; stack[n++] = q; }
  }
  return low;
}

/** Whether the box just pushed to `t` sits in a frozen 2x2 block of walls and boxes with a box off its goal. */
function frozen(l: Lvl, occ: Uint8Array, goal: Uint8Array, t: number): boolean {
  for (const a of [t, t - 1, t - l.w, t - l.w - 1]) {
    const b = a + 1;
    const c = a + l.w;
    const d = c + 1;
    if (!(l.wall[a] || occ[a]) || !(l.wall[b] || occ[b]) || !(l.wall[c] || occ[c]) || !(l.wall[d] || occ[d])) continue;
    if ((occ[a] && !goal[a]) || (occ[b] && !goal[b]) || (occ[c] && !goal[c]) || (occ[d] && !goal[d])) return true;
  }
  return false;
}

/** Shortest walk from `from` to `to` around walls and boxes, lower LURD letters. */
function walk(l: Lvl, occ: Uint8Array, from: number, to: number): string {
  if (from === to) return '';
  const prev = new Int32Array(l.w * l.h).fill(-1);
  const how: string[] = [];
  const q = [from];
  prev[from] = from;
  for (let i = 0; i < q.length; i++) {
    const p = q[i]!;
    if (p === to) break;
    for (const [dx, dy, letter] of D) {
      const n = p + dy * l.w + dx;
      if (l.wall[n] || occ[n] || prev[n] !== -1) continue;
      prev[n] = p;
      how[n] = letter;
      q.push(n);
    }
  }
  if (prev[to] === -1) throw new Error('push square out of reach');
  let s = '';
  for (let p = to; p !== from; p = prev[p]!) s = how[p]! + s;
  return s;
}

function endOf(w: number, from: number, moves: string): number {
  let p = from;
  for (const c of moves.toLowerCase()) p += c === 'u' ? -w : c === 'd' ? w : c === 'l' ? -1 : 1;
  return p;
}

/** Push-optimal solution of a level: {pushes, moves}, or null past the state cap. */
function solvePush(l: Lvl, max = MAX): { pushes: number; moves: string } | null {
  const { w, wall, goals } = l;
  const size = w * l.h;
  const goal = new Uint8Array(size);
  for (const g of goals) goal[g] = 1;
  const live = liveSq(l);
  const occ = new Uint8Array(size);
  const seen = new Int32Array(size);
  const mark = new Int32Array(size);
  const stack = new Int32Array(size);
  let stamp = 0;
  const done = (bs: number[]): boolean => bs.every((b) => goal[b]);
  if (l.boxes.some((b) => !live[b])) return null;
  const bx: number[][] = [l.boxes];
  const pl: number[] = [l.player];
  const par: number[] = [-1];
  const pd: number[] = [-1];
  const idx = new Map<string, number>();
  for (const b of l.boxes) occ[b] = 1;
  idx.set(l.boxes.join(',') + '|' + reach(l, occ, l.player, seen, ++stamp, stack), 0);
  for (const b of l.boxes) occ[b] = 0;
  let found = done(l.boxes) ? 0 : -1;
  for (let head = 0; found < 0 && head < bx.length; head++) {
    const boxes = bx[head]!;
    for (const b of boxes) occ[b] = 1;
    reach(l, occ, pl[head]!, seen, ++stamp, stack);
    const here = stamp;
    for (let bi = 0; bi < boxes.length && found < 0; bi++) {
      const b = boxes[bi]!;
      for (let k = 0; k < 4; k++) {
        const d = D[k]![1] * w + D[k]![0];
        const t = b + d;
        if (seen[b - d] !== here || wall[t] || occ[t] || !live[t]) continue;
        occ[b] = 0;
        occ[t] = 1;
        const fr = frozen(l, occ, goal, t);
        let key = '';
        let next: number[] | null = null;
        if (!fr) {
          next = boxes.slice();
          next[bi] = t;
          next.sort((x, y) => x - y);
          key = next.join(',') + '|' + reach(l, occ, b, mark, ++stamp, stack);
        }
        occ[t] = 0;
        occ[b] = 1;
        if (fr || idx.has(key)) continue;
        if (bx.length >= max) {
          for (const x of boxes) occ[x] = 0;
          return null;
        }
        idx.set(key, bx.length);
        bx.push(next!);
        pl.push(b);
        par.push(head);
        pd.push(k);
        if (done(next!)) { found = bx.length - 1; break; }
      }
    }
    for (const x of boxes) occ[x] = 0;
  }
  if (found < 0) return null;
  const path: number[] = [];
  for (let s = found; s > 0; s = par[s]!) path.push(s);
  path.reverse();
  let moves = '';
  let player = l.player;
  let boxes = l.boxes;
  for (const s of path) {
    const nb = bx[s]!;
    const from = boxes.find((b) => !nb.includes(b))!;
    const to = nb.find((b) => !boxes.includes(b))!;
    const k = pd[s]!;
    const d = D[k]![1] * w + D[k]![0];
    for (const b of boxes) occ[b] = 1;
    moves += walk(l, occ, player, from - d);
    for (const b of boxes) occ[b] = 0;
    moves += D[k]![3];
    player = from;
    boxes = nb;
  }
  return { pushes: path.length, moves };
}

type Room = { boxes: number[]; goals: number[] };

/** The level's rooms: cut the dead squares of the player's row (the hallway: a
 * box there reaches no goal) out of the floor; each part left holding a box is
 * a room. Null when a box starts in the hallway or a part's boxes and goals
 * do not match: then the level is no set of rooms. */
function roomsOf(l: Lvl): Room[] | null {
  const live = liveSq(l);
  const row = Math.floor(l.player / l.w);
  const cut = new Uint8Array(l.w * l.h);
  for (let i = row * l.w; i < (row + 1) * l.w; i++) if (!l.wall[i] && !live[i]) cut[i] = 1;
  if (l.boxes.some((b) => cut[b])) return null;
  const part = new Int32Array(l.w * l.h).fill(-1);
  const rooms: Room[] = [];
  for (let s = 0; s < l.w * l.h; s++) {
    if (l.wall[s] || cut[s] || part[s] >= 0) continue;
    const sq = [s];
    part[s] = rooms.length;
    for (let i = 0; i < sq.length; i++)
      for (const [dx, dy] of D) {
        const q = sq[i]! + dy * l.w + dx;
        if (!l.wall[q] && !cut[q] && part[q] < 0) { part[q] = rooms.length; sq.push(q); }
      }
    rooms.push({ boxes: [], goals: [] });
  }
  for (const b of l.boxes) rooms[part[b]!]!.boxes.push(b);
  for (const g of l.goals) if (part[g]! >= 0) rooms[part[g]!]!.goals.push(g);
  if (l.goals.some((g) => part[g]! < 0) || rooms.some((r) => r.boxes.length !== r.goals.length)) return null;
  return rooms.filter((r) => r.boxes.length > 0);
}

/** Solve a level room by room: each room on its own, the other rooms' boxes
 * standing as walls (on their goals once their room is done), the player
 * walking on from where the last room left it. */
function solve(l: Lvl): { pushes: number; moves: string } | null {
  const rooms = roomsOf(l);
  if (rooms === null) return solvePush(l);
  const finished = new Set<Room>();
  let player = l.player;
  let pushes = 0;
  let moves = '';
  for (const room of rooms) {
    const wall = l.wall.slice();
    for (const o of rooms)
      if (o !== room) for (const b of finished.has(o) ? o.goals : o.boxes) wall[b] = 1;
    const sub: Lvl = { w: l.w, h: l.h, wall, goals: room.goals.slice().sort((a, b) => a - b), boxes: room.boxes.slice().sort((a, b) => a - b), player };
    const r = solvePush(sub);
    if (r === null) return null;
    pushes += r.pushes;
    moves += r.moves;
    player = endOf(l.w, player, r.moves);
    finished.add(room);
  }
  return { pushes, moves };
}

for (const id of readdirSync(I).sort()) {
  const r = solve(parse(readFileSync(join(I, id, 'level.txt'), 'utf8')));
  const moves = r === null ? '' : r.moves;
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'solution.txt'), `${moves}\n`);
}
