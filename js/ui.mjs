import { Game } from './game.mjs';
import { chooseAI } from './ai.mjs';
import { tiles, nameOf, effects, compactTiles } from './tiles.mjs';
import { artwork } from '../assets/artwork.mjs';

const $ = id => document.getElementById(id);
const colors = [
  ['Vinho','#812b49','◆'], ['Verde','#355942','●'],
  ['Azul','#264c77','▲'], ['Marrom','#70431c','■']
];
let mode = 'local';
let game;
let timer;
let diceInterval;
let rolling = false;
let paused = false;
const timing = { roll: 1350, playerMove: 550, aiMove: 950 };

function showDie(value, label) {
  $('dice').dataset.value = value;
  if (label) $('dice').setAttribute('aria-label', label);
}

function rollWithAnimation() {
  if (rolling || paused || game.phase !== 'roll') return;
  rolling = true;
  $('dice').classList.add('rolling');
  showDie(1, 'Rolando o dado de exploração');
  let preview = 1;
  diceInterval = setInterval(() => {
    preview = preview % 3 + 1;
    showDie(preview);
  }, 135);
  render();
  timer = setTimeout(() => {
    clearInterval(diceInterval);
    $('dice').classList.remove('rolling');
    rolling = false;
    game.begin();
    showDie(game.lastRoll, `O dado mostrou ${game.lastRoll}`);
    pauseAfterMove();
  }, timing.roll);
}

function pauseAfterMove() {
  paused = true;
  render();
  timer = setTimeout(() => {
    paused = false;
    render();
  }, game.player.ai ? timing.aiMove : timing.playerMove);
}

function configure() {
  $('local').setAttribute('aria-pressed', mode === 'local');
  $('computer').setAttribute('aria-pressed', mode === 'computer');
  $('difficultyLabel').hidden = mode !== 'computer';
  const participants = $('participants');
  participants.replaceChildren();
  for (let i = 0; i < Number($('count').value); i++) {
    const row = document.createElement('div');
    row.className = 'player-field';
    const who = document.createElement('label');
    who.textContent = 'Nome ';
    const input = document.createElement('input');
    input.id = `name-${i}`;
    input.maxLength = 24;
    input.value = mode === 'computer' && i > 0 ? `IA ${i}` : `Jogador ${i+1}`;
    who.append(input);
    const color = document.createElement('label');
    color.textContent = 'Peão ';
    const select = document.createElement('select');
    select.id = `color-${i}`;
    colors.forEach(([name], index) => select.add(new Option(name, index)));
    select.selectedIndex = i;
    color.append(select);
    row.append(who, color);
    participants.append(row);
  }
}

