(function () {
  "use strict";
  const { categories, cards, createGame, choose } = window.MathMatch;
  const $ = id => document.getElementById(id);
  const storageKey = "math-match-categories-v1";
  let selected = ["trig", "inverse-trig"];
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(saved)) selected = saved.filter(id => categories.some(category => category.id === id));
  } catch (_) { /* Studying also works when browser storage is unavailable. */ }
  let game = null;
  let startedAt = 0;
  let timer = null;
  let wrongTimer = null;

  function updateSelection() {
    selected = [...document.querySelectorAll(".category-input:checked")].map(input => input.value);
    const count = cards.filter(card => selected.includes(card.category)).length;
    $("selection-count").textContent = `${selected.length}개 항목 · ${count}쌍의 카드`;
    $("start").disabled = count === 0;
    $("select-all").textContent = selected.length === categories.length ? "전체 해제" : "전체 선택";
    try { localStorage.setItem(storageKey, JSON.stringify(selected)); } catch (_) { /* Optional preference only. */ }
  }

  categories.forEach((category, index) => {
    const label = document.createElement("label");
    label.className = "category";
    label.innerHTML = `<input class="category-input" type="checkbox" value="${category.id}" ${selected.includes(category.id) ? "checked" : ""}><span class="category-symbol">${category.symbol}</span><span class="category-copy"><strong><small>0${index + 1}</small> ${category.name}</strong><span>${category.description}</span></span><span class="check" aria-hidden="true">✓</span>`;
    label.querySelector("input").addEventListener("change", updateSelection);
    $("categories").append(label);
  });
  $("select-all").addEventListener("click", () => {
    const checked = selected.length !== categories.length;
    document.querySelectorAll(".category-input").forEach(input => { input.checked = checked; });
    updateSelection();
  });

  function elapsed() { return Math.floor((Date.now() - startedAt) / 1000); }
  function formatTime(seconds) { return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`; }
  function feedback(text, kind = "") {
    $("feedback").textContent = text;
    $("feedback").className = `feedback ${kind}`;
  }
  function refresh() {
    document.querySelectorAll(".match-card").forEach(button => {
      const isMatched = game.matched.has(button.dataset.id);
      const isSelected = game.selected?.id === button.dataset.id && game.selected?.side === button.dataset.side;
      button.classList.toggle("matched", isMatched);
      button.classList.toggle("selected", isSelected);
      button.disabled = isMatched;
      button.setAttribute("aria-pressed", String(isSelected));
      button.querySelector(".card-state").textContent = isMatched ? "✓ 완료" : isSelected ? "선택 중" : "";
    });
    $("matched-count").textContent = `${game.matched.size} / ${game.deck.length}`;
    $("attempt-count").textContent = game.attempts;
    $("progress").value = game.matched.size;
  }
  function handleChoice(button) {
    clearTimeout(wrongTimer);
    document.querySelectorAll(".wrong").forEach(card => card.classList.remove("wrong"));
    const previous = game.selected;
    const result = choose(game, button.dataset.side, button.dataset.id);
    refresh();
    if (result === "selected") feedback(`${button.dataset.side === "question" ? "정답" : "문제"} 카드에서 짝을 골라주세요.`);
    if (result === "deselected") feedback("선택을 취소했어요. 새 카드를 골라주세요.");
    if (result === "wrong") {
      feedback("아직 짝이 아니에요. 괜찮아요, 다시 연결해보세요.", "error");
      const wrong = [...document.querySelectorAll(".match-card")].filter(card => card === button || (card.dataset.id === previous.id && card.dataset.side === previous.side));
      wrong.forEach(card => card.classList.add("wrong"));
      wrongTimer = setTimeout(() => wrong.forEach(card => card.classList.remove("wrong")), 700);
    }
    if (result === "matched" || result === "complete") feedback("정확해요! 한 쌍을 연결했어요.", "success");
    if (result === "complete") {
      clearInterval(timer);
      $("timer").textContent = formatTime(elapsed());
      $("completion-detail").textContent = `${game.deck.length}쌍 완료 · ${game.attempts}번 시도 · ${formatTime(elapsed())} 소요`;
      $("completion").hidden = false;
      $("completion").scrollIntoView({ behavior: "smooth", block: "center" });
      $("again").focus({ preventScroll: true });
    }
  }
  function renderColumn(id, deck, side) {
    $(id).replaceChildren();
    deck.forEach(card => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "match-card";
      button.dataset.id = card.id;
      button.dataset.side = side;
      button.setAttribute("aria-pressed", "false");
      const category = categories.find(item => item.id === card.category);
      button.innerHTML = `<span class="card-label">${side === "question" ? category.name : "이 공식의 짝은?"}</span><span class="formula">${side === "question" ? card.question : card.answer}</span><span class="card-note">${side === "question" ? card.alias : card.note}</span><span class="card-state"></span>`;
      button.addEventListener("click", () => handleChoice(button));
      $(id).append(button);
    });
  }
  function start() {
    if (!selected.length) return;
    clearInterval(timer);
    clearTimeout(wrongTimer);
    game = createGame(selected);
    renderColumn("questions", game.questions, "question");
    renderColumn("answers", game.answers, "answer");
    $("study").hidden = false;
    $("completion").hidden = true;
    $("progress").max = game.deck.length;
    $("timer").textContent = "00:00";
    startedAt = Date.now();
    timer = setInterval(() => { $("timer").textContent = formatTime(elapsed()); }, 1000);
    feedback("문제와 정답을 하나씩 눌러주세요. 어느 쪽부터 골라도 괜찮아요.");
    refresh();
    $("study").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  // A reshuffle keeps the current deck, even if the next session's selection changed.
  function restart() {
    const nextSelection = selected;
    selected = [...new Set(game.deck.map(card => card.category))];
    start();
    selected = nextSelection;
  }
  $("start").addEventListener("click", start);
  $("restart").addEventListener("click", restart);
  $("again").addEventListener("click", restart);
  $("change-categories").addEventListener("click", () => {
    $("settings-title").scrollIntoView({ behavior: "smooth", block: "start" });
    document.querySelector(".category-input").focus({ preventScroll: true });
  });
  updateSelection();
})();