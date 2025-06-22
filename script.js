// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDKBpjaKi4h6m7Jk8syIOzSMz36EqdeyPE",
  authDomain: "ulartangga-cf5c1.firebaseapp.com",
  databaseURL: "https://ulartangga-cf5c1-default-rtdb.firebaseio.com",
  projectId: "ulartangga-cf5c1",
  storageBucket: "ulartangga-cf5c1.appspot.com",
  messagingSenderId: "498170302116",
  appId: "1:498170302116:web:fbfe3e13d7e0cb69c06031"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Game state
let nickname = localStorage.getItem("nickname") || "Guest";
let currentPlayer = 1;
let positions = [1, 1];
let isBotGame = false;
let botTimeout = null; // untuk menyimpan ID setTimeout

const snakes = { 40: 1, 24: 6, 54: 27, 85: 65, 91: 73 };
const ladders = { 9: 28, 18: 44, 15: 45, 55: 45, 50: 53, 60: 64, 87: 95 };

// DOM
document.getElementById("greeting").innerText = "Halo, " + nickname + "!";
const board = document.getElementById("board");
const rollBtn = document.getElementById("rollBtn");
const dice = document.getElementById("dice");
const turnIndicator = document.getElementById("turnIndicator");
const diceSound = document.getElementById("diceSound");

function createBoard() {
  board.innerHTML = "";
  for (let row = 9; row >= 0; row--) {
    for (let col = 0; col < 10; col++) {
      const num = row % 2 === 0 ? row * 10 + col + 1 : row * 10 + (9 - col) + 1;
      const square = document.createElement("div");
      square.classList.add("square");
      square.id = "cell-" + num;
      board.appendChild(square);
    }
  }
}

function updatePawns() {
  document.querySelectorAll(".pawn").forEach(p => p.remove());
  positions.forEach((pos, i) => {
    const pawn = document.createElement("div");
    pawn.className = "pawn";
    pawn.textContent = i === 0 ? "🔴" : (isBotGame ? "🤖" : "🔵");
    const cell = document.getElementById("cell-" + pos);
    if (cell) cell.appendChild(pawn);
  });
}

function animateDiceRoll(callback) {
  diceSound.play();
  let count = 0;
  const interval = setInterval(() => {
    dice.innerText = Math.ceil(Math.random() * 6);
    if (++count >= 10) {
      clearInterval(interval);
      const final = Math.ceil(Math.random() * 6);
      dice.innerText = final;
      callback(final);
    }
  }, 100);
}

function animateMove(player, steps, done) {
  let moved = 0;
  const move = setInterval(() => {
    if (moved < steps && positions[player] < 100) {
      positions[player]++;
      updatePawns();
      moved++;
    } else {
      clearInterval(move);
      done();
    }
  }, 300);
}

rollBtn.onclick = () => {
  rollBtn.disabled = true;
  animateDiceRoll(result => {
    const idx = currentPlayer - 1;
    animateMove(idx, result, () => {
      let pos = positions[idx];
      if (ladders[pos]) pos = ladders[pos];
      if (snakes[pos]) pos = snakes[pos];
      positions[idx] = pos;
      updatePawns();

      if (pos === 100) {
        alert(`🏆 ${isBotGame ? (currentPlayer === 1 ? "Kamu" : "Bot") : `Pemain ${currentPlayer}`} menang!`);
        if (!isBotGame && nickname !== "Guest" && currentPlayer === 1) {
          const statsRef = db.ref("stats/" + nickname);
          statsRef.once("value").then(snapshot => {
            const data = snapshot.val() || { total: 0, menang: 0 };
            data.total += 1;
            data.menang += 1;
            statsRef.set(data);
          });
        }
        positions = [1, 1];
        updatePawns();
        currentPlayer = 1;
        turnIndicator.innerText = "Giliran: Pemain 1 🔴";
        rollBtn.disabled = false;
        return;
      }

      currentPlayer = currentPlayer === 1 ? 2 : 1;
      turnIndicator.innerText = isBotGame
        ? `Giliran: ${currentPlayer === 1 ? "Kamu 🔴" : "Bot 🤖"}`
        : `Giliran: Pemain ${currentPlayer} ${currentPlayer === 1 ? "🔴" : "🔵"}`;

      if (isBotGame && currentPlayer === 2) {
  botTimeout = setTimeout(() => {
    if (isBotGame) rollBtn.onclick();
  }, 1000);
} else {
  rollBtn.disabled = false;
      }
    });
  });
};

