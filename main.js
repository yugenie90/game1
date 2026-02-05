// =========================
// 오라형 뱀서 미니게임 - 설정/상수
// =========================
const CONFIG = {
  CANVAS_WIDTH: 900,
  CANVAS_HEIGHT: 540,
  TIME_LIMIT_MS: 180_000,
  VISUALS: {
    AURA_PULSE_SPEED: 2.1,
    PLAYER_RADIUS: 14,
    PLAYER_VISUAL_RADIUS: 30,
    GEM_RADIUS: 6,
    BACKGROUND_PATTERN_ALPHA: 0.05,
  },
  PLAYER: {
    MAX_HP: 100,
    SPEED: 220,
    PICKUP_RADIUS: 60,
    AURA_RADIUS: 48,
    AURA_DAMAGE: 1,
    AURA_TICK_MS: 450,
  },
  ENEMY: {
    DAMAGE: 6,
    CONTACT_COOLDOWN_MS: 300,
    SPAWN_INTERVAL_START: 1200,
    SPAWN_INTERVAL_MIN: 420,
    SPEED_START: 60,
    SPEED_MAX: 135,
  },
  XP: {
    BASE_TO_NEXT: 12,
    GROWTH: 1.35,
  },
  GEMS: {
    BASE_VALUE: 6,
  },
};

// =========================
// DOM 참조
// =========================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const hpBar = document.getElementById("hpBar");
const hpText = document.getElementById("hpText");
const xpBar = document.getElementById("xpBar");
const xpText = document.getElementById("xpText");
const levelText = document.getElementById("levelText");
const timeText = document.getElementById("timeText");
const killText = document.getElementById("killText");
const startOverlay = document.getElementById("startOverlay");
const selectOverlay = document.getElementById("selectOverlay");
const pauseOverlay = document.getElementById("pauseOverlay");
const endOverlay = document.getElementById("endOverlay");
const endTitle = document.getElementById("endTitle");
const endDesc = document.getElementById("endDesc");
const startButton = document.getElementById("startButton");
const backButton = document.getElementById("backButton");
const confirmButton = document.getElementById("confirmButton");
const settingsButton = document.getElementById("settingsButton");
const creditsButton = document.getElementById("creditsButton");
const exitButton = document.getElementById("exitButton");
const restartButton = document.getElementById("restartButton");
const upgradeCards = document.getElementById("upgradeCards");
const characterOptions = document.querySelectorAll("[data-character]");
const difficultyOptions = document.querySelectorAll("[data-difficulty]");

// =========================
// 유틸리티 함수
// =========================
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;
const randRange = (min, max) => Math.random() * (max - min) + min;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// =========================
// 게임 상태
// =========================
const State = {
  START: "START",
  SELECT: "SELECT",
  PLAY: "PLAY",
  PAUSE: "PAUSE",
  END: "END",
};

let gameState = State.START;
let lastTime = 0;
let timeRemaining = CONFIG.TIME_LIMIT_MS;
let elapsed = 0;
let kills = 0;

const input = {
  up: false,
  down: false,
  left: false,
  right: false,
};

const player = {
  x: CONFIG.CANVAS_WIDTH / 2,
  y: CONFIG.CANVAS_HEIGHT / 2,
  hp: CONFIG.PLAYER.MAX_HP,
  maxHp: CONFIG.PLAYER.MAX_HP,
  speed: CONFIG.PLAYER.SPEED,
  pickupRadius: CONFIG.PLAYER.PICKUP_RADIUS,
  auraRadius: CONFIG.PLAYER.AURA_RADIUS,
  auraDamage: CONFIG.PLAYER.AURA_DAMAGE,
  auraTickMs: CONFIG.PLAYER.AURA_TICK_MS,
  xpGainMultiplier: 1,
  damageMultiplier: 1,
  level: 1,
  xp: 0,
  xpToNext: CONFIG.XP.BASE_TO_NEXT,
};