function render() {
  clearTimeout(timer);
  const { phase, actor, player, winner, owner } = game;
  const finished = phase === 'finished';
  const interactive = !player.ai && !rolling && !paused;
  const previousPawns = new Map([...document.querySelectorAll('[data-pawn]')]
    .map(token => [token.dataset.pawn, { rect: token.getBoundingClientRect(), carrier: token.classList.contains('carrier') }]));
  const choices = game.choices();
  const board = $('board');
  const focus = document.activeElement?.dataset?.position;
  $('turn').textContent = finished ? (winner === null ? 'Partida encerrada' : `${game.players[winner].name} venceu!`) : `Vez de ${player.name}`;
  $('objective').textContent = finished ? (winner === null ? 'Um objetivo necessário ficou isolado.' :
    `${game.players[winner].name} abriu o cofre e conquistou a herança da vovó!`) :
    owner === null ? 'Explore a mansão e encontre a chave.' : owner === actor ?
    'Leve a chave até o cofre.' : `Pare na casa de ${game.players[owner].name} para roubar a chave.`;
  const messages = {
    roll: 'Role o dado de exploração.', move: `Dado: ${game.lastRoll} · Passos restantes: ${game.remaining}`,
    peek: 'Escolha uma casa oculta para espiar.', extra: 'Escolha a casa de destino do efeito.',
    view: 'Espiada em andamento.', finished: ''
  };
  $('status').textContent = finished ? $('turn').textContent : `${player.name} · ${rolling ? 'Girando o dado…' : messages[phase]}`;
  const action = $('action');
  action.hidden = !finished && (player.ai || !(phase === 'roll' || phase === 'peek' || (phase === 'extra' && game.optionalExtra)));
  action.disabled = !finished && !interactive;
  action.textContent = finished ? 'Jogar novamente' : phase === 'roll' ? 'Rolar dado (1 a 3)' : 'Dispensar efeito';

  board.replaceChildren();
  game.board.forEach((tile, i) => {
    const button = document.createElement('button');
    const [name, glyph] = tile.visible ? tiles[tile.id] : ['Casa oculta','✧'];
    const spent = tile.id === 1 && tile.visible && owner !== null;
    const available = choices.includes(i) && interactive;
    button.className = ['tile', tile.visible ? '' : 'cover', available ? 'available' : '',
      tile.visible && [3,4].includes(tile.id) ? 'blocked' : '', spent ? 'spent' : ''].join(' ');
    button.disabled = !available;
    button.dataset.position = i;
    const coord = String.fromCharCode(65 + Math.floor(i / 5)) + (i % 5 + 1);
    const marker = document.createElement('span');
    marker.className = 'coord';
    marker.textContent = coord;
    const image = artwork[tile.visible ? tile.id : 'back'];
    const symbol = document.createElement(image ? 'img' : 'span');
    if (image) { symbol.src = image; symbol.alt = ''; }
    else { symbol.className = 'glyph'; symbol.textContent = glyph; }
    const label = document.createElement('span');
    label.className = 'tile-name';
    const fullName = spent ? 'Chave retirada' : name;
    const [compactName, compactEffect] = tile.visible ? compactTiles[tile.id] : ['Oculta', ''];
    label.textContent = fullName;
    label.dataset.compact = spent ? 'Chave retirada' : compactName;
    const effect = document.createElement('span');
    effect.className = 'tile-effect';
    if (tile.visible) {
      effect.textContent = spent ? 'Sem efeito. A chave está com um jogador.' : effects[tile.id];
      effect.dataset.compact = spent ? 'Sem efeito' : compactEffect;
    }
    const pawns = document.createElement('span');
    pawns.className = 'pawns';
    const occupants = [];
    game.players.forEach((p, id) => {
      if (p.position !== i) return;
      const token = document.createElement('span');
      token.className = id === owner ? 'pawn carrier' : 'pawn';
      token.dataset.pawn = id;
      token.style.backgroundColor = colors[p.color][1];
      token.textContent = colors[p.color][2];
      if (id === owner) {
        const badge = document.createElement('span');
        badge.className = 'key-badge';
        badge.textContent = '🔑';
        token.append(badge);
      }
      occupants.push(p.name + (id === owner ? ' com a chave' : ''));
      token.title = occupants.at(-1);
      pawns.append(token);
    });
    button.setAttribute('aria-label', [coord, label.textContent, effect.textContent, ...occupants].filter(Boolean).join(', '));
    button.append(marker, symbol, label, effect, pawns);
    board.append(button);
  });

  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (const token of board.querySelectorAll('[data-pawn]')) {
      const previous = previousPawns.get(token.dataset.pawn);
      if (!previous) continue;
      const next = token.getBoundingClientRect();
      const x = previous.rect.left + previous.rect.width / 2 - next.left - next.width / 2;
      const y = previous.rect.top + previous.rect.height / 2 - next.top - next.height / 2;
      const acquired = token.classList.contains('carrier') && !previous.carrier;
      if (acquired || Math.abs(x) + Math.abs(y) > 2) {
        token.animate([
          { transform: `translate(${x}px, ${y}px) scale(${acquired ? 0.55 : 1})` },
          { transform: 'translate(0, 0) scale(1)' }
        ], { duration: 460, easing: 'cubic-bezier(.2,.65,.25,1)' });
      }
    }
  }

  $('order').replaceChildren(...game.order.map(i => {
    const li = document.createElement('li');
    const p = game.players[i];
    li.textContent = `${colors[p.color][2]} ${p.name} · dado inicial ${game.opening[i]}` + (i === owner ? ' · com a chave' : '');
    if (!finished && i === actor) li.style.fontWeight = 'bold';
    return li;
  }));
  $('history').replaceChildren(...game.log.slice(0, 7).map(message => {
    const li = document.createElement('li');
    li.textContent = message;
    return li;
  }));

  if (phase === 'view' && interactive && !$('secret').open) {
    $('secretTile').textContent = nameOf(player.memory[game.peeked]);
    $('secret').showModal();
  } else if (focus !== undefined || document.activeElement === action || document.activeElement === $('status')) {
    const cell = board.querySelector(`[data-position="${focus}"]:enabled`) ?? board.querySelector('button:enabled');
    if (cell || !action.disabled) (cell ?? (action.hidden ? $('status') : action)).focus({ preventScroll: true });
    else $('status').focus({ preventScroll: true });
  }
  if (!finished && player.ai && !paused && !rolling) timer = setTimeout(aiStep, timing.aiMove);
}

