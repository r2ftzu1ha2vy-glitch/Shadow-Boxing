// --- DOM Elements ---
const status = document.getElementById("status");
const modeText = document.getElementById("mode");
const pScoreEl = document.getElementById("p-score");
const aiScoreEl = document.getElementById("ai-score");
const coinText = document.getElementById("coin-count");
const shopCoinsText = document.getElementById("shopCoins");
const buttons = document.querySelectorAll(".dir-btn");
const upBtn = document.getElementById("btn-up");
const leftBtn = document.getElementById("btn-left");
const downBtn = document.getElementById("btn-down");
const rightBtn = document.getElementById("btn-right");

const restartBtn = document.getElementById("restart");
const winScreen = document.getElementById("winScreen");
const winText = document.getElementById("winText");
const rewardText = document.getElementById("rewardText");
const restartWin = document.getElementById("restartWin");

// Shop & Inventory
const shopButton = document.getElementById("shopButton");
const shop = document.getElementById("shop");
const closeShop = document.getElementById("closeShop");
const buyArise = document.getElementById("buyArise");
const resetData = document.getElementById("resetData");
const ownedTag = document.getElementById("ownedTag");

const inventoryBtn = document.getElementById("inventoryBtn");
const inventory = document.getElementById("inventory");
const closeInventory = document.getElementById("closeInventory");
const equipSlots = document.querySelectorAll(".equip-slot");

// Cutscene
const cutsceneStage = document.getElementById("cutscene-stage");
const sysText = document.getElementById("sys-text");
const actorPlayer = document.getElementById("actor-player");
const actorEnemy = document.getElementById("actor-enemy");
const ariseBig = document.getElementById("arise-big");

// --- Game State ---
const allDirs = ["up", "down", "left", "right"];
let available = [...allDirs];
let mode = "attack";
let aiChoice = "";
let playerCombo = 0;
let aiCombo = 0;
let gameOver = false;
let canMove = true;

// --- Economy & Inventory ---
let shadowCoins = 0;
let finishersOwned = []; 
let finishersEquipped = { up: null, down: null, left: null, right: null };

// --- AI Logic ---
let moveHistory = []; 

// --- NOTIFICATION SYSTEM ---
function showNotification(msg, type = 'info') {
  const area = document.getElementById("notification-area");
  const note = document.createElement("div");
  note.className = "notification";
  note.innerText = msg;
  if(type === 'error') note.style.borderColor = '#ff3333';
  if(type === 'success') note.style.borderColor = '#00ff88';
  area.appendChild(note);
  setTimeout(() => { note.style.opacity = '0'; setTimeout(() => note.remove(), 300); }, 3000);
}

// --- STORAGE ---
function saveData() {
  localStorage.setItem("shadowCoins", shadowCoins);
  localStorage.setItem("finishersOwned", JSON.stringify(finishersOwned));
  localStorage.setItem("finishersEquipped", JSON.stringify(finishersEquipped));
}

function loadData() {
  const savedCoins = localStorage.getItem("shadowCoins");
  shadowCoins = savedCoins !== null ? parseInt(savedCoins) : 0;
  const savedOwned = localStorage.getItem("finishersOwned");
  finishersOwned = savedOwned ? JSON.parse(savedOwned) : [];
  const savedEquipped = localStorage.getItem("finishersEquipped");
  finishersEquipped = savedEquipped ? JSON.parse(savedEquipped) : { up: null, down: null, left: null, right: null };
  
  updateUI();
  updateShopUI();
  updateInventoryUI();
}

// --- RESET ---
resetData.addEventListener("click", () => {
  if(confirm("Reset all progress?")) {
    localStorage.clear();
    shadowCoins = 0;
    finishersOwned = [];
    finishersEquipped = { up: null, down: null, left: null, right: null };
    showNotification("Data Reset.", "info");
    updateUI();
    updateShopUI();
    updateInventoryUI();
  }
});

// --- AI REACTION LOGIC ---
function calculateAiReaction(playerMove) {
  const weights = {};
  available.forEach(d => weights[d] = 1);
  moveHistory.forEach(m => {
    if (available.includes(m)) {
      weights[m] += 2; 
    }
  });

  const sortedDirs = available.sort((a, b) => weights[b] - weights[a]);
  
  if (mode === "attack") {
    // DEFENSE: AI wants to MAKE YOU MISS
    const predictionScore = weights[playerMove] || 1;
    const dodgeChance = Math.random();
    // High score = predictable move. AI has 80% chance to dodge.
    const dodgeThreshold = predictionScore >= 5 ? 0.8 : 0.3;

    if (dodgeChance < dodgeThreshold) {
      // AI DODGES: Picks a different direction to avoid playerMove
      let potentialDodges = available.filter(d => d !== playerMove);
      if (potentialDodges.length > 0) {
        return potentialDodges[Math.floor(Math.random() * potentialDodges.length)];
      }
    }
    // AI FAILS TO DODGE: Picks playerMove (Result = HIT)
    return playerMove; 
  } else {
    // OFFENSE: AI wants to HIT YOU
    // AI attacks where player dodges most (Predicted)
    return sortedDirs[0];
  }
}