const enemies = [];
const gems = [];
let enemySpawnTimer = 0;
let auraTimer = 0;
let auraPulse = 0;
let auraPulseKick = 0;
let nextEnemySpawn = CONFIG.ENEMY.SPAWN_INTERVAL_START;
const floatingTexts = [];
const enemyModifiers = {
  speedMultiplier: 1,
  emailHpMultiplier: 1,
  contactCooldownMultiplier: 1,
};

// 컨셉 리스킨: 향후 확장을 고려한 선택 상태
const selectionState = {
  character: "default",
  difficulty: "normal",
};

// =========================
// 업그레이드 정의
// =========================
const upgrades = [
  {
    id: "AURA_RANGE",
    title: "🪑 자세 고치기",
    desc: "업무 실드 범위 +15%",
    apply: () => {
      player.auraRadius *= 1.15;
    },
  },
  {
    id: "AURA_DAMAGE",
    title: "🧠 정신승리",
    desc: "업무 실드 데미지 +1",
    apply: () => {
      player.auraDamage += 1;
    },
  },
  {
    id: "AURA_TICK",
    title: "☕ 커피 한 잔",
    desc: "오라 공격 주기 -10%",
    apply: () => {
      player.auraTickMs = Math.max(140, player.auraTickMs * 0.9);
    },
  },
  {
    id: "MOVE_SPEED",
    title: "🏃 칼퇴각 재기",
    desc: "이동 속도 +10%",
    apply: () => {
      player.speed *= 1.1;
    },
  },
  {
    id: "MAX_HP",
    title: "📅 일정 미리 끝냄",
    desc: "최대 체력 +15, 즉시 회복",
    apply: () => {
      player.maxHp += 15;
      player.hp += 15;
    },
  },
  {
    id: "XP_GAIN",
    title: "📑 일 잘하는 척",
    desc: "XP 획득량 +20%",
    apply: () => {
      player.xpGainMultiplier *= 1.2;
    },
  },
  {
    id: "ENEMY_SLOW",
    title: "🎧 이어폰 착용",
    desc: "적 이동속도 -10%",
    apply: () => {
      enemyModifiers.speedMultiplier *= 0.9;
    },
  },
  {
    id: "DAMAGE_REDUCE",
    title: "💤 딴생각",
    desc: "받는 데미지 -15%",
    apply: () => {
      player.damageMultiplier *= 0.85;
    },
  },
  {
    id: "EMAIL_WEAK",
    title: "📧 메일 자동분류",
    desc: "이메일 적 체력 -30%",
    apply: () => {
      enemyModifiers.emailHpMultiplier *= 0.7;
    },
  },
  {
    id: "CONTACT_COOLDOWN",
    title: "🔕 알림 무시",
    desc: "접촉 데미지 쿨타임 +50%",
    apply: () => {
      enemyModifiers.contactCooldownMultiplier *= 1.5;
    },
  },
];

// =========================
// 입력 처리
// =========================
window.addEventListener("keydown", (event) => {
  if (["ArrowUp", "KeyW"].includes(event.code)) input.up = true;
  if (["ArrowDown", "KeyS"].includes(event.code)) input.down = true;
  if (["ArrowLeft", "KeyA"].includes(event.code)) input.left = true;
  if (["ArrowRight", "KeyD"].includes(event.code)) input.right = true;
});

window.addEventListener("keyup", (event) => {
  if (["ArrowUp", "KeyW"].includes(event.code)) input.up = false;
  if (["ArrowDown", "KeyS"].includes(event.code)) input.down = false;
  if (["ArrowLeft", "KeyA"].includes(event.code)) input.left = false;
  if (["ArrowRight", "KeyD"].includes(event.code)) input.right = false;
});

startButton.addEventListener("click", () => setState(State.SELECT));
backButton.addEventListener("click", () => setState(State.START));
confirmButton.addEventListener("click", () => startGame());
restartButton.addEventListener("click", () => setState(State.START));
settingsButton.addEventListener("click", () => {
  addFloatingText(CONFIG.CANVAS_WIDTH / 2 - 40, 80, "설정은 준비 중", "#6B7280");
});
creditsButton.addEventListener("click", () => {
  addFloatingText(CONFIG.CANVAS_WIDTH / 2 - 40, 80, "기타 메뉴 준비 중", "#6B7280");
});
exitButton.addEventListener("click", () => {
  addFloatingText(CONFIG.CANVAS_WIDTH / 2 - 20, 80, "업무 화면 복귀", "#6B7280");
});

