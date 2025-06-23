// (1) Setup Firebase
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

// (2) State & DOM
let nickname = localStorage.getItem("nickname") || "Guest";
let currentPlayer = 1;
let positions = [1,1];
let isBotGame = false;
let botTimeout = null;

const snakes = {40:1,24:6,54:27,85:65,91:73};
const ladders = {9:28,18:44,15:45,55:45,50:53,60:64,87:95};

const greeting = document.getElementById("greeting");
const board = document.getElementById("board");
const rollBtn = document.getElementById("rollBtn");
const dice = document.getElementById("dice");
const turnIndicator = document.getElementById("turnIndicator");
const diceSound = document.getElementById("diceSound");
const screens = ["menu","game","statScreen","leaderboardScreen","roomScreen"];

greeting.innerText = "Halo, " + nickname + "!";

// (3) Helper fungsi
function showScreen(id) {
  screens.forEach(s => {
    document.getElementById(s).style.display = (s === id ? "block" : "none");
  });
}

function createBoard() {
  board.innerHTML = "";
  for (let row = 9; row >= 0; row--) {
    for (let col = 0; col < 10; col++) {
      const num = row%2===0 ? row*10+col+1 : row*10+(9-col)+1;
      const square = document.createElement("div");
      square.classList.add("square");
      square.id = "cell-" + num;
      board.appendChild(square);
    }
  }
}

function updatePawns() {
  document.querySelectorAll(".pawn").forEach(p=>p.remove());
  positions.forEach((pos,i)=>{
    const pawn = document.createElement("div");
    pawn.className = "pawn";
    pawn.textContent = i===0 ? "🔴" : (isBotGame?"🤖":"🔵");
    const cell = document.getElementById("cell-"+pos);
    if(cell) cell.appendChild(pawn);
  });
}

function animateDiceRoll(cb) {
  diceSound.play();
  let cnt=0;
  const intr = setInterval(()=>{
    dice.innerText = Math.ceil(Math.random()*6);
    if (++cnt>=10) {
      clearInterval(intr);
      const fin = Math.ceil(Math.random()*6);
      dice.innerText = fin;
      cb(fin);
    }
  }, 100);
}

function animateMove(player,steps,done) {
  let moved=0;
  const mv = setInterval(()=>{
    if(moved<steps && positions[player]<100){
      positions[player]++, updatePawns(), moved++;
    } else {
      clearInterval(mv), done();
    }
  },300);
}

// (4) Roll dadu
rollBtn.onclick = () => {
  rollBtn.disabled = true;
  animateDiceRoll(result => {
    const idx = currentPlayer - 1;
    animateMove(idx, result, ()=>{

      let pos = positions[idx];
      if (ladders[pos]) pos = ladders[pos];
      if (snakes[pos]) pos = snakes[pos];
      positions[idx] = pos;
      updatePawns();

      if (pos===100) {
        alert(`🏆 ${isBotGame?
          (currentPlayer===1?"Kamu":"Bot"):
          `Pemain ${currentPlayer}`} menang!`);
        if(!isBotGame && nickname!=="Guest" && currentPlayer===1) {
          const st = db.ref("stats/"+nickname);
          st.once("value").then(snap=>{
            const d = snap.val()||{total:0,menang:0};
            d.total++; d.menang++;
            st.set(d);
          });
        }
        positions=[1,1];
        updatePawns();
        currentPlayer=1;
        turnIndicator.innerText = "Giliran: Pemain 1 🔴";
        rollBtn.disabled=false;
        return;
      }

      currentPlayer = (currentPlayer===1?2:1);
      turnIndicator.innerText = isBotGame?
        `Giliran: ${currentPlayer===1?"Kamu 🔴":"Bot 🤖"}`:
        `Giliran: Pemain ${currentPlayer} ${currentPlayer===1?"🔴":"🔵"}`;

      if(isBotGame && currentPlayer===2){
        botTimeout = setTimeout(()=>{ if(isBotGame) rollBtn.onclick(); },1000);
      } else {
        rollBtn.disabled=false;
      }
    });
  });
};

// (5) Tombol navigasi
document.getElementById("btnLocal").onclick = ()=>{
  isBotGame=false;
  positions=[1,1]; currentPlayer=1;
  createBoard(); updatePawns();
  turnIndicator.innerText="Giliran: Pemain 1 🔴";
  showScreen("game");
  clearTimeout(botTimeout);
};

document.getElementById("btnBot").onclick = ()=>{
  isBotGame=true;
  positions=[1,1]; currentPlayer=1;
  createBoard(); updatePawns();
  turnIndicator.innerText="Giliran: Kamu 🔴";
  showScreen("game");
};

document.getElementById("btnBackGame").onclick = ()=>{
  showScreen("menu");
  clearTimeout(botTimeout);  // ✨ penting hentikan bot
};

document.getElementById("btnGantiNickname").onclick = ()=>{
  const n=prompt("Masukkan nickname baru:");
  if(n){ nickname=n;
    localStorage.setItem("nickname",n);
    greeting.innerText="Halo, "+n+"!"; }
};

document.getElementById("btnStatistik").onclick = ()=>{
  const st=db.ref("stats/"+nickname);
  st.once("value").then(snap=>{
    const d=snap.val();
    document.getElementById("statText").innerText = d?
      `Nickname: ${nickname}\nMenang: ${d.menang}\nTotal Main: ${d.total}`:
      "Statistik tidak tersedia.";
    showScreen("statScreen");
  });
};

document.getElementById("btnBackStat").onclick = ()=> showScreen("menu");

document.getElementById("btnLeaderboard").onclick = ()=>{
  db.ref("stats").once("value").then(snap=>{
    const all = snap.val();
    const html = Object.entries(all||{}).sort((a,b)=>(b[1].menang||0)-(a[1].menang||0))
      .slice(0,10).map(([nm,v],i)=>`${i+1}. ${nm} - 🏆${v.menang||0} | 🎮${v.total||0}`)
      .join("\n") || "Leaderboard tidak tersedia.";
    document.getElementById("leaderboardList").innerText = html;
    showScreen("leaderboardScreen");
  });
};

document.getElementById("btnBackLeaderboard").onclick = ()=> showScreen("menu");

// (6) Versi awal game online masuk
document.getElementById("btnOnline").onclick = ()=>{
  const roomCode = prompt("Masukkan kode room atau kosong untuk bikin:");
  if(roomCode===null) return;

  const finalRoom = roomCode.trim() || Math.random().toString(36).substring(2,7);
  const rref = db.ref("rooms/"+finalRoom+"/players");

  rref.once("value").then(snap=>{
    const p = snap.val()||{};
    const cnt = Object.keys(p).length;
    if(cnt>=2){ alert("Room sudah penuh!"); return; }

    const pid = cnt===0?"p1":"p2";
    rref.child(pid).set(nickname);
    alert(`Masuk room ${finalRoom} sebagai ${pid}`);
    clearTimeout(botTimeout);

    // Langsung start bila pemain kedua masuk
    if(pid==="p2"){
      isBotGame = false;
      positions=[1,1]; currentPlayer=1;
      createBoard(); updatePawns();
      turnIndicator.innerText="Giliran: Pemain 1 🔴";
      showScreen("game");
    }
    // realtime logic tersisa...
  });
};

// (7) Inisialisasi
createBoard();
updatePawns();
turnIndicator.innerText="Giliran: Pemain 1 🔴";