// --- ANIMATION LOGIC ---
function animateAction(el, actionType, moveDir) {
  el.classList.remove("lunge-up", "lunge-down", "lunge-left", "lunge-right");
  el.classList.remove("dodge-down", "dodge-side");
  
  // Reset transform completely before new animation to ensure visual sync
  el.style.transform = ""; 

  void el.offsetWidth;

  if (actionType === "attack") {
    el.classList.add("lunge-" + moveDir);
  } else if (actionType === "dodge") {
    if (moveDir === "down") {
      el.classList.add("dodge-down");
    } else {
      el.classList.add("dodge-side");
    }
  }

  setTimeout(() => {
    el.classList.remove("lunge-up", "lunge-down", "lunge-left", "lunge-right");
    el.classList.remove("dodge-down", "dodge-side");
  }, 250);
}

// --- UI UPDATES ---
function updateUI() {
  modeText.textContent = "MODE: " + mode.toUpperCase();
  pScoreEl.textContent = playerCombo;
  aiScoreEl.textContent = aiCombo;
  coinText.textContent = shadowCoins;
  shopCoinsText.textContent = shadowCoins;

  buttons.forEach(b => {
    const d = b.dataset.dir;
    b.disabled = !available.includes(d);
  });
}

function updateShopUI() {
  const hasArise = finishersOwned.includes("arise");
  if (hasArise) {
    buyArise.classList.add("hidden");
    ownedTag.classList.remove("hidden");
  } else {
    buyArise.classList.remove("hidden");
    buyArise.textContent = shadowCoins >= 60 ? "Buy (60 Coins)" : "Need 60 Coins";
    ownedTag.classList.add("hidden");
  }
}

function updateInventoryUI() {
  equipSlots.forEach(slot => {
    const dir = slot.dataset.dir;
    const skillName = finishersEquipped[dir];
    const icon = slot.querySelector('.skill-icon');
    
    if (skillName) {
      icon.classList.remove('empty');
      icon.classList.add('active');
      icon.innerHTML = '<i class="fas fa-dungeon"></i>'; 
      slot.style.borderColor = "#9d4edd";
    } else {
      icon.classList.add('empty');
      icon.classList.remove('active');
      icon.innerHTML = '<i class="fas fa-ban"></i>';
      slot.style.borderColor = "#444";
    }
  });
}

function lockDir(dir) { available = available.filter(d => d !== dir); }
function resetDirs() { available = [...allDirs]; }

// --- GAMEPLAY ---
function play(move) {
  if (gameOver || !canMove || !available.includes(move)) return;

  canMove = false;
  setTimeout(() => canMove = true, 300);

  moveHistory.push(move);
  if (moveHistory.length > 10) moveHistory.shift();

  aiChoice = calculateAiReaction(move);

  const playerEl = document.getElementById("player");
  const aiEl = document.getElementById("ai");

  if (mode === "attack") {
    animateAction(playerEl, "attack", move);
    // AI Animates in direction of aiChoice (Block or Dodge)
    animateAction(aiEl, "dodge", aiChoice);

    if (move === aiChoice) {
      playerCombo++;
      lockDir(move);
      status.textContent = `HIT! ${move.toUpperCase()} LOCKED!`;
      status.style.color = "#00d2ff";
      
      shadowCoins += 1; 
      saveData();

      if (playerCombo === 3) {
        if (move === "up" && finishersEquipped["up"] === "arise") {
          setTimeout(triggerAriseCutscene, 100);
          return;
        } else {
          endGame("YOU");
          return;
        }
      }
    } else {
      resetDirs();
      mode = "dodge";
      aiCombo = 0;
      playerCombo = 0;
      status.textContent = "DODGED! SWITCH MODE";
      status.style.color = "#ff3333";
    }
  } else {
    animateAction(playerEl, "dodge", move);
    // AI Animates in direction of aiChoice (Attack)
    animateAction(aiEl, "attack", aiChoice);

    if (move === aiChoice) {
      aiCombo++;
      lockDir(move);
      status.textContent = `AI HIT! ${move.toUpperCase()} LOCKED!`;
      status.style.color = "#ff3333";
      if (aiCombo === 3) return endGame("AI");
    } else {
      resetDirs();
      mode = "attack";
      aiCombo = 0;
      status.textContent = "DODGED! ATTACK!";
      status.style.color = "#00d2ff";
    }
  }
  updateUI();
}

function aiPick() {
  if (available.length === 1) aiChoice = available[0];
  else aiChoice = available[Math.floor(Math.random() * available.length)];
}