characterOptions.forEach((button) => {
  button.addEventListener("click", () => {
    selectionState.character = button.dataset.character;
    characterOptions.forEach((option) => option.classList.remove("option--active"));
    button.classList.add("option--active");
  });
});

difficultyOptions.forEach((button) => {
  button.addEventListener("click", () => {
    selectionState.difficulty = button.dataset.difficulty;
    difficultyOptions.forEach((option) => option.classList.remove("option--active"));
    button.classList.add("option--active");
  });
});

// =========================
// 게임 제어 함수
// =========================
function startGame() {
  resetGame();
  applyDifficulty();
  setState(State.PLAY);
}

function resetGame() {
  player.x = CONFIG.CANVAS_WIDTH / 2;
  player.y = CONFIG.CANVAS_HEIGHT / 2;
  player.hp = CONFIG.PLAYER.MAX_HP;
  player.maxHp = CONFIG.PLAYER.MAX_HP;
  player.speed = CONFIG.PLAYER.SPEED;
  player.pickupRadius = CONFIG.PLAYER.PICKUP_RADIUS;
  player.auraRadius = CONFIG.PLAYER.AURA_RADIUS;
  player.auraDamage = CONFIG.PLAYER.AURA_DAMAGE;
  player.auraTickMs = CONFIG.PLAYER.AURA_TICK_MS;
  player.xpGainMultiplier = 1;
  player.damageMultiplier = 1;
  player.level = 1;
  player.xp = 0;
  player.xpToNext = CONFIG.XP.BASE_TO_NEXT;
  enemies.length = 0;
  gems.length = 0;
  floatingTexts.length = 0;
  kills = 0;
  elapsed = 0;
  timeRemaining = CONFIG.TIME_LIMIT_MS;
  enemySpawnTimer = 0;
  auraTimer = 0;
  auraPulse = 0;
  auraPulseKick = 0;
  nextEnemySpawn = CONFIG.ENEMY.SPAWN_INTERVAL_START;
  enemyModifiers.speedMultiplier = 1;
  enemyModifiers.emailHpMultiplier = 1;
  enemyModifiers.contactCooldownMultiplier = 1;
}

function setState(nextState) {
  gameState = nextState;
  startOverlay.classList.toggle("overlay--show", nextState === State.START);
  selectOverlay.classList.toggle("overlay--show", nextState === State.SELECT);
  pauseOverlay.classList.toggle("overlay--show", nextState === State.PAUSE);
  endOverlay.classList.toggle("overlay--show", nextState === State.END);
}

