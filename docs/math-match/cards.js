/* No dependencies: shared by the browser and Node's built-in test runner. */
(function (root) {
  "use strict";
  const frac = (top, bottom) => `<span class="fraction"><span>${top}</span><span>${bottom}</span></span>`;
  const derivative = (name) => `d/dx [${name} x]`;
  const categories = [
    { id: "trig", name: "삼각함수의 미분", symbol: "sin′", description: "sin · cos · tan · cot · sec · csc" },
    { id: "inverse-trig", name: "역삼각함수의 미분", symbol: "sin⁻¹", description: "arcsin · arccos · arctan · arcsec" },
    { id: "hyperbolic", name: "쌍곡선함수의 정의", symbol: "sinh", description: "sinh · cosh · tanh의 지수 표현" },
    { id: "hyperbolic-derivative", name: "쌍곡선함수의 미분", symbol: "sinh′", description: "sinh · cosh · tanh의 도함수" },
    { id: "inverse-hyperbolic", name: "역쌍곡선함수", symbol: "sinh⁻¹", description: "arsinh · arcosh · artanh의 로그 표현" },
    { id: "inverse-hyperbolic-derivative", name: "역쌍곡선함수의 미분", symbol: "(sinh⁻¹)′", description: "arsinh · arcosh · artanh의 도함수" },
  ];
  const cards = [];
  function add(category, name, question, answer, note = "", alias = "") {
    cards.push({ id: `${category}-${name}`, category, question, answer, note, alias });
  }
  [
    ["sin", "cos x"], ["cos", "−sin x"], ["tan", "sec² x"],
    ["cot", "−csc² x"], ["sec", "sec x · tan x"], ["csc", "−csc x · cot x"],
  ].forEach(([name, answer]) => add("trig", name, derivative(name), answer, "원래 함수가 정의되고 미분 가능한 x"));
  [
    ["sin", frac("1", "√(1 − x²)"), "−1 < x < 1", "arcsin"],
    ["cos", frac("−1", "√(1 − x²)"), "−1 < x < 1", "arccos"],
    ["tan", frac("1", "1 + x²"), "x ∈ ℝ", "arctan"],
    ["sec", frac("1", "|x| √(x² − 1)"), "|x| > 1 · arcsec의 값 범위: [0, π] ∖ {π/2}", "arcsec"],
  ].forEach(([name, answer, note, alias]) => add("inverse-trig", name, derivative(`${name}⁻¹`), answer, note, `${alias} x의 미분`));
  [
    ["sinh", frac("eˣ − e⁻ˣ", "2")],
    ["cosh", frac("eˣ + e⁻ˣ", "2")],
    ["tanh", frac("eˣ − e⁻ˣ", "eˣ + e⁻ˣ")],
  ].forEach(([name, answer]) => add("hyperbolic", name, `${name} x = ?`, answer, "x ∈ ℝ · 지수함수로 나타낸 정의"));
  [
    ["sinh", "cosh x"], ["cosh", "sinh x"], ["tanh", frac("1", "cosh² x")],
  ].forEach(([name, answer]) => add("hyperbolic-derivative", name, derivative(name), answer, name === "tanh" ? "x ∈ ℝ · sech² x와 같아요" : "x ∈ ℝ"));
  [
    ["sinh", "ln(x + √(x² + 1))", "x ∈ ℝ", "arsinh"],
    ["cosh", "ln(x + √(x² − 1))", "x ≥ 1 · cosh를 [0, ∞)로 제한한 역함수", "arcosh"],
    ["tanh", `${frac("1", "2")} ln(${frac("1 + x", "1 − x")})`, "−1 < x < 1", "artanh"],
  ].forEach(([name, answer, note, alias]) => add("inverse-hyperbolic", name, `${name}⁻¹ x = ?`, answer, note, `${alias} x의 로그 표현`));
  [
    ["sinh", frac("1", "√(x² + 1)"), "x ∈ ℝ", "arsinh"],
    ["cosh", frac("1", "√(x² − 1)"), "x > 1", "arcosh"],
    ["tanh", frac("1", "1 − x²"), "−1 < x < 1", "artanh"],
  ].forEach(([name, answer, note, alias]) => add("inverse-hyperbolic-derivative", name, derivative(`${name}⁻¹`), answer, note, `${alias} x의 미분`));

  function shuffle(items, random = Math.random) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function createGame(categoryIds) {
    const deck = cards.filter(card => categoryIds.includes(card.category));
    return { deck, questions: shuffle(deck), answers: shuffle(deck), selected: null, matched: new Set(), attempts: 0 };
  }
  function choose(game, side, id) {
    if (!["question", "answer"].includes(side) || !game.deck.some(card => card.id === id) || game.matched.has(id)) return "ignored";
    const previous = game.selected;
    if (!previous || previous.side === side) {
      game.selected = previous && previous.id === id ? null : { side, id };
      return game.selected ? "selected" : "deselected";
    }
    game.attempts++;
    game.selected = null;
    if (previous.id !== id) return "wrong";
    game.matched.add(id);
    return game.matched.size === game.deck.length ? "complete" : "matched";
  }
  const api = { categories, cards, shuffle, createGame, choose };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MathMatch = api;
})(typeof globalThis !== "undefined" ? globalThis : this);