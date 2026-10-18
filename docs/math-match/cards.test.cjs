const test = require('node:test');
const assert = require('node:assert/strict');
const { cards, categories, createGame, choose, shuffle } = require('./cards.js');

test('six categories contain 22 uniquely identified pairs', () => {
  assert.equal(categories.length, 6);
  assert.equal(cards.length, 22);
  assert.equal(new Set(cards.map(card => card.id)).size, cards.length);
  assert.deepEqual(categories.map(category => cards.filter(card => card.category === category.id).length), [6, 4, 3, 3, 3, 3]);
  cards.forEach(card => {
    assert.ok(card.question && card.answer && card.note);
    assert.ok(categories.some(category => category.id === card.category));
  });
});
test('selected categories alone form both shuffled columns', () => {
  const game = createGame(['trig', 'inverse-hyperbolic']);
  assert.equal(game.deck.length, 9);
  assert.deepEqual(new Set(game.questions), new Set(game.deck));
  assert.deepEqual(new Set(game.answers), new Set(game.deck));
  assert.notEqual(game.questions, game.answers);
  assert.equal(createGame([]).deck.length, 0);
});
test('shuffle preserves its input and every card', () => {
  const source = [1, 2, 3, 4];
  assert.deepEqual(shuffle(source, () => 0), [2, 3, 4, 1]);
  assert.deepEqual(source, [1, 2, 3, 4]);
});
test('a correct pair works in either click order and cannot score twice', () => {
  const game = createGame(['hyperbolic']);
  const [a, b] = game.deck;
  assert.equal(choose(game, 'question', a.id), 'selected');
  assert.equal(choose(game, 'answer', a.id), 'matched');
  assert.equal(choose(game, 'question', a.id), 'ignored');
  assert.equal(choose(game, 'answer', b.id), 'selected');
  assert.equal(choose(game, 'question', b.id), 'matched');
  assert.equal(game.matched.size, 2);
  assert.equal(game.attempts, 2);
});
test('wrong pair clears selection without completing a card', () => {
  const game = createGame(['trig']);
  choose(game, 'question', game.deck[0].id);
  assert.equal(choose(game, 'answer', game.deck[1].id), 'wrong');
  assert.equal(game.selected, null);
  assert.equal(game.matched.size, 0);
  assert.equal(game.attempts, 1);
});
test('same-side clicks replace or cancel selection without an attempt', () => {
  const game = createGame(['trig']);
  choose(game, 'question', game.deck[0].id);
  choose(game, 'question', game.deck[1].id);
  assert.equal(game.selected.id, game.deck[1].id);
  assert.equal(choose(game, 'question', game.deck[1].id), 'deselected');
  assert.equal(game.attempts, 0);
  assert.equal(choose(game, 'other', game.deck[0].id), 'ignored');
  assert.equal(choose(game, 'answer', 'invalid'), 'ignored');
});
test('all 22 cards can be completed in a mixed session', () => {
  const game = createGame(categories.map(category => category.id));
  game.deck.forEach((card, index) => {
    choose(game, 'question', card.id);
    assert.equal(choose(game, 'answer', card.id), index === 21 ? 'complete' : 'matched');
  });
  assert.equal(game.matched.size, 22);
  assert.equal(game.attempts, 22);
});
test('inverse secant retains absolute value and inverse hyperbolic domains differ', () => {
  assert.ok(cards.find(card => card.id === 'inverse-trig-sec').answer.includes('|x|'));
  assert.ok(cards.find(card => card.id === 'inverse-hyperbolic-cosh').note.includes('x ≥ 1'));
  assert.equal(cards.find(card => card.id === 'inverse-hyperbolic-derivative-cosh').note, 'x > 1');
});