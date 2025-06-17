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

// Nickname
let nickname = localStorage.getItem("nickname") || "Guest";
document.getElementById("greeting").innerText = "Halo, " + nickname + "!";

// Data game
let currentPlayer = 1;
let positions = [1, 1];
const snakes = { 40: 1, 24: 6, 54: 27, 85: 65, 91: 73 };
const ladders = { 9: 28, 18: 44, 15: 45, 55: 45, 50: 53, 60: 64, 87: 95 };

// Elemen DOM
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
    pawn.textContent = i === 0 ? "🔴" : "🔵";
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
      if (ladders[positions[idx]]) positions[idx] = ladders[positions[idx]];
      if (snakes[positions[idx]]) positions[idx] = snakes[positions[idx]];
      updatePawns();
      if (positions[idx] === 100) {
        alert(`🏆 Pemain ${currentPlayer} menang!`);
        saveWin(currentPlayer);
        positions = [1, 1];
        updatePawns();
      }
      currentPlayer = currentPlayer === 1 ? 2 : 1;
      turnIndicator.innerText = `Giliran: Pemain ${currentPlayer} ${currentPlayer === 1 ? "🔴" : "🔵"}`;
      rollBtn.disabled = false;
    });
  });
};

function saveWin(player) {
  if (nickname === "Guest") return;
  const statsRef = db.ref("stats/" + nickname);
  statsRef.once("value").then(snapshot => {
    const data = snapshot.val() || { total: 0, menang: 0 };
    data.total += 1;
    if (player === 1) data.menang += 1;
    statsRef.set(data);
  });
}

// Navigasi
document.getElementById("btnLocal").onclick = () => {
  positions = [1, 1];
  currentPlayer = 1;
  updatePawns();
  turnIndicator.innerText = "Giliran: Pemain 1 🔴";
  document.getElementById("menu").style.display = "none";
  document.getElementById("game").style.display = "block";
};

document.getElementById("btnBackGame").onclick = () => {
  document.getElementById("game").style.display = "none";
  document.getElementById("menu").style.display = "block";
};

document.getElementById("btnStatistik").onclick = () => {
  const statsRef = db.ref("stats/" + nickname);
  statsRef.once("value").then(snapshot => {
    const data = snapshot.val();
    document.getElementById("statText").innerText =
      data ? `Nickname: ${nickname}\nMenang: ${data.menang}\nTotal Main: ${data.total}` : "Statistik tidak tersedia";
    document.getElementById("menu").style.display = "none";
    document.getElementById("statScreen").style.display = "block";
  });
};

document.getElementById("btnBackStat").onclick = () => {
  document.getElementById("statScreen").style.display = "none";
  document.getElementById("menu").style.display = "block";
};

document.getElementById("btnLeaderboard").onclick = () => {
  db.ref("stats").once("value").then(snapshot => {
    const data = snapshot.val();
    const sorted = Object.entries(data || {}).sort((a, b) => (b[1].menang || 0) - (a[1].menang || 0));
    const html = sorted.slice(0, 10).map(([name, val], i) =>
      `<div>${i + 1}. ${name} - 🏆 ${val.menang || 0} | 🎮 ${val.total || 0}</div>`
    ).join("");
    document.getElementById("leaderboardList").innerHTML = html || "Leaderboard tidak tersedia";
    document.getElementById("menu").style.display = "none";
    document.getElementById("leaderboardScreen").style.display = "block";
  });
};

document.getElementById("btnBackLeaderboard").onclick = () => {
  document.getElementById("leaderboardScreen").style.display = "none";
  document.getElementById("menu").style.display = "block";
};

document.getElementById("btnGantiNickname").onclick = () => {
  const newNick = prompt("Masukkan nickname baru:");
  if (newNick) {
    nickname = newNick;
    localStorage.setItem("nickname", nickname);
    document.getElementById("greeting").innerText = `Halo, ${nickname}!`;
  }
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
  });
};

function startOnlineGame(roomCode, playerId) {
  // Ganti ke tampilan menu ke tampilan lokal sementara (atau bisa buat gameOnline terpisah)
  document.getElementById("menu").style.display = "none";
  document.getElementById("game").style.display = "block";

  const posRef = db.ref(`rooms/${roomCode}/positions`);
  const turnRef = db.ref(`rooms/${roomCode}/turn`);
  const winRef = db.ref(`rooms/${roomCode}/winner`);

  // Inisialisasi
  posRef.once("value").then(snapshot => {
    if (!snapshot.exists()) posRef.set({ p1: 1, p2: 1 });
  });
  turnRef.once("value").then(snapshot => {
    if (!snapshot.exists()) turnRef.set("p1");
  });

  // Listen perubahan posisi
  posRef.on("value", snapshot => {
    const data = snapshot.val();
    if (data) {
      positions = [data.p1 || 1, data.p2 || 1];
      updatePawns();
    }
  });

  // Listen giliran
  turnRef.on("value", snapshot => {
    const turn = snapshot.val();
    currentPlayer = turn === "p1" ? 1 : 2;
    turnIndicator.innerText = `Giliran: ${turn === "p1" ? "Pemain 1 🔴" : "Pemain 2 🔵"}`;
    rollBtn.disabled = (turn !== playerId);
  });

  // Listen pemenang
  winRef.on("value", snapshot => {
    const winner = snapshot.val();
    if (winner) {
      if (winner === playerId) alert("🏆 Kamu menang!");
      else alert("😢 Kamu kalah!");
      saveWin(winner === playerId ? 1 : 2);
      posRef.set({ p1: 1, p2: 1 });
      winRef.remove();
    }
  });

  // Event dadu online
  rollBtn.onclick = () => {
    rollBtn.disabled = true;
    animateDiceRoll(result => {
      const idx = playerId === "p1" ? 0 : 1;
      let target = positions[idx] + result;
      if (ladders[target]) target = ladders[target];
      if (snakes[target]) target = snakes[target];
      if (target > 100) target = positions[idx];

      const updated = { p1: positions[0], p2: positions[1] };
      updated[playerId] = target;
      posRef.set(updated).then(() => {
        if (target === 100) {
          winRef.set(playerId);
        } else {
          turnRef.set(playerId === "p1" ? "p2" : "p1");
        }
      });
    });
  };
}

// Awal
createBoard();
updatePawns();
turnIndicator.innerText = "Giliran: Pemain 1 🔴";