// Tombol navigasi
document.getElementById("btnLocal").onclick = () => {
  isBotGame = false;
  positions = [1, 1];
  currentPlayer = 1;
  createBoard();
  updatePawns();
  turnIndicator.innerText = "Giliran: Pemain 1 🔴";
  showScreen("game");
};

document.getElementById("btnBot").onclick = () => {
  isBotGame = true;
  positions = [1, 1];
  currentPlayer = 1;
  createBoard();
  updatePawns();
  turnIndicator.innerText = "Giliran: Kamu 🔴";
  showScreen("game");
};

document.getElementById("btnOnline").onclick = () => {
  const roomCode = prompt("Masukkan kode room atau biarkan kosong untuk membuat:");
  if (roomCode === null) return;

  const finalRoom = roomCode.trim() || Math.random().toString(36).substring(2, 7);
  const roomRef = db.ref("rooms/" + finalRoom);
  const playersRef = roomRef.child("players");

  playersRef.once("value").then(snapshot => {
    const players = snapshot.val() || {};
    const playerCount = Object.keys(players).length;

    if (playerCount >= 2) {
      alert("Room sudah penuh!");
      return;
    }

    const playerId = playerCount === 0 ? "p1" : "p2";
    playersRef.child(playerId).set(nickname);

    alert(`Berhasil masuk ke room: ${finalRoom} sebagai ${playerId}`);
    startOnlineGame(finalRoom, playerId);
    isBotGame = false;
clearTimeout(botTimeout);
  });
};

document.getElementById("btnBackGame").onclick = () => {
  showScreen("menu");
  if (botTimeout) clearTimeout(botTimeout); // ✅ Tambahkan ini
};

document.getElementById("btnGantiNickname").onclick = () => {
  const newNick = prompt("Masukkan nickname baru:");
  if (newNick) {
    nickname = newNick;
    localStorage.setItem("nickname", nickname);
    document.getElementById("greeting").innerText = "Halo, " + nickname + "!";
  }
};

document.getElementById("btnStatistik").onclick = () => {
  const statsRef = db.ref("stats/" + nickname);
  statsRef.once("value").then(snapshot => {
    const data = snapshot.val();
    document.getElementById("statText").innerText =
      data ? `Nickname: ${nickname}\nMenang: ${data.menang}\nTotal Main: ${data.total}` : "Statistik tidak tersedia.";
    showScreen("statScreen");
  });
};

document.getElementById("btnBackStat").onclick = () => {
  showScreen("menu");
};

document.getElementById("btnLeaderboard").onclick = () => {
  db.ref("stats").once("value").then(snapshot => {
    const data = snapshot.val();
    const sorted = Object.entries(data || {}).sort((a, b) => (b[1].menang || 0) - (a[1].menang || 0));
    const html = sorted.slice(0, 10).map(([name, val], i) =>
      `<div>${i + 1}. ${name} - 🏆 ${val.menang || 0} | 🎮 ${val.total || 0}</div>`
    ).join("");
    document.getElementById("leaderboardList").innerHTML = html || "Leaderboard tidak tersedia.";
    showScreen("leaderboardScreen");
  });
};

document.getElementById("btnBackLeaderboard").onclick = () => {
  showScreen("menu");
};

function showScreen(screenId) {
  ["menu", "game", "statScreen", "leaderboardScreen"].forEach(id => {
    document.getElementById(id).style.display = id === screenId ? "block" : "none";
  });
}

createBoard();
updatePawns();
turnIndicator.innerText = "Giliran: Pemain 1 🔴";