// =========================
// 업데이트 루프
// =========================
function update(dt) {
  if (gameState !== State.PLAY) {
    updateFloatingTexts(dt);
    return;
  }

  elapsed += dt;
  auraPulse += (dt / 1000) * CONFIG.VISUALS.AURA_PULSE_SPEED;
  auraPulseKick = Math.max(0, auraPulseKick - dt / 1000);
  timeRemaining = Math.max(0, timeRemaining - dt);

  const progress = clamp(1 - timeRemaining / CONFIG.TIME_LIMIT_MS, 0, 1);
  nextEnemySpawn = lerp(
    CONFIG.ENEMY.SPAWN_INTERVAL_START,
    CONFIG.ENEMY.SPAWN_INTERVAL_MIN,
    progress
  );

  // 플레이어 이동
  const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const moveY = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const length = Math.hypot(moveX, moveY) || 1;
  player.x += (moveX / length) * player.speed * (dt / 1000);
  player.y += (moveY / length) * player.speed * (dt / 1000);
  player.x = clamp(player.x, 20, CONFIG.CANVAS_WIDTH - 20);
  player.y = clamp(player.y, 20, CONFIG.CANVAS_HEIGHT - 20);

  // 적 스폰
  enemySpawnTimer += dt;
  if (enemySpawnTimer >= nextEnemySpawn) {
    enemySpawnTimer = 0;
    spawnEnemy(progress);
  }

  // 적 이동
  enemies.forEach((enemy) => {
    const dirX = player.x - enemy.x;
    const dirY = player.y - enemy.y;
    const dist = Math.hypot(dirX, dirY) || 1;
    const speedBase = lerp(CONFIG.ENEMY.SPEED_START, CONFIG.ENEMY.SPEED_MAX, progress);
    const speed = speedBase * enemy.speedMultiplier * enemyModifiers.speedMultiplier;
    enemy.x += (dirX / dist) * speed * (dt / 1000);
    enemy.y += (dirY / dist) * speed * (dt / 1000);

    // 접촉 피해 처리 (쿨다운)
    const contactCooldown =
      CONFIG.ENEMY.CONTACT_COOLDOWN_MS * enemyModifiers.contactCooldownMultiplier;
    if (dist < 22 && elapsed - enemy.lastHitTime > contactCooldown) {
      const damage = CONFIG.ENEMY.DAMAGE * enemy.damageMultiplier * player.damageMultiplier;
      player.hp -= damage;
      enemy.lastHitTime = elapsed;
      addFloatingText(player.x, player.y - 18, "-HP", "#9CA3AF");
    }
  });

  // 오라 피해 틱
  auraTimer += dt;
  if (auraTimer >= player.auraTickMs) {
    auraTimer = 0;
    auraPulseKick = 0.3;
    enemies.forEach((enemy) => {
      if (distance(player, enemy) <= player.auraRadius) {
        enemy.hp -= player.auraDamage;
        addFloatingText(enemy.x, enemy.y - 12, "!", "#6B7280");
      }
    });
  }

  // 적 사망 처리
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    if (enemies[i].hp <= 0) {
      const dead = enemies.splice(i, 1)[0];
      kills += 1;
      spawnGem(dead.x, dead.y);
    }
  }

  // 젬 회수
  for (let i = gems.length - 1; i >= 0; i -= 1) {
    if (distance(player, gems[i]) <= player.pickupRadius) {
      player.xp += gems[i].value * player.xpGainMultiplier;
      addFloatingText(gems[i].x, gems[i].y - 12, "+XP", "#60A5FA");
      gems.splice(i, 1);
    }
  }

  updateFloatingTexts(dt);

  // 레벨업 체크
  if (player.xp >= player.xpToNext) {
    player.xp -= player.xpToNext;
    player.level += 1;
    player.xpToNext = Math.floor(player.xpToNext * CONFIG.XP.GROWTH) + 2;
    openUpgradeSelect();
  }

  // 패배 / 승리 체크
  if (player.hp <= 0) {
    endGame("패배", "회의가 하나 더 추가되었습니다.");
  } else if (timeRemaining <= 0) {
    endGame("승리", "오늘도 무사히 퇴근했습니다.");
  }
}

// =========================
// 렌더링
// =========================
function render() {
  ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

  drawBackground();

  // 오라
  ctx.beginPath();
  const pulse = 1 + Math.sin(auraPulse) * 0.02 + auraPulseKick * 0.08;
  const auraAlpha = 0.18 + auraPulseKick * 0.1;
  ctx.fillStyle = `rgba(59, 130, 246, ${auraAlpha.toFixed(2)})`;
  ctx.strokeStyle = "rgba(59, 130, 246, 0.35)";
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 2;
  ctx.arc(player.x, player.y, player.auraRadius * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);

  // 플레이어
  drawPlayer();

  // 적
  enemies.forEach((enemy) => {
    drawEnemy(enemy);
  });

  // 젬
  gems.forEach((gem) => {
    drawGem(gem);
  });

  // 플로팅 텍스트
  floatingTexts.forEach((text) => {
    drawFloatingText(text);
  });
}