function aiStep() {
  const { player, phase, actor, owner, path, remaining, random } = game;
  if (phase === 'roll') return rollWithAnimation();
  if (phase === 'view') game.dismiss();
  else {
    const board = game.board.map(({ visible }, i) => ({ visible, id: player.memory[i] }));
    const destination = chooseAI({ board, players: game.players.map(p => ({ position: p.position })),
      actor, owner, phase, path, remaining, choices: game.choices(), level: player.level, random });
    if (destination !== undefined) {
      game.advance(destination);
      const cell = $('board').querySelector(`[data-position="${destination}"]`);
      const viewport = $('board').parentElement.getBoundingClientRect();
      const bounds = cell?.getBoundingClientRect();
      if (bounds && (bounds.right > viewport.right || bounds.left < viewport.left)) {
        cell.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }
  }
  render();
}

function reset() {
  clearTimeout(timer);
  clearInterval(diceInterval);
  rolling = false;
  paused = false;
  $('dice').classList.remove('rolling');
  showDie(1, 'Dado de exploração pronto');
  game = undefined;
  $('game').hidden = true;
  $('setup').hidden = false;
  $('local').focus();
}

$('config').addEventListener('submit', event => {
  event.preventDefault();
  const players = Array.from({ length: Number($('count').value) }, (_, i) => ({
    name: $(`name-${i}`).value.trim() || `Jogador ${i+1}`,
    color: Number($(`color-${i}`).value), ai: mode === 'computer' && i > 0, level: $('difficulty').value
  }));
  if (new Set(players.map(p => p.color)).size !== players.length) {
    const duplicate = players.findIndex((p, i) => players.findIndex(q => p.color === q.color) !== i);
    const select = $(`color-${duplicate}`);
    select.setCustomValidity('Escolha uma cor diferente para cada peão.');
    select.reportValidity();
    return;
  }
  game = new Game(players);
  $('setup').hidden = true;
  $('game').hidden = false;
  render();
  $('status').focus({ preventScroll: true });
  if (matchMedia('(max-width: 700px)').matches) window.scrollTo(0, 0);
});
$('participants').addEventListener('change', () => {
  $('participants').querySelectorAll('select').forEach(select => select.setCustomValidity(''));
});
$('local').onclick = () => { mode = 'local'; configure(); };
$('computer').onclick = () => { mode = 'computer'; configure(); };
$('count').onchange = configure;
$('restart').onclick = reset;
$('action').onclick = () => {
  if (game.phase === 'finished') return reset();
  if (game.player.ai || rolling || paused) return;
  if (game.phase === 'roll') {
    $('status').focus({ preventScroll: true });
    return rollWithAnimation();
  }
  game.dismiss();
  render();
};
$('board').onclick = event => {
  const button = event.target.closest('[data-position]');
  if (!button || button.disabled || game.player.ai || rolling || paused) return;
  if (event.detail === 0) $('status').focus({ preventScroll: true });
  game.advance(Number(button.dataset.position));
  pauseAfterMove();
};
$('closeSecret').onclick = () => $('secret').close();
$('secret').addEventListener('close', () => {
  $('secretTile').textContent = '';
  game.dismiss();
  render();
  $('turn').focus();
});
configure();
