const CONFIG = {
  gridSize: 20,
  cellSize: 24,
  tickMs: 140,
  foodCount: 3,
};

const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

function makeRng() {
  return Math.random;
}

function createGame({ gridSize, rng = makeRng() } = {}) {
  const size = gridSize ?? CONFIG.gridSize;

  const state = {
    gridSize: size,
    snake: [
      { x: Math.floor(size / 2), y: Math.floor(size / 2) },
      { x: Math.floor(size / 2) - 1, y: Math.floor(size / 2) },
    ],
    direction: "right",
    nextDirection: "right",
    foods: [],
    score: 0,
    alive: true,
  };

  const placeFood = () => {
    const open = [];
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const onSnake = state.snake.some((segment) => segment.x === x && segment.y === y);
        const onFood = state.foods.some((food) => food.x === x && food.y === y);
        if (!onSnake && !onFood) {
          open.push({ x, y });
        }
      }
    }

    if (open.length === 0) {
      return null;
    }

    const idx = Math.floor(rng() * open.length);
    return open[idx];
  };

  const ensureFoods = () => {
    while (state.foods.length < CONFIG.foodCount) {
      const nextFood = placeFood();
      if (!nextFood) break;
      state.foods.push(nextFood);
    }
  };

  ensureFoods();

  const setDirection = (dir) => {
    if (!DIRECTIONS[dir]) return;
    if (OPPOSITE[dir] === state.direction) return;
    state.nextDirection = dir;
  };

  const step = () => {
    if (!state.alive) return;
    state.direction = state.nextDirection;
    const head = state.snake[0];
    const delta = DIRECTIONS[state.direction];
    const next = { x: head.x + delta.x, y: head.y + delta.y };

    if (next.x < 0) next.x = size - 1;
    if (next.y < 0) next.y = size - 1;
    if (next.x >= size) next.x = 0;
    if (next.y >= size) next.y = 0;

    if (state.snake.some((segment) => segment.x === next.x && segment.y === next.y)) {
      state.alive = false;
      return;
    }

    state.snake.unshift(next);

    const foodIndex = state.foods.findIndex(
      (food) => food.x === next.x && food.y === next.y
    );
    if (foodIndex >= 0) {
      state.score += 1;
      state.foods.splice(foodIndex, 1);
      ensureFoods();
    } else {
      state.snake.pop();
    }
  };

  const reset = () => {
    state.snake = [
      { x: Math.floor(size / 2), y: Math.floor(size / 2) },
      { x: Math.floor(size / 2) - 1, y: Math.floor(size / 2) },
    ];
    state.direction = "right";
    state.nextDirection = "right";
    state.score = 0;
    state.alive = true;
    state.foods = [];
    ensureFoods();
  };

  return { state, step, setDirection, reset };
}

