const WORD_PAIRS = [
  ["אן", "כן"],
  ["מרחבטנה", "קקי"],
  ["אוצה", "רוצה"],
  ["פוקי", "דפוקי"],
  ["מואפ", "נשיקה"],
  ["נאון", "נכון"],
  ["אוה אוחה", "אוהב אותך"],
  ["אסדה", "בסדר"],
];

const DIFFICULTIES = {
  easy: { label: "קל", pairs: 4 },
  medium: { label: "בינוני", pairs: 6 },
  hard: { label: "קשה", pairs: 8 },
};

const ui = {
  introScreen: document.getElementById("introScreen"),
  gameScreen: document.getElementById("gameScreen"),
  victoryScreen: document.getElementById("victoryScreen"),
  heroImage: document.querySelector(".hero-image"),
  gameBoard: document.getElementById("gameBoard"),
  scoreValue: document.getElementById("scoreValue"),
  timeValue: document.getElementById("timeValue"),
  levelValue: document.getElementById("levelValue"),
  statusMessage: document.getElementById("statusMessage"),
  statusEmoji: document.getElementById("statusEmoji"),
  finalTime: document.getElementById("finalTime"),
  finalScore: document.getElementById("finalScore"),
  startGameBtn: document.getElementById("startGameBtn"),
  backToMenuBtn: document.getElementById("backToMenuBtn"),
  playAgainBtn: document.getElementById("playAgainBtn"),
  chooseDifficultyBtn: document.getElementById("chooseDifficultyBtn"),
  minimizeViewBtn: document.getElementById("minimizeViewBtn"),
  closeViewBtn: document.getElementById("closeViewBtn"),
  difficultyButtons: document.querySelectorAll(".difficulty-btn"),
  confettiCanvas: document.getElementById("confettiCanvas"),
};

const state = {
  difficulty: "easy",
  cards: [],
  score: 0,
  matches: 0,
  firstCardId: null,
  secondCardId: null,
  lockBoard: false,
  elapsedSeconds: 0,
  timerId: null,
  isPlaying: false,
  confettiFrameId: null,
  confettiResizeHandler: null,
};

ui.difficultyButtons.forEach((button) => {
  button.addEventListener("click", () => selectDifficulty(button.dataset.difficulty));
});

ui.startGameBtn.addEventListener("click", () => startGame(state.difficulty));
ui.backToMenuBtn.addEventListener("click", showIntro);
ui.playAgainBtn.addEventListener("click", () => startGame(state.difficulty));
ui.chooseDifficultyBtn.addEventListener("click", showIntro);
ui.minimizeViewBtn.addEventListener("click", showIntro);
ui.closeViewBtn.addEventListener("click", closeExperience);
window.addEventListener("resize", () => {
  updateViewportMetrics();
  if (state.isPlaying) {
    fitCardWords();
  }
  fitActiveScreen();
});
window.addEventListener("load", () => {
  updateViewportMetrics();
  fitCardWords();
  fitActiveScreen();
});
window.visualViewport?.addEventListener("resize", () => {
  updateViewportMetrics();
  fitActiveScreen();
});
window.visualViewport?.addEventListener("scroll", updateViewportMetrics);

updateViewportMetrics();
selectDifficulty("easy");
showScreen("intro");
window.requestAnimationFrame(fitActiveScreen);

if (ui.heroImage) {
  ui.heroImage.addEventListener("load", fitActiveScreen);
}

function selectDifficulty(difficulty) {
  state.difficulty = difficulty;
  ui.difficultyButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.difficulty === difficulty);
  });
}

function startGame(difficulty) {
  stopTimer();
  stopConfetti();

  state.difficulty = difficulty;
  state.score = 0;
  state.matches = 0;
  state.firstCardId = null;
  state.secondCardId = null;
  state.lockBoard = false;
  state.elapsedSeconds = 0;
  state.isPlaying = true;

  const selectedPairs = WORD_PAIRS.slice(0, DIFFICULTIES[difficulty].pairs);
  state.cards = shuffleCards(createCards(selectedPairs));

  ui.scoreValue.textContent = "0";
  ui.timeValue.textContent = formatTime(0);
  ui.levelValue.textContent = DIFFICULTIES[difficulty].label;
  setStatus("🎧", "מצאו שני קלפים שהם זוג תואם.");
  renderBoard();
  setBoardColumns();
  showScreen("game");
  startTimer();
  window.requestAnimationFrame(() => {
    fitCardWords();
    fitActiveScreen();
  });
}

