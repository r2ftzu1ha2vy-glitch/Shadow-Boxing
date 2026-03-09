// Elements
const status = document.getElementById("status");
const modeText = document.getElementById("mode");
const comboText = document.getElementById("combo");
const coinText = document.getElementById("coins");
const buttons = document.querySelectorAll("#controls button");
const restartBtn = document.getElementById("restart");
const winScreen = document.getElementById("winScreen");
const winText = document.getElementById("winText");
const restartWin = document.getElementById("restartWin");

// Shop
const shopButton = document.getElementById("shopButton");
const shop = document.getElementById("shop");
const closeShop = document.getElementById("closeShop");
const buyArise = document.getElementById("buyArise");
const equipArise = document.getElementById("equipArise");
const resetData = document.getElementById("resetData");
const shopCoins = document.getElementById("shopCoins");

// Cutscene
const cutscene = document.getElementById("cutscene");
const circlePlayer = document.getElementById("circlePlayer");
const circleAI = document.getElementById("circleAI");
const shadowBox = document.getElementById("shadowBox");
const ariseText = document.getElementById("ariseText");

// Gameplay
const allDirs = ["up","down","left","right"];
let available = [...allDirs];
let mode = "attack";
let aiChoice = "";
let playerCombo = 0;
let aiCombo = 0;
let gameOver = false;

// Shadow Coins and finisher
let shadowCoins = 0;
let finisherOwned = false;
let finisherEquipped = false;

// Track AI learning
let playerHistory = { up:0, down:0, left:0, right:0 };
let recentMoves = [];

// --- LocalStorage ---
function saveData() {
  localStorage.setItem("shadowCoins", shadowCoins);
  localStorage.setItem("finisherOwned", finisherOwned);
  localStorage.setItem("finisherEquipped", finisherEquipped);
  localStorage.setItem("playerHistory", JSON.stringify(playerHistory));
}

function loadData() {
  const savedCoins = localStorage.getItem("shadowCoins");
  shadowCoins = savedCoins !== null ? parseInt(savedCoins) : 0;

  const savedOwned = localStorage.getItem("finisherOwned");
  finisherOwned = savedOwned === "true";

  const savedEquipped = localStorage.getItem("finisherEquipped");
  finisherEquipped = savedEquipped === "true";

  const savedHistory = localStorage.getItem("playerHistory");
  if(savedHistory) playerHistory = JSON.parse(savedHistory);

  updateUI();
  updateEquipButton();
}

// Reset localStorage
resetData.addEventListener("click", ()=>{
  localStorage.clear();
  shadowCoins = 60;
  finisherOwned = false;
  finisherEquipped = false;
  playerHistory = { up:0, down:0, left:0, right:0 };
  alert("Data reset!");
  updateUI();
});

// --- AI Pick ---
function aiPick(){
  const minWeight = 1;
  let choices = available.slice();
  const historyWeights = {};
  for(let dir of choices){
    const recentCount = recentMoves.filter(m=>m===dir).length;
    historyWeights[dir] = playerHistory[dir] + recentCount*2 + minWeight;
  }
  if(mode==="attack"){
    const weights = choices.map(dir=>historyWeights[dir]);
    aiChoice = weightedRandom(choices, weights);
  } else {
    const total = choices.reduce((sum,dir)=>sum+historyWeights[dir],0);
    const weights = choices.map(dir=>(total-historyWeights[dir])+minWeight);
    aiChoice = weightedRandom(choices, weights);
  }
}

// Weighted random
function weightedRandom(items, weights){
  const sum = weights.reduce((a,b)=>a+b,0);
  let rnd = Math.random()*sum;
  for(let i=0;i<items.length;i++){
    if(rnd<weights[i]) return items[i];
    rnd -= weights[i];
  }
  return items[items.length-1];
}

// Animate stickman
function animate(el, dir){
  let x=0, y=0;
  if(dir==="up") y=-50;
  if(dir==="down") y=50;
  if(dir==="left") x=-50;
  if(dir==="right") x=50;
  el.style.transform = `translate(${x}px, ${y}px)`;
  setTimeout(()=> el.style.transform="translate(0,0)", 300);
}

// Update UI
function updateUI(){
  modeText.textContent = "MODE: "+mode.toUpperCase();
  comboText.textContent = `Your Combo: ${playerCombo} | AI Combo: ${aiCombo}`;
  coinText.textContent = shadowCoins;
  shopCoins.textContent = shadowCoins;
  buttons.forEach(b=>{
    const d=b.dataset.dir;
    b.classList.toggle("hidden", !available.includes(d));
  });
}