function setupUI() {
  const canvas = document.getElementById("board");
  const scoreValue = document.getElementById("scoreValue");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayText = document.getElementById("overlayText");
  const startBtn = document.getElementById("startBtn");
  const restartBtn = document.getElementById("restartBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const resumeBtn = document.getElementById("resumeBtn");
  const dirButtons = Array.from(document.querySelectorAll(".dir"));

  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");

  const game = createGame({ gridSize: CONFIG.gridSize });
  const headImage = new Image();
  const foodImage = new Image();
  let headReady = false;
  let foodReady = false;
  headImage.onload = () => {
    headReady = true;
  };
  foodImage.onload = () => {
    foodReady = true;
  };
  headImage.src = "img/mokio.webp";
  foodImage.src = "img/ball.webp";
  let running = false;
  let lastTime = 0;
  let accumulator = 0;

  const setOverlay = (show, title = "", text = "") => {
    overlay.classList.toggle("show", show);
    if (title) overlayTitle.textContent = title;
    if (text) overlayText.textContent = text;
  };

  const start = () => {
    if (!game.state.alive) {
      game.reset();
    }
    running = true;
    setOverlay(false);
  };

  const pause = () => {
    running = false;
    if (game.state.alive) {
      setOverlay(true, "Paused", "Press resume to continue.");
    }
  };

  const resume = () => {
    if (game.state.alive) {
      running = true;
      setOverlay(false);
    }
  };

  const restart = () => {
    game.reset();
    running = true;
    setOverlay(false);
  };

  const draw = () => {
    ctx.fillStyle = "#2a7c3f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cell = canvas.width / game.state.gridSize;
    const fieldMargin = cell * 0.5;
    const fieldX = fieldMargin;
    const fieldY = fieldMargin;
    const fieldW = canvas.width - fieldMargin * 2;
    const fieldH = canvas.height - fieldMargin * 2;

    for (let i = 0; i < 8; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? "#348f49" : "#2d8442";
      ctx.fillRect(fieldX, fieldY + (fieldH / 8) * i, fieldW, fieldH / 8);
    }

    ctx.strokeStyle = "rgba(255,255,255,0.92)";
    ctx.lineWidth = 3;
    ctx.strokeRect(fieldX, fieldY, fieldW, fieldH);

    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, fieldY);
    ctx.lineTo(canvas.width / 2, fieldY + fieldH);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, cell * 2.2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fill();

    const boxDepth = cell * 3;
    const boxWidth = cell * 6;
    const goalDepth = cell * 1.3;
    const goalWidth = cell * 2.8;
    const topBoxY = canvas.height / 2 - boxWidth / 2;

    ctx.strokeRect(fieldX, topBoxY, boxDepth, boxWidth);
    ctx.strokeRect(fieldX + fieldW - boxDepth, topBoxY, boxDepth, boxWidth);
    ctx.strokeRect(fieldX, canvas.height / 2 - goalWidth / 2, goalDepth, goalWidth);
    ctx.strokeRect(
      fieldX + fieldW - goalDepth,
      canvas.height / 2 - goalWidth / 2,
      goalDepth,
      goalWidth
    );

    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    for (let i = 1; i < game.state.gridSize; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * cell, 0);
      ctx.lineTo(i * cell, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cell);
      ctx.lineTo(canvas.width, i * cell);
      ctx.stroke();
    }

    game.state.foods.forEach((food) => {
      const fx = food.x * cell + 2;
      const fy = food.y * cell + 2;
      const fsize = cell - 4;
      if (foodReady) {
        ctx.drawImage(foodImage, fx, fy, fsize, fsize);
      } else {
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--food");
        ctx.fillRect(fx, fy, fsize, fsize);
      }
    });

    game.state.snake.forEach((segment, idx) => {
      const x = segment.x * cell + 1;
      const y = segment.y * cell + 1;
      const size = cell - 2;
      if (idx === 0 && headReady) {
        const headScale = window.matchMedia("(max-width: 600px)").matches ? 1 : 2;
        const headSize = size * headScale;
        const radius = headSize / 2;
        const centerX = x + size / 2;
        const centerY = y + size / 2;
        const drawX = centerX - radius;
        const drawY = centerY - radius;
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(headImage, drawX, drawY, headSize, headSize);
        ctx.restore();
        ctx.strokeStyle = "rgba(0, 0, 0, 0.12)";
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle =
          idx === 0
            ? getComputedStyle(document.documentElement).getPropertyValue("--snake-head")
            : getComputedStyle(document.documentElement).getPropertyValue("--snake");
        ctx.fillRect(x, y, size, size);
      }
    });
  };

  const updateScore = () => {
    scoreValue.textContent = String(game.state.score);
  };

  const handleGameOver = () => {
    running = false;
    setOverlay(true, "Game Over", "Press restart to try again.");
  };

  const tick = (time) => {
    if (!lastTime) lastTime = time;
    const delta = time - lastTime;
    lastTime = time;
    accumulator += delta;

    while (accumulator >= CONFIG.tickMs) {
      if (running) {
        game.step();
        updateScore();
        if (!game.state.alive) {
          handleGameOver();
          break;
        }
      }
      accumulator -= CONFIG.tickMs;
    }

    draw();
    requestAnimationFrame(tick);
  };

  const onKey = (event) => {
    const key = event.key.toLowerCase();
    if (key === "arrowup" || key === "w") game.setDirection("up");
    if (key === "arrowdown" || key === "s") game.setDirection("down");
    if (key === "arrowleft" || key === "a") game.setDirection("left");
    if (key === "arrowright" || key === "d") game.setDirection("right");
    if (key === " ") {
      event.preventDefault();
      if (!running && game.state.alive) {
        resume();
      } else if (running) {
        pause();
      }
    }
  };

  document.addEventListener("keydown", onKey);
  startBtn.addEventListener("click", start);
  restartBtn.addEventListener("click", restart);
  pauseBtn.addEventListener("click", pause);
  resumeBtn.addEventListener("click", resume);
  dirButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const dir = btn.dataset.dir;
      if (dir) game.setDirection(dir);
    });
  });

  setOverlay(true, "Press Start", "Use arrow keys or WASD to move.");
  updateScore();
  requestAnimationFrame(tick);
}

setupUI();