function createCards(pairs) {
  return pairs.flatMap(([secretWord, matchingWord], pairIndex) => [
    {
      id: `${pairIndex}-a`,
      pairId: `pair-${pairIndex}`,
      word: secretWord,
      matched: false,
      flipped: false,
    },
    {
      id: `${pairIndex}-b`,
      pairId: `pair-${pairIndex}`,
      word: matchingWord,
      matched: false,
      flipped: false,
    },
  ]);
}

function shuffleCards(cards) {
  const shuffled = [...cards];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

function renderBoard() {
  ui.gameBoard.innerHTML = "";

  state.cards.forEach((card) => {
    const button = document.createElement("button");
    const isMultiWord = card.word.includes(" ");
    const wordLengthClass =
      card.word.length >= 9 ? "card-word--long" : card.word.length >= 6 ? "card-word--medium" : "";
    const wordLayoutClass = isMultiWord ? "card-word--stacked" : "card-word--single";
    const wordMarkup = isMultiWord
      ? card.word
          .split(" ")
          .map((part) => `<span>${part}</span>`)
          .join("")
      : card.word;
    button.className = "memory-card";
    button.type = "button";
    button.dataset.id = card.id;
    button.setAttribute("aria-label", `קלף ${card.word}`);
    button.innerHTML = `
      <div class="card-inner">
        <div class="memory-card-face card-back">
          <div class="card-crown">💎</div>
          <div class="card-corner corner-top-right">✦</div>
          <div class="card-corner corner-top-left">✦</div>
          <div class="card-corner corner-bottom-right">✦</div>
          <div class="card-corner corner-bottom-left">✦</div>
          <div class="card-back-badge">
            <span>🔷</span>
          </div>
          <div class="card-bottom-gem">💎</div>
        </div>
        <div class="memory-card-face card-front">
          <div class="card-corner corner-top-right">✦</div>
          <div class="card-corner corner-top-left">✦</div>
          <div class="card-corner corner-bottom-right">✦</div>
          <div class="card-corner corner-bottom-left">✦</div>
          <div class="card-front-orbit"></div>
          <div class="card-content">
            <div class="card-spark">✨</div>
            <div class="card-word ${wordLengthClass} ${wordLayoutClass}">${wordMarkup}</div>
          </div>
        </div>
      </div>
    `;

    button.addEventListener("click", () => handleCardClick(card.id));
    ui.gameBoard.appendChild(button);
  });

  fitCardWords();
}

function fitCardWords() {
  const wordElements = ui.gameBoard.querySelectorAll(".card-word");

  wordElements.forEach((element) => {
    const content = element.closest(".card-content");

    if (!content) {
      return;
    }

    element.style.fontSize = "";

    const computedStyle = window.getComputedStyle(element);
    let fontSize = parseFloat(computedStyle.fontSize);
    const minFontSize = element.classList.contains("card-word--stacked") ? 13 : 10;
    const maxWidth = content.clientWidth - 6;
    const maxHeight = content.clientHeight - 36;

    while ((element.scrollWidth > maxWidth || element.scrollHeight > maxHeight) && fontSize > minFontSize) {
      fontSize -= 0.5;
      element.style.fontSize = `${fontSize}px`;
    }
  });
}

function fitActiveScreen() {
  const activeScreen = document.querySelector(".screen.active");
  const inner = activeScreen?.querySelector(".screen-inner");
  const isMobileViewport = isMobileDevice();

  if (!activeScreen || !inner) {
    return;
  }

  document.body.classList.toggle("mobile-viewport", isMobileViewport);

  inner.style.transform = "";
  inner.classList.remove("compact-screen");
  inner.classList.remove("ultra-compact-screen");

  if (isMobileViewport) {
    const viewportHeight = window.visualViewport?.height || window.innerHeight;

    if (viewportHeight <= 760) {
      inner.classList.add("compact-screen");
    }

    if (viewportHeight <= 680) {
      inner.classList.add("ultra-compact-screen");
    }

    return;
  }

  const availableHeight = activeScreen.clientHeight;
  const availableWidth = activeScreen.clientWidth;
  const contentHeight = Math.max(inner.scrollHeight, inner.offsetHeight);
  const contentWidth = Math.max(inner.scrollWidth, inner.offsetWidth);
  const scale = Math.min(1, availableHeight / contentHeight, availableWidth / contentWidth);

  inner.style.transform = `scale(${scale})`;

  if (scale < 0.98) {
    inner.classList.add("compact-screen");
  }
}

function updateViewportMetrics() {
  const viewportHeight = window.visualViewport?.height || window.innerHeight;
  const hiddenBottomInset = Math.max(
    0,
    window.innerHeight - viewportHeight - (window.visualViewport?.offsetTop || 0)
  );

  document.documentElement.style.setProperty("--app-height", `${viewportHeight}px`);
  document.documentElement.style.setProperty("--browser-ui-bottom", `${hiddenBottomInset}px`);
  document.body.classList.toggle("mobile-device", isMobileDevice());
}

function closeExperience() {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }

  window.close();
}

