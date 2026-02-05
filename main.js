// =========================
// 오라형 뱀서 미니게임 - 설정/상수
// =========================
const CONFIG = {
    CANVAS_WIDTH: 900,
    CANVAS_HEIGHT: 540,
    TIME_LIMIT_MS: 180_000,
    PLAYER: {
      MAX_HP: 100,
      SPEED: 220,
      PICKUP_RADIUS: 60,
      AURA_RADIUS: 90,
      AURA_DAMAGE: 1,
      AURA_TICK_MS: 450,
    },
    ENEMY: {
      HP: 4,
      DAMAGE: 6,
      CONTACT_COOLDOWN_MS: 300,
      SPAWN_INTERVAL_START: 1200,
      SPAWN_INTERVAL_MIN: 420,
      SPEED_START: 70,
      SPEED_MAX: 150,
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
  const pauseOverlay = document.getElementById("pauseOverlay");
  const endOverlay = document.getElementById("endOverlay");
  const endTitle = document.getElementById("endTitle");
  const endDesc = document.getElementById("endDesc");
  const startButton = document.getElementById("startButton");
  const restartButton = document.getElementById("restartButton");
  const upgradeCards = document.getElementById("upgradeCards");
  
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
    level: 1,
    xp: 0,
    xpToNext: CONFIG.XP.BASE_TO_NEXT,
  };
  
  const enemies = [];
  const gems = [];
  let nextEnemySpawn = CONFIG.ENEMY.SPAWN_INTERVAL_START;
  let enemySpawnTimer = 0;
  let auraTimer = 0;
  
  // =========================
  // 업그레이드 정의
  // =========================
  const upgrades = [
    {
      id: "AURA_RANGE",
      title: "오라 범위 +20%",
      desc: "오라 범위를 늘려 더 멀리서 적을 태웁니다.",
      apply: () => {
        player.auraRadius *= 1.2;
      },
    },
    {
      id: "AURA_DAMAGE",
      title: "오라 피해 +1",
      desc: "오라의 틱당 피해가 증가합니다.",
      apply: () => {
        player.auraDamage += 1;
      },
    },
    {
      id: "AURA_TICK",
      title: "오라 틱 -10%",
      desc: "오라가 더 자주 피해를 줍니다.",
      apply: () => {
        player.auraTickMs = Math.max(140, player.auraTickMs * 0.9);
      },
    },
    {
      id: "MOVE_SPEED",
      title: "이동 속도 +10%",
      desc: "조금 더 빠르게 움직입니다.",
      apply: () => {
        player.speed *= 1.1;
      },
    },
    {
      id: "MAX_HP",
      title: "최대 HP +10",
      desc: "최대 HP가 증가하며 현재 HP도 회복됩니다.",
      apply: () => {
        player.maxHp += 10;
        player.hp += 10;
      },
    },
    {
      id: "XP_GAIN",
      title: "XP 획득 +20%",
      desc: "경험치 젬 가치가 증가합니다.",
      apply: () => {
        player.xpGainMultiplier *= 1.2;
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
  
  startButton.addEventListener("click", () => startGame());
  restartButton.addEventListener("click", () => startGame());
  
  // =========================
  // 게임 제어 함수
  // =========================
  function startGame() {
    resetGame();
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
    player.level = 1;
    player.xp = 0;
    player.xpToNext = CONFIG.XP.BASE_TO_NEXT;
    enemies.length = 0;
    gems.length = 0;
    kills = 0;
    elapsed = 0;
    timeRemaining = CONFIG.TIME_LIMIT_MS;
    enemySpawnTimer = 0;
    auraTimer = 0;
    nextEnemySpawn = CONFIG.ENEMY.SPAWN_INTERVAL_START;
  }
  
  function setState(nextState) {
    gameState = nextState;
    startOverlay.classList.toggle("overlay--show", nextState === State.START);
    pauseOverlay.classList.toggle("overlay--show", nextState === State.PAUSE);
    endOverlay.classList.toggle("overlay--show", nextState === State.END);
  }
  
  // =========================
  // 업데이트 루프
  // =========================
  function update(dt) {
    if (gameState !== State.PLAY) return;
  
    elapsed += dt;
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
      const speed = lerp(CONFIG.ENEMY.SPEED_START, CONFIG.ENEMY.SPEED_MAX, progress);
      enemy.x += (dirX / dist) * speed * (dt / 1000);
      enemy.y += (dirY / dist) * speed * (dt / 1000);
  
      // 접촉 피해 처리 (쿨다운)
      if (dist < 22 && elapsed - enemy.lastHitTime > CONFIG.ENEMY.CONTACT_COOLDOWN_MS) {
        player.hp -= CONFIG.ENEMY.DAMAGE;
        enemy.lastHitTime = elapsed;
      }
    });
  
    // 오라 피해 틱
    auraTimer += dt;
    if (auraTimer >= player.auraTickMs) {
      auraTimer = 0;
      enemies.forEach((enemy) => {
        if (distance(player, enemy) <= player.auraRadius) {
          enemy.hp -= player.auraDamage;
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
        gems.splice(i, 1);
      }
    }
  
    // 레벨업 체크
    if (player.xp >= player.xpToNext) {
      player.xp -= player.xpToNext;
      player.level += 1;
      player.xpToNext = Math.floor(player.xpToNext * CONFIG.XP.GROWTH) + 2;
      openUpgradeSelect();
    }
  
    // 패배 / 승리 체크
    if (player.hp <= 0) {
      endGame("패배", "HP가 0이 되어 쓰러졌습니다.");
    } else if (timeRemaining <= 0) {
      endGame("승리", "180초를 버텨냈습니다!");
    }
  }
  
  // =========================
  // 렌더링
  // =========================
  function render() {
    ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
  
    // 오라
    ctx.beginPath();
    ctx.fillStyle = "rgba(88, 166, 255, 0.12)";
    ctx.strokeStyle = "rgba(88, 166, 255, 0.4)";
    ctx.lineWidth = 2;
    ctx.arc(player.x, player.y, player.auraRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  
    // 플레이어
    ctx.beginPath();
    ctx.fillStyle = "#7c3aed";
    ctx.arc(player.x, player.y, 14, 0, Math.PI * 2);
    ctx.fill();
  
    // 적
    enemies.forEach((enemy) => {
      ctx.beginPath();
      ctx.fillStyle = "#ef4444";
      ctx.arc(enemy.x, enemy.y, 12, 0, Math.PI * 2);
      ctx.fill();
    });
  
    // 젬
    gems.forEach((gem) => {
      ctx.beginPath();
      ctx.fillStyle = "#38bdf8";
      ctx.arc(gem.x, gem.y, 6, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  
  function updateHUD() {
    hpBar.style.width = `${(player.hp / player.maxHp) * 100}%`;
    hpText.textContent = `${Math.max(0, Math.ceil(player.hp))} / ${player.maxHp}`;
    xpBar.style.width = `${(player.xp / player.xpToNext) * 100}%`;
    xpText.textContent = `${Math.floor(player.xp)} / ${player.xpToNext}`;
    levelText.textContent = player.level;
    timeText.textContent = Math.ceil(timeRemaining / 1000);
    killText.textContent = kills;
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
  
    enemies.push({
      x,
      y,
      hp: CONFIG.ENEMY.HP + Math.floor(progress * 2),
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