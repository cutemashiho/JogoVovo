import { neighbors, routes } from './game.mjs';

function distances(board, target) {
  const distance = Array(25).fill(25);
  if (target === undefined) return distance;
  const queue = [target];
  distance[target] = 0;
  for (const i of queue) {
    for (const n of neighbors(i)) {
      if (distance[n] !== 25 || (board[n].visible && [3,4].includes(board[n].id))) continue;
      distance[n] = distance[i] + 1;
      queue.push(n);
    }
  }
  return distance;
}

export function chooseAI({ board, players, actor, owner, phase, path, remaining, choices, level, random }) {
  if (!choices.length) return undefined;
  const pick = options => options[Math.floor(random() * options.length)];
  if (phase === 'peek') return pick(choices.filter(i => board[i].id === undefined).length
    ? choices.filter(i => board[i].id === undefined) : choices);
  if (level === 'easy') return pick(choices);
  const known = id => board.findIndex(tile => tile.id === id);
  const target = owner === null ? known(1) : owner === actor ? known(2) : players[owner].position;
  const distance = distances(board, target < 0 ? undefined : target);
  const candidates = phase === 'move'
    ? routes(board, path.at(-1), remaining, path).filter(route => choices.includes(route[0]))
    : choices.map(i => [i]);
  const score = route => {
    const end = route.at(-1);
    const id = board[end].id;
    if (phase === 'move' && end === target) return 100;
    let value = route.filter(i => board[i].id === undefined).length * 3 - distance[end] * 2;
    if ([7,8].includes(id)) value -= 3;
    if (level === 'hard') {
      value += [13,14].includes(id) ? 3 : 0;
      if (owner === actor) {
        value -= players.reduce((risk, player, i) => {
          if (i === actor) return risk;
          const reachable = [1,2,3].filter(steps =>
            routes(board, player.position, steps).some(route => route.at(-1) === end));
          return risk + reachable.length * 4;
        }, 0);
      }
    }
    return value + random();
  };
  return candidates.map(route => ({ route, score: score(route) }))
    .sort((a,b) => b.score - a.score)[0]?.route[0] ?? pick(choices);
}