function isMobileDevice() {
  const userAgent = navigator.userAgent || "";
  const mobileAgent =
    /iPhone|iPad|iPod|Android|Mobile|Opera Mini|IEMobile/i.test(userAgent);
  const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches;
  return Boolean(mobileAgent || coarsePointer);
}

function handleCardClick(cardId) {
  if (state.lockBoard || !state.isPlaying) {
    return;
  }

  const card = state.cards.find((item) => item.id === cardId);

  if (!card || card.flipped || card.matched) {
    return;
  }

  flipCard(cardId, true);

  if (!state.firstCardId) {
    state.firstCardId = cardId;
    setStatus("👀", "יפה, בחרו עכשיו קלף שני ובדקו אם יש התאמה.");
    return;
  }

  state.secondCardId = cardId;
  state.lockBoard = true;

  const firstCard = state.cards.find((item) => item.id === state.firstCardId);
  const secondCard = state.cards.find((item) => item.id === state.secondCardId);

  if (firstCard.pairId === secondCard.pairId) {
    handleMatch(firstCard.id, secondCard.id);
    return;
  }

  handleMismatch(firstCard.id, secondCard.id);
}

function flipCard(cardId, shouldFlip) {
  const card = state.cards.find((item) => item.id === cardId);
  const cardElement = ui.gameBoard.querySelector(`[data-id="${cardId}"]`);

  if (!card || !cardElement) {
    return;
  }

  card.flipped = shouldFlip;
  cardElement.classList.toggle("flipped", shouldFlip);
}

function handleMatch(firstId, secondId) {
  [firstId, secondId].forEach((cardId) => {
    const card = state.cards.find((item) => item.id === cardId);
    const cardElement = ui.gameBoard.querySelector(`[data-id="${cardId}"]`);

    card.matched = true;
    if (cardElement) {
      cardElement.classList.add("matched");
      cardElement.disabled = true;
    }
  });

  state.score += 1;
  state.matches += 1;
  ui.scoreValue.textContent = String(state.score);
  setStatus("✅", "זוג מושלם! מצאתם התאמה נכונה וקיבלתם נקודה.");
  resetSelection();

  if (state.matches === DIFFICULTIES[state.difficulty].pairs) {
    finishGame();
  } else {
    state.lockBoard = false;
  }
}

function handleMismatch(firstId, secondId) {
  setStatus("😅", "עוד רגע! אלה לא זוג תואם, נסו שוב.");

  [firstId, secondId].forEach((cardId) => {
    const cardElement = ui.gameBoard.querySelector(`[data-id="${cardId}"]`);

    if (cardElement) {
      cardElement.classList.add("wrong");
      window.setTimeout(() => cardElement.classList.remove("wrong"), 320);
    }
  });

  window.setTimeout(() => {
    flipCard(firstId, false);
    flipCard(secondId, false);
    resetSelection();
    state.lockBoard = false;
    setStatus("🧠", "שמרו על הקצב, הזוג הבא כבר מחכה.");
  }, 900);
}

