(() => {
  const boardEl = document.getElementById("board");
  const scoreEl = document.getElementById("score");
  const timeLeftEl = document.getElementById("timeLeft");
  const bestScoreEl = document.getElementById("bestScore");
  const messageEl = document.getElementById("message");
  const startBtn = document.getElementById("startBtn");
  const resetBtn = document.getElementById("resetBtn");
  const durationSelect = document.getElementById("durationSelect");
  const speedSelect = document.getElementById("speedSelect");

  const HOLES = 9; // 3x3
  const CHARACTERS = [
    { src: "assets/char1.png", alt: "캐릭터 1" },
    { src: "assets/char2.png", alt: "캐릭터 2" },
    { src: "assets/char3.png", alt: "캐릭터 3" },
  ];

  let bestScore = 0;
  let score = 0;
  let durationSec = 30;
  let timeLeft = 30;
  let isRunning = false;

  let tickTimer = null;
  let popTimer = null;
  let hideTimer = null;
  let currentIndex = -1;

  function setMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = "message" + (type ? " " + type : "");
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function readBestScore() {
    try {
      const raw = localStorage.getItem("hamster.bestScore");
      const n = Number(raw);
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  }

  function writeBestScore(n) {
    try {
      localStorage.setItem("hamster.bestScore", String(n));
    } catch {
      // ignore
    }
  }

  function updateHud() {
    scoreEl.textContent = String(score);
    timeLeftEl.textContent = String(timeLeft);
    bestScoreEl.textContent = String(bestScore);
  }

  function speedConfig(speedKey) {
    if (speedKey === "easy") {
      return { minGap: 850, maxGap: 1200, showFor: 650 };
    }
    if (speedKey === "hard") {
      return { minGap: 360, maxGap: 560, showFor: 420 };
    }
    return { minGap: 550, maxGap: 850, showFor: 520 };
  }

  function clearTimers() {
    if (tickTimer) window.clearInterval(tickTimer);
    if (popTimer) window.clearTimeout(popTimer);
    if (hideTimer) window.clearTimeout(hideTimer);
    tickTimer = null;
    popTimer = null;
    hideTimer = null;
  }

  function hideCurrent() {
    if (currentIndex < 0) return;
    const btn = document.querySelector('.hamster[data-index="' + currentIndex + '"]');
    if (!btn) return;
    btn.classList.remove("pop");
    btn.setAttribute("aria-hidden", "true");
    currentIndex = -1;
  }

  function pickNextIndex() {
    if (HOLES <= 1) return 0;
    let idx = Math.floor(Math.random() * HOLES);
    if (idx === currentIndex) {
      idx = (idx + 1 + Math.floor(Math.random() * (HOLES - 1))) % HOLES;
    }
    return idx;
  }

  function randomCharacter() {
    return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
  }

  function showHamster(index) {
    hideCurrent();

    const btn = document.querySelector('.hamster[data-index="' + index + '"]');
    if (!btn) return;

    const ch = randomCharacter();
    const img = btn.querySelector("img");
    if (img) {
      img.src = ch.src;
      img.alt = ch.alt;
    }
    btn.classList.add("pop");
    btn.setAttribute("aria-hidden", "false");

    currentIndex = index;
  }

  function scheduleNextPop() {
    if (!isRunning) return;

    const cfg = speedConfig(speedSelect.value);
    const gap = Math.floor(cfg.minGap + Math.random() * (cfg.maxGap - cfg.minGap));

    popTimer = window.setTimeout(() => {
      if (!isRunning) return;
      const idx = pickNextIndex();
      showHamster(idx);

      hideTimer = window.setTimeout(() => {
        hideCurrent();
        scheduleNextPop();
      }, cfg.showFor);
    }, gap);
  }

  function stopGame(reason) {
    isRunning = false;
    clearTimers();
    hideCurrent();

    startBtn.disabled = false;
    startBtn.classList.add("primary");
    durationSelect.disabled = false;
    speedSelect.disabled = false;

    if (reason === "timeup") {
      setMessage("시간 종료! 점수: " + score, "done");
    } else {
      setMessage("게임이 멈췄습니다.", "");
    }

    if (score > bestScore) {
      bestScore = score;
      writeBestScore(bestScore);
      updateHud();
    }
  }

  function startGame() {
    if (isRunning) return;

    durationSec = clamp(Number(durationSelect.value) || 30, 5, 180);
    timeLeft = durationSec;
    score = 0;
    isRunning = true;

    updateHud();
    setMessage("시작! 햄스터를 클릭하세요.", "ok");

    startBtn.disabled = true;
    startBtn.classList.remove("primary");
    durationSelect.disabled = true;
    speedSelect.disabled = true;

    clearTimers();
    hideCurrent();

    tickTimer = window.setInterval(() => {
      if (!isRunning) return;
      timeLeft -= 1;
      updateHud();
      if (timeLeft <= 0) {
        timeLeft = 0;
        updateHud();
        stopGame("timeup");
      }
    }, 1000);

    scheduleNextPop();
  }

  function resetGame() {
    stopGame("reset");
    score = 0;
    durationSec = clamp(Number(durationSelect.value) || 30, 5, 180);
    timeLeft = durationSec;
    updateHud();
    setMessage("준비 완료. 시작을 누르세요.", "");
  }

  function onHit(e) {
    if (!isRunning) return;
    const target = e.target;
    if (!target.classList.contains("hamster")) return;
    if (!target.classList.contains("pop")) return;

    score += 1;
    updateHud();
    target.classList.remove("pop");
    target.setAttribute("aria-hidden", "true");
    currentIndex = -1;

    setMessage("좋아요! +1", "ok");
  }

  function renderBoard() {
    boardEl.innerHTML = "";

    for (let i = 0; i < HOLES; i += 1) {
      const hole = document.createElement("div");
      hole.className = "hole";

      const hamster = document.createElement("button");
      hamster.type = "button";
      hamster.className = "hamster";
      hamster.dataset.index = String(i);
      hamster.setAttribute("aria-label", "캐릭터");
      hamster.setAttribute("aria-hidden", "true");

      const img = document.createElement("img");
      img.className = "hamster-img";
      img.alt = "";
      img.decoding = "async";
      img.loading = "eager";
      hamster.appendChild(img);

      hole.appendChild(hamster);
      boardEl.appendChild(hole);
    }
  }

  function init() {
    bestScore = readBestScore();
    startBtn.classList.add("primary");
    renderBoard();
    resetGame();
  }

  boardEl.addEventListener("click", onHit);
  startBtn.addEventListener("click", startGame);
  resetBtn.addEventListener("click", resetGame);

  init();
})();