// --- CUTSCENE ---
function triggerAriseCutscene() {
  gameOver = true;
  document.body.classList.add("cutscene-mode");
  cutsceneStage.classList.remove("hidden");

  sysText.style.opacity = 0;
  actorPlayer.style.opacity = 0;
  actorEnemy.style.opacity = 1;
  ariseBig.className = ""; 
  ariseBig.style.opacity = 0;

  setTimeout(() => {
    sysText.style.opacity = 1; sysText.classList.add("cs-glitch");
  }, 500);

  setTimeout(() => {
    sysText.style.opacity = 0;
    actorPlayer.classList.add("cs-appear");
    const csPlayerStick = actorPlayer.querySelector('.stickman');
    csPlayerStick.classList.add('lunge-up');
  }, 2000);

  setTimeout(() => {
    sysText.textContent = "SHADOW EXTRACT: ARMY"; sysText.style.color = "#9d4edd"; sysText.style.opacity = 1;
  }, 3000);

  setTimeout(() => {
    sysText.style.opacity = 0;
    const csPlayerStick = actorPlayer.querySelector('.stickman');
    csPlayerStick.classList.remove('lunge-up');
    csPlayerStick.classList.add("cs-rise");
  }, 4000);

  setTimeout(() => {
    const csEnemyStick = actorEnemy.querySelector('.stickman');
    csEnemyStick.classList.add("cs-die");
    ariseBig.classList.add("cs-explode");
  }, 5000);

  setTimeout(() => {
    cutsceneStage.classList.add("hidden");
    document.body.classList.remove("cutscene-mode");
    endGame("YOU", true);
  }, 6500);
}

// --- WIN/LOSE ---
function endGame(winner, isFinisher = false) {
  gameOver = true;
  winScreen.classList.remove("hidden");
  
  if (winner === "YOU") {
    winText.textContent = isFinisher ? "SHADOW VICTORY!" : "VICTORY";
    winText.style.color = isFinisher ? "#9d4edd" : "#00d2ff";
    
    const reward = isFinisher ? 20 : 10;
    shadowCoins += reward;
    rewardText.textContent = `Earned ${reward} Coins`;
    showNotification(`Victory! +${reward} Coins`, "success");
    saveData();
  } else {
    winText.textContent = "DEFEAT";
    winText.style.color = "#ff3333";
    rewardText.textContent = "No reward.";
    showNotification("Defeated...", "error");
  }
}

// --- EVENT LISTENERS ---
buttons.forEach(b => b.addEventListener("click", () => play(b.dataset.dir)));

document.addEventListener("keydown", e => {
  const k = e.key.toLowerCase();
  if (["arrowup","w"].includes(k)) play("up");
  if (["arrowdown","s"].includes(k)) play("down");
  if (["arrowleft","a"].includes(k)) play("left");
  if (["arrowright","d"].includes(k)) play("right");
});

shopButton.addEventListener("click", () => { shop.classList.remove("hidden"); updateShopUI(); });
closeShop.addEventListener("click", () => shop.classList.add("hidden"));

buyArise.addEventListener("click", () => {
  if (shadowCoins >= 60) {
    shadowCoins -= 60;
    finishersOwned.push("arise");
    saveData();
    updateShopUI();
    updateUI();
    showNotification("Skill 'Arise' Purchased!", "success");
  } else {
    showNotification("Need 60 Coins!", "error");
  }
});

inventoryBtn.addEventListener("click", () => { inventory.classList.remove("hidden"); updateInventoryUI(); });
closeInventory.addEventListener("click", () => inventory.classList.add("hidden"));

equipSlots.forEach(slot => {
  slot.addEventListener("click", () => {
    const dir = slot.dataset.dir;
    
    if (finishersOwned.includes("arise")) {
      if (dir !== "up") {
        showNotification("Arise can only be equipped to UP!", "error");
        return;
      }

      if (finishersEquipped[dir] === "arise") {
        finishersEquipped[dir] = null; 
        showNotification("Unequipped from " + dir.toUpperCase(), "info");
      } else {
        finishersEquipped[dir] = "arise"; 
        showNotification("Arise Equipped to " + dir.toUpperCase(), "success");
      }
      saveData();
      updateInventoryUI();
    } else {
      showNotification("You don't own any finishers yet!", "error");
    }
  });
});

function restartGame() {
  winScreen.classList.add("hidden");
  mode = "attack";
  playerCombo = 0;
  aiCombo = 0;
  gameOver = false;
  canMove = true;
  resetDirs();
  status.textContent = "Choose a direction to strike!";
  status.style.color = "#aaa";
  moveHistory = []; 
  updateUI();
}

restartBtn.addEventListener("click", restartGame);
restartWin.addEventListener("click", restartGame);

// --- Init ---
loadData();
aiPick();
updateUI();
