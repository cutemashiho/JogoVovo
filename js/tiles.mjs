export const tiles = [
  ['Hall','⌂'], ['Chave','⚿'], ['Cofre','▣'], ['Faxineira','♧'],
  ['Doméstica','♧'], ['Passagem Secreta','↝'], ['Saída da Passagem Secreta','↜'],
  ['Gato Branco','♙'], ['Gato Preto','♟'], ['Escada para Subir','↗'],
  ['Escada para Descer','↘'], ['Hora do Café','☕'], ['Hora do Chá','♨'],
  ['Mordomo','♔'], ['Governanta','♕'], ['Quarto de Hóspedes','◇'],
  ['Suíte Principal','◇'], ['Lavabo','◈'], ['Banheiro de Visitas','◈'],
  ['Cinema','▤'], ['Sauna','♨'], ['Jardim','❧'], ['Sala de Jantar','✦'],
  ['Porão','▽'], ['Sótão','△']
];
export const nameOf = id => tiles[id][0];

// Texto público da casa. A interface só consulta este texto quando ela está aberta.
export const effects = [
  'Todos começam aqui.',
  'Pare aqui para pegar a única chave.',
  'Pare aqui com a chave para vencer.',
  'Casa interditada ao revelar.',
  'Casa interditada ao revelar.',
  'Pare aqui para viajar se as duas portas estiverem abertas.',
  'Pare aqui para viajar se as duas portas estiverem abertas.',
  'Pare aqui e perca seu próximo turno.',
  'Pare aqui e perca seu próximo turno.',
  'Pare aqui e avance 1 casa na mesma direção.',
  'Pare aqui e volte à casa anterior.',
  'Pare aqui e ande 1 casa, exceto à esquerda.',
  'Pare aqui e ande 1 casa, exceto à direita.',
  'Pare aqui para espiar 1 casa oculta.',
  'Pare aqui para espiar 1 casa oculta.',
  ...Array(10).fill('Sem efeito especial.')
];

// Rótulos da grade de bolso. Os leitores de tela recebem a descrição completa.
export const compactTiles = [
  ['Hall', 'Início'],
  ['Chave', 'Pare e pegue'],
  ['Cofre', 'Pare com a chave'],
  ['Faxineira', 'Bloqueia ao revelar'],
  ['Doméstica', 'Bloqueia ao revelar'],
  ['Passagem', 'Pare e viaje se ambas abertas'],
  ['Saída secreta', 'Pare e viaje se ambas abertas'],
  ['Gato branco', 'Pare: perde 1 turno'],
  ['Gato preto', 'Pare: perde 1 turno'],
  ['Sobe escada', '+1 na mesma direção'],
  ['Desce escada', 'Volte 1 casa'],
  ['Café', '+1, exceto ←'],
  ['Chá', '+1, exceto →'],
  ['Mordomo', 'Espie 1 casa oculta'],
  ['Governanta', 'Espie 1 casa oculta'],
  ...tiles.slice(15).map(([name]) => [name, 'Sem efeito'])
];
