import { nameOf } from './tiles.mjs';

export const roll = (sides, random = Math.random) => 1 + Math.floor(random() * sides);
export const neighbors = i => [
  i >= 5 ? i - 5 : -1, i % 5 < 4 ? i + 1 : -1,
  i < 20 ? i + 5 : -1, i % 5 > 0 ? i - 1 : -1
].filter(n => n >= 0);
const blocked = tile => tile.visible && [3, 4].includes(tile.id);

export function routes(board, from, steps, seen = [from]) {
  if (!steps) return [[]];
  return neighbors(from).filter(n => !seen.includes(n) && !blocked(board[n]))
    .flatMap(n => routes(board, n, steps - 1, [...seen, n]).map(tail => [n, ...tail]));
}

export function openingOrder(results, random = Math.random) {
  function breakTie(group) {
    if (group.length < 2) return group;
    const scores = group.map(player => ({ ...player, tie: roll(6, random) }));
    return [...new Set(scores.map(p => p.tie))].sort((a,b) => b-a)
      .flatMap(tie => breakTie(scores.filter(p => p.tie === tie)));
  }
  const scores = [...new Set(results)].sort((a,b) => a-b);
  const groups = scores.map(score => breakTie(results.flatMap((value, id) =>
    value === score ? [{ id, score }] : [])));
  const [first, ...otherHigh] = groups.pop();
  return [first, ...groups.flat(), ...otherHigh].map(p => p.id);
}

export class Game {
  constructor(players, random = Math.random) {
    this.random = random;
    const hall = [0, 4, 20, 24][roll(4, random) - 1];
    const bag = Array.from({ length: 24 }, (_, i) => i + 1);
    for (let i = bag.length - 1; i > 0; i--) {
      const j = roll(i + 1, random) - 1;
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    this.board = Array.from({ length: 25 }, (_, i) => ({
      id: i === hall ? 0 : bag.pop(), visible: i === hall
    }));
    this.players = players.map(p => ({ ...p, position: hall, skip: false, memory: {} }));
    this.opening = players.map(() => roll(6, random));
    this.order = openingOrder(this.opening, random);
    this.cursor = 0;
    this.phase = 'roll';
    this.owner = null;
    this.winner = null;
    this.remaining = 0;
    this.lastRoll = null;
    this.log = ['Todos os peões estão no Hall.'];
  }

  get actor() { return this.order[this.cursor]; }
  get player() { return this.players[this.actor]; }

  record(message) { this.log.unshift(message); }

  begin() {
    if (this.phase !== 'roll') return;
    this.lastRoll = roll(3, this.random);
    this.remaining = this.lastRoll;
    this.path = [this.player.position];
    this.phase = 'move';
    this.record(`${this.player.name} tirou ${this.lastRoll} no dado.`);
    if (!this.choices().length) {
      this.record('Nenhum trajeto comporta a rolagem.');
      this.endTurn();
    }
  }

  choices() {
    if (this.phase === 'move') {
      return [...new Set(routes(this.board, this.player.position, this.remaining, this.path).map(p => p[0]))];
    }
    if (this.phase === 'extra') return this.extra;
    if (this.phase === 'peek') return this.board.flatMap((t, i) => t.visible ? [] : [i]);
    return [];
  }

  reveal(position) {
    const tile = this.board[position];
    tile.visible = tile.id <= 6 || !tile.visible;
    if (tile.visible) {
      this.players.forEach(p => { p.memory[position] = tile.id; });
      this.record(`Casa revelada: ${nameOf(tile.id)}.`);
    }
    return !blocked(tile);
  }

  advance(position) {
    if (!this.choices().includes(position)) return;
    if (this.phase === 'peek') {
      this.player.memory[position] = this.board[position].id;
      this.peeked = position;
      this.phase = 'view';
      return;
    }
    if (this.phase === 'extra') {
      if (this.reveal(position)) this.player.position = position;
      this.endTurn();
      return;
    }
    if (!this.reveal(position)) {
      this.record(`${nameOf(this.board[position].id)} interditou o caminho.`);
      this.endTurn();
      return;
    }
    this.player.position = position;
    this.path.push(position);
    this.remaining--;
    if (this.remaining === 0) this.arrive(position);
  }

  arrive(position) {
    const id = this.board[position].id;
    const owner = this.owner;
    if (owner === null && id === 1) {
      this.owner = this.actor;
      this.record(`${this.player.name} pegou a única chave. A perseguição começou!`);
    } else if (owner !== null && owner !== this.actor && this.players[owner].position === position) {
      this.owner = this.actor;
      this.record(`${this.player.name} roubou a chave de ${this.players[owner].name}!`);
    }
    if (id === 2 && this.owner === this.actor) {
      this.winner = this.actor;
      this.phase = 'finished';
      return;
    }
    if ([7, 8].includes(id)) {
      this.player.skip = true;
      this.record(`${this.player.name} encontrou um gato e perderá o próximo turno.`);
    }
    if ([13, 14].includes(id) && this.board.some(t => !t.visible)) {
      this.phase = 'peek';
      return;
    }
    let extra = [];
    if ([5, 6].includes(id)) {
      extra = this.board.flatMap((tile, i) => tile.id === (id === 5 ? 6 : 5) && tile.visible ? [i] : []);
    }
    if ([9, 10].includes(id)) {
      const previous = this.path.at(-2);
      extra = id === 9 ? [position + position - previous] : [previous];
    }
    if ([11, 12].includes(id)) {
      const forbidden = position + (id === 11 ? -1 : 1);
      extra = neighbors(position).filter(i => i !== forbidden);
    }
    this.extra = extra.filter(i => this.board[i] && !blocked(this.board[i]) &&
      ([5, 6].includes(id) || neighbors(position).includes(i)));
    if (this.extra.length) {
      this.optionalExtra = [5, 6].includes(id);
      this.phase = 'extra';
      return;
    }
    this.endTurn();
  }

  dismiss() {
    if (this.phase === 'view' || this.phase === 'peek' ||
        (this.phase === 'extra' && this.optionalExtra)) this.endTurn();
  }

  reachable() {
    const target = this.board.findIndex(t => t.id === (this.owner === null ? 1 : 2));
    const required = this.owner === null
      ? [target, this.board.findIndex(t => t.id === 2)] : [target];
    const starts = this.owner === null ? [target] : [this.players[this.owner].position];
    const queue = [...new Set(starts)];
    const visited = new Set(queue);
    for (const i of queue) {
      const id = this.board[i].id;
      // Uma porta oculta ainda pode ser descoberta. Considere a conexão possível.
      const portal = [5, 6].includes(id)
        ? [this.board.findIndex(t => t.id === (id === 5 ? 6 : 5))] : [];
      for (const n of [...neighbors(i), ...portal]) {
        if (!visited.has(n) && !blocked(this.board[n])) {
          queue.push(n);
          visited.add(n);
        }
      }
    }
    return required.every(i => visited.has(i)) &&
      (this.owner !== null || this.players.some(p => visited.has(p.position)));
  }

  endTurn() {
    this.remaining = 0;
    this.peeked = null;
    if (!this.reachable()) {
      this.phase = 'finished';
      this.record('As interdições isolaram um objetivo necessário.');
      return;
    }
    do {
      this.cursor = (this.cursor + 1) % this.order.length;
      if (!this.player.skip) break;
      this.player.skip = false;
      this.record(`${this.player.name} perdeu o turno por causa do gato.`);
    } while (true);
    this.phase = 'roll';
  }
}