function updateHUD() {
  hpBar.style.width = `${(player.hp / player.maxHp) * 100}%`;
  hpText.textContent = `${Math.max(0, Math.ceil(player.hp))} / ${player.maxHp}`;
  xpBar.style.width = `${(player.xp / player.xpToNext) * 100}%`;
  xpText.textContent = `${Math.floor(player.xp)} / ${player.xpToNext}`;
  levelText.textContent = player.level;
  timeText.textContent = formatTime(timeRemaining);
  killText.textContent = kills;
}

function applyDifficulty() {
  if (selectionState.difficulty === "hard") {
    player.maxHp = Math.max(80, player.maxHp - 10);
    player.hp = Math.min(player.hp, player.maxHp);
    enemyModifiers.speedMultiplier *= 1.1;
  }
}

// =========================
// 기타 로직
// =========================
function spawnEnemy(progress) {
  const edge = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;
  if (edge === 0) {
    x = randRange(0, CONFIG.CANVAS_WIDTH);
    y = -20;
  } else if (edge === 1) {
    x = CONFIG.CANVAS_WIDTH + 20;
    y = randRange(0, CONFIG.CANVAS_HEIGHT);
  } else if (edge === 2) {
    x = randRange(0, CONFIG.CANVAS_WIDTH);
    y = CONFIG.CANVAS_HEIGHT + 20;
  } else {
    x = -20;
    y = randRange(0, CONFIG.CANVAS_HEIGHT);
  }

  const enemyType = pickEnemyType();
  const baseHp = enemyType.hp + Math.floor(progress * 2);
  const hp =
    enemyType.id === "email"
      ? Math.ceil(baseHp * enemyModifiers.emailHpMultiplier)
      : baseHp;

  enemies.push({
    x,
    y,
    hp,
    type: enemyType.id,
    speedMultiplier: enemyType.speedMultiplier,
    damageMultiplier: enemyType.damageMultiplier,
    size: enemyType.size,
    lastHitTime: -Infinity,
  });
}

function spawnGem(x, y) {
  gems.push({
    x: clamp(x + randRange(-6, 6), 10, CONFIG.CANVAS_WIDTH - 10),
    y: clamp(y + randRange(-6, 6), 10, CONFIG.CANVAS_HEIGHT - 10),
    value: CONFIG.GEMS.BASE_VALUE,
  });
}

function openUpgradeSelect() {
  setState(State.PAUSE);
  upgradeCards.innerHTML = "";
  const selections = pickRandomUpgrades(3);

  selections.forEach((upgrade) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "card";
    card.innerHTML = `<h3>${upgrade.title}</h3><p>${upgrade.desc}</p>`;
    card.addEventListener("click", () => {
      upgrade.apply();
      setState(State.PLAY);
    });
    upgradeCards.appendChild(card);
  });
}

function pickRandomUpgrades(count) {
  const pool = [...upgrades];
  const picks = [];
  while (picks.length < count && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    picks.push(pool.splice(index, 1)[0]);
  }
  return picks;
}

function endGame(title, description) {
  endTitle.textContent = title;
  endDesc.textContent = `${description} (Kills: ${kills})`;
  setState(State.END);
}