// Lock/reset directions
function lockDir(dir){ available = available.filter(d=>d!==dir); }
function resetDirs(){ available = [...allDirs]; }

// --- Win / Cutscene ---
function endGame(winner, lastMove=null){
  if(finisherEquipped && winner==="YOU" && lastMove==="up"){
    playFinisherCutscene();
  } else {
    gameOver=true;
    winText.textContent = winner+" WINS!";
    winScreen.style.display="flex";
  }
}

// Arise cutscene (circles)
function playFinisherCutscene(){
  cutscene.style.display="flex";
  circlePlayer.style.background="white";
  circleAI.style.background="red";
  shadowBox.style.width="0"; shadowBox.style.height="0";
  ariseText.style.opacity=0;

  setTimeout(()=>{ ariseText.style.opacity=1; }, 500);
  setTimeout(()=>{
    shadowBox.style.width="100%";
    shadowBox.style.height="100%";
    circleAI.style.background="purple";
  }, 1000);
  setTimeout(()=>{
    cutscene.style.display="none";
    gameOver=true;
    winText.textContent="YOU WIN!";
    winScreen.style.display="flex";
  }, 2000);
}

// --- Main Play ---
let canMove=true;
const moveCooldown=500;
function play(move){
  if(gameOver || !canMove || !available.includes(move)) return;
  canMove=false;
  setTimeout(()=> canMove=true, moveCooldown);

  playerHistory[move]++;
  saveData();
  recentMoves.push(move); if(recentMoves.length>3) recentMoves.shift();

  animate(document.getElementById("player"), move);
  animate(document.getElementById("ai"), aiChoice);

  if(mode==="attack"){
    if(move===aiChoice){
      playerCombo++; lockDir(move); shadowCoins+=2; saveData();
      status.textContent=`HIT! ${move.toUpperCase()} locked!`;
      if(playerCombo===3) return endGame("YOU", move);
      aiPick();
    } else {
      resetDirs(); mode="dodge"; aiCombo=0;
      status.textContent="MISS! DEFEND!"; aiPick();
    }
  } else {
    if(move===aiChoice){
      aiCombo++; lockDir(move);
      status.textContent=`AI HIT! ${move.toUpperCase()} locked!`;
      if(aiCombo===3) return endGame("AI", move);
      aiPick();
    } else {
      resetDirs(); mode="attack"; playerCombo=0;
      status.textContent="DODGED! ATTACK!"; aiPick();
    }
  }
  updateUI();
}

// --- Buttons ---
buttons.forEach(b=>b.addEventListener("click", ()=>play(b.dataset.dir)));
document.addEventListener("keydown", e=>{
  const k=e.key.toLowerCase();
  if(["arrowup","arrowdown","arrowleft","arrowright","w","a","s","d"].includes(k)) e.preventDefault();
  if(k==="arrowup"||k==="w") play("up");
  if(k==="arrowdown"||k==="s") play("down");
  if(k==="arrowleft"||k==="a") play("left");
  if(k==="arrowright"||k==="d") play("right");
});

// Restart
restartBtn.addEventListener("click", ()=>{
  winScreen.style.display="none"; mode="attack"; playerCombo=0; aiCombo=0; gameOver=false;
  resetDirs(); status.textContent="Choose a direction!"; aiPick(); updateUI();
});
restartWin.addEventListener("click", ()=>{
  winScreen.style.display="none"; mode="attack"; playerCombo=0; aiCombo=0; gameOver=false;
  resetDirs(); status.textContent="Choose a direction!"; aiPick(); updateUI();
});

// Shop buttons
shopButton.addEventListener("click", ()=>{ shop.style.display="flex"; });
closeShop.addEventListener("click", ()=>{ shop.style.display="none"; });

buyArise.addEventListener("click", ()=>{
  if(shadowCoins>=60 && !finisherOwned){
    shadowCoins-=60; finisherOwned=true; finisherEquipped=false;
    alert("You bought Arise!");
    saveData(); updateUI(); updateEquipButton();
  } else if(finisherOwned){ alert("You already own it!"); }
  else alert("Not enough Shadow Coins!");
});

function updateEquipButton(){
  if(finisherOwned){
    equipArise.classList.remove("hidden");
    equipArise.textContent = finisherEquipped ? "Unequip Arise" : "Equip Arise";
  } else {
    equipArise.classList.add("hidden");
  }
}

equipArise.addEventListener("click", ()=>{
  finisherEquipped = !finisherEquipped;
  updateEquipButton();
  saveData();
});

// Start
loadData();
aiPick();
updateUI();