function resetSelection() {
  state.firstCardId = null;
  state.secondCardId = null;
}

function finishGame() {
  state.isPlaying = false;
  stopTimer();
  ui.finalTime.textContent = formatTime(state.elapsedSeconds);
  ui.finalScore.textContent = String(state.score);
  showScreen("victory");
  startConfetti();
  window.requestAnimationFrame(fitActiveScreen);
}

function setStatus(emoji, message) {
  ui.statusEmoji.textContent = emoji;
  ui.statusMessage.textContent = message;
}

function startTimer() {
  ui.timeValue.textContent = formatTime(state.elapsedSeconds);

  state.timerId = window.setInterval(() => {
    state.elapsedSeconds += 1;
    ui.timeValue.textContent = formatTime(state.elapsedSeconds);
  }, 1000);
}

function stopTimer() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function formatTime(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function showIntro() {
  stopTimer();
  stopConfetti();
  state.isPlaying = false;
  showScreen("intro");
  window.requestAnimationFrame(fitActiveScreen);
}

function showScreen(screenName) {
  const screens = {
    intro: ui.introScreen,
    game: ui.gameScreen,
    victory: ui.victoryScreen,
  };

  Object.entries(screens).forEach(([name, screen]) => {
    const isActive = name === screenName;
    screen.classList.toggle("active", isActive);
    screen.setAttribute("aria-hidden", String(!isActive));
  });

  fitActiveScreen();
}

function setBoardColumns() {
  const pairs = DIFFICULTIES[state.difficulty].pairs;
  const columns = pairs >= 8 ? 4 : pairs >= 6 ? 3 : 2;
  ui.gameBoard.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
}

function startConfetti() {
  const canvas = ui.confettiCanvas;
  const context = canvas.getContext("2d");
  const colors = ["#ffd66e", "#67d9ff", "#79ffb3", "#ff6fd0", "#ffffff"];
  const pieces = Array.from({ length: 120 }, () => createConfettiPiece());

  function createConfettiPiece() {
    const rect = ui.victoryScreen.getBoundingClientRect();
    return {
      x: Math.random() * rect.width,
      y: Math.random() * -rect.height,
      size: Math.random() * 8 + 4,
      speedY: Math.random() * 2.6 + 1.4,
      speedX: Math.random() * 2 - 1,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: Math.random() * 0.15 + 0.02,
      color: colors[Math.floor(Math.random() * colors.length)],
    };
  }

  function resizeConfettiCanvas() {
    const rect = ui.victoryScreen.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  }

  resizeConfettiCanvas();
  state.confettiResizeHandler = resizeConfettiCanvas;
  window.addEventListener("resize", state.confettiResizeHandler);

  function animate() {
    const rect = ui.victoryScreen.getBoundingClientRect();
    context.clearRect(0, 0, rect.width, rect.height);

    pieces.forEach((piece) => {
      piece.x += piece.speedX;
      piece.y += piece.speedY;
      piece.rotation += piece.rotationSpeed;

      if (piece.y > rect.height + 20) {
        piece.y = -20;
        piece.x = Math.random() * rect.width;
      }

      context.save();
      context.translate(piece.x, piece.y);
      context.rotate(piece.rotation);
      context.fillStyle = piece.color;
      context.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.65);
      context.restore();
    });

    state.confettiFrameId = window.requestAnimationFrame(animate);
  }

  animate();
}

function stopConfetti() {
  if (state.confettiFrameId) {
    window.cancelAnimationFrame(state.confettiFrameId);
    state.confettiFrameId = null;
  }

  if (state.confettiResizeHandler) {
    window.removeEventListener("resize", state.confettiResizeHandler);
    state.confettiResizeHandler = null;
  }

  const context = ui.confettiCanvas.getContext("2d");
  context.clearRect(0, 0, ui.confettiCanvas.width, ui.confettiCanvas.height);
}