function resizeCanvas() {
  const wrapper = document.querySelector(".canvas-wrap");
  if (!wrapper) return;
  const ratio = CONFIG.CANVAS_WIDTH / CONFIG.CANVAS_HEIGHT;
  const maxWidth = wrapper.clientWidth;
  const width = maxWidth;
  const height = width / ratio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// =========================
// 메인 루프
// =========================
function loop(timestamp) {
  const dt = timestamp - lastTime;
  lastTime = timestamp;

  update(dt);
  render();
  updateHUD();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

// =========================
// 비주얼 유틸리티 (컨셉 리스킨: Office Survivors)
// =========================
function drawBackground() {
  ctx.fillStyle = "#F9FAFB";
  ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

  // 은은한 업무 화면 패턴
  ctx.save();
  ctx.fillStyle = `rgba(148, 163, 184, ${CONFIG.VISUALS.BACKGROUND_PATTERN_ALPHA})`;
  const tileSize = 60;
  for (let y = 16; y < CONFIG.CANVAS_HEIGHT; y += tileSize) {
    for (let x = 16; x < CONFIG.CANVAS_WIDTH; x += tileSize) {
      ctx.fillRect(x, y, 38, 22);
      ctx.fillRect(x + 8, y + 28, 22, 10);
    }
  }
  ctx.restore();
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);

  const bob = Math.sin(auraPulse * 2.2) * 1.5;

  // 의자
  ctx.fillStyle = "#E5E7EB";
  ctx.strokeStyle = "#9CA3AF";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.rect(-14, 8 + bob, 28, 8);
  ctx.fill();
  ctx.stroke();

  // 몸통
  ctx.fillStyle = "#CBD5E1";
  ctx.beginPath();
  ctx.roundRect(-12, -2 + bob, 24, 16, 4);
  ctx.fill();

  // 머리
  ctx.fillStyle = "#E5E7EB";
  ctx.beginPath();
  ctx.arc(0, -10 + bob, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 눈/입
  ctx.fillStyle = "#6B7280";
  ctx.fillRect(-6, -12 + bob, 4, 2);
  ctx.fillRect(2, -12 + bob, 4, 2);
  ctx.fillRect(-2, -6 + bob, 4, 2);

  ctx.restore();
}

function drawEnemy(enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);

  if (enemy.type === "email") {
    drawEmailEnemy(enemy.size);
  } else if (enemy.type === "phone") {
    drawPhoneEnemy(enemy.size);
  } else {
    drawBossEnemy(enemy.size);
  }

  ctx.restore();
}

function drawGem(gem) {
  ctx.save();
  ctx.translate(gem.x, gem.y);

  ctx.beginPath();
  ctx.fillStyle = "#93C5FD";
  ctx.arc(0, 0, CONFIG.VISUALS.GEM_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
  ctx.lineWidth = 1;
  ctx.arc(0, 0, CONFIG.VISUALS.GEM_RADIUS + 2, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function drawEmailEnemy(size) {
  const width = size;
  const height = size * 0.7;
  ctx.fillStyle = "#F3F4F6";
  ctx.strokeStyle = "#9CA3AF";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-width / 2, -height / 2, width, height, 4);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-width / 2, -height / 2);
  ctx.lineTo(0, 0);
  ctx.lineTo(width / 2, -height / 2);
  ctx.stroke();
}

function drawPhoneEnemy(size) {
  ctx.strokeStyle = "#E5E7EB";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, size / 2, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
}

function drawBossEnemy(size) {
  ctx.fillStyle = "#D1D5DB";
  ctx.strokeStyle = "#9CA3AF";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -4, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 넥타이
  ctx.fillStyle = "#9CA3AF";
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.lineTo(-4, 16);
  ctx.lineTo(4, 16);
  ctx.closePath();
  ctx.fill();
}

function drawFloatingText(text) {
  ctx.save();
  ctx.globalAlpha = text.alpha;
  ctx.fillStyle = text.color;
  ctx.font = "12px sans-serif";
  ctx.fillText(text.label, text.x, text.y);
  ctx.restore();
}

function addFloatingText(x, y, label, color) {
  floatingTexts.push({
    x,
    y,
    label,
    color,
    alpha: 1,
    life: 0,
  });
}

function updateFloatingTexts(dt) {
  for (let i = floatingTexts.length - 1; i >= 0; i -= 1) {
    const text = floatingTexts[i];
    text.life += dt;
    text.y -= dt * 0.03;
    text.alpha = Math.max(0, 1 - text.life / 700);
    if (text.life > 700) {
      floatingTexts.splice(i, 1);
    }
  }
}

function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function pickEnemyType() {
  const roll = Math.random();
  if (roll < 0.5) {
    return {
      id: "email",
      hp: 4,
      speedMultiplier: 0.8,
      damageMultiplier: 0.9,
      size: 22,
    };
  }
  if (roll < 0.8) {
    return {
      id: "phone",
      hp: 2,
      speedMultiplier: 1.3,
      damageMultiplier: 0.8,
      size: 18,
    };
  }
  return {
    id: "boss",
    hp: 7,
    speedMultiplier: 0.9,
    damageMultiplier: 1.2,
    size: 26,
  };
}
