// ── DOM refs ──────────────────────────────────────────────────────────────────
const preferSharpBtn   = document.getElementById("preferSharpBtn");
const preferFlatBtn    = document.getElementById("preferFlatBtn");
const keySelectEl      = document.getElementById("keySelect");
const micRomanEl       = document.getElementById("micRomanNumeral");
const midiRomanEl      = document.getElementById("midiRomanNumeral");

// Mic tab
const micPanel        = document.getElementById("tab-mic");
const startBtn        = document.getElementById("startBtn");
const stopBtn         = document.getElementById("stopBtn");
const statusEl        = document.getElementById("statusText");
const resultsEl       = document.getElementById("results");
const chordEl         = document.getElementById("chordName");
const notesEl         = document.getElementById("notesDetected");
const micNotesDetEl   = document.getElementById("micNotesDetected");
const micPianoRoll    = document.getElementById("micPianoRoll");
const micSelect       = document.getElementById("micSelect");

// MIDI tab
const midiPanel       = document.getElementById("tab-midi");
const midiStartBtn    = document.getElementById("midiStartBtn");
const midiStopBtn     = document.getElementById("midiStopBtn");
const midiStatusEl    = document.getElementById("midiStatusText");
const midiChordEl     = document.getElementById("midiChordName");
const midiNotesEl     = document.getElementById("midiNotesDisplay");
const midiNotesDetEl  = document.getElementById("midiNotesDetected");
const midiResultsEl   = document.getElementById("midiResults");
const midiDeviceRow   = document.getElementById("midiDeviceRow");
const midiPianoRoll   = document.getElementById("midiPianoRoll");

// ── Shared state ──────────────────────────────────────────────────────────────
let accidentalPreference = "sharp";
let selectedKey   = null; // { pc, mode } or null
let lastNotes     = null;
let lastMidiNotes = [];

// ── Tabs ──────────────────────────────────────────────────────────────────────
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll(".tab-btn").forEach(b =>
      b.classList.toggle("active", b.dataset.tab === tab)
    );
    micPanel.classList.toggle("active",  tab === "mic");
    midiPanel.classList.toggle("active", tab === "midi");
    if (tab !== "mic" && isListening) stopBtn.click();
    if (tab === "mic" && !micTabInitialized) {
      micTabInitialized = true;
      populateMicList();
    }
  });
});

// ── Key selector ─────────────────────────────────────────────────────────────
(function populateKeySelector() {
  const frag = document.createDocumentFragment();
  const majorGroup = document.createElement("optgroup");
  majorGroup.label = "Major";
  const minorGroup = document.createElement("optgroup");
  minorGroup.label = "Minor";
  for (const key of ALL_KEYS) {
    const opt = document.createElement("option");
    opt.value = `${key.pc}-${key.mode}`;
    opt.textContent = key.label;
    (key.mode === "major" ? majorGroup : minorGroup).appendChild(opt);
  }
  keySelectEl.appendChild(majorGroup);
  keySelectEl.appendChild(minorGroup);
})();

keySelectEl.addEventListener("change", () => {
  const val = keySelectEl.value;
  if (!val) {
    selectedKey = null;
  } else {
    const [pc, mode] = val.split("-");
    selectedKey = { pc: +pc, mode };
  }
  if (lastNotes)            renderResult(lastNotes);
  if (lastMidiNotes.length) onMidiNotesChange(lastMidiNotes);
  if (!lastNotes)           micRomanEl.textContent = "";
  if (!lastMidiNotes.length) midiRomanEl.textContent = "";
});

// ── Accidental preference ─────────────────────────────────────────────────────
preferSharpBtn.addEventListener("click", () => setAccidentalPreference("sharp"));
preferFlatBtn.addEventListener("click",  () => setAccidentalPreference("flat"));

function setAccidentalPreference(pref) {
  accidentalPreference = pref;
  preferSharpBtn.classList.toggle("active", pref === "sharp");
  preferFlatBtn.classList.toggle("active",  pref === "flat");
  if (lastNotes)            renderResult(lastNotes);
  if (lastMidiNotes.length) onMidiNotesChange(lastMidiNotes);
}

// ── Piano roll ────────────────────────────────────────────────────────────────
const PIANO_LOW  = 36;  // C2
const PIANO_HIGH = 96;  // C7
const IS_WHITE   = [true,false,true,false,true,true,false,true,false,true,false,true];
// Left-edge x in white-key units for each pitch class within an octave
const PC_X       = [0, 0.65, 1, 1.65, 2, 3, 3.65, 4, 4.65, 5, 5.65, 6];
const NUM_WHITE  = 36; // C2 through C7 inclusive

function pianoKeyX(midi, kw) {
  const oct = Math.floor((midi - PIANO_LOW) / 12);
  return (oct * 7 + PC_X[midi % 12]) * kw;
}

function drawPiano(canvas, highlightedMidi) {
  const W = canvas.offsetWidth;
  if (!W) return;
  canvas.width = W;
  const H = canvas.height;
  const ctx = canvas.getContext("2d");
  const kw = W / NUM_WHITE;
  const bw = kw * 0.55;
  const bh = H * 0.64;
  const lit = new Set(highlightedMidi);

  ctx.clearRect(0, 0, W, H);

  // White keys
  for (let m = PIANO_LOW; m <= PIANO_HIGH; m++) {
    if (!IS_WHITE[m % 12]) continue;
    const x = pianoKeyX(m, kw);
    ctx.fillStyle = lit.has(m) ? "#6EA763" : "#FFFBEF";
    ctx.fillRect(x + 0.5, 0.5, kw - 1, H - 1);
    ctx.strokeStyle = "#E3D6A4";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, 0.5, kw - 1, H - 1);
  }

  // Black keys on top
  for (let m = PIANO_LOW; m <= PIANO_HIGH; m++) {
    if (IS_WHITE[m % 12]) continue;
    const x = pianoKeyX(m, kw);
    ctx.fillStyle = lit.has(m) ? "#4F7E47" : "#3A3424";
    ctx.fillRect(x, 0, bw, bh);
  }
}

// ── Microphone ────────────────────────────────────────────────────────────────
let audioCtx, analyser, sourceNode, animFrame, currentStream;
let isListening = false;
let micTabInitialized = false;

async function populateMicList() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const mics = devices.filter(d => d.kind === "audioinput");
    const prev = micSelect.value;
    micSelect.innerHTML = "";
    mics.forEach((d, i) => {
      const opt = document.createElement("option");
      opt.value = d.deviceId;
      opt.textContent = d.label || `Microphone ${i + 1}`;
      micSelect.appendChild(opt);
    });
    if (prev && mics.some(d => d.deviceId === prev)) micSelect.value = prev;
  } catch (e) {
    console.error("Could not list microphones:", e);
  }
}

navigator.mediaDevices.addEventListener?.("devicechange", () => {
  if (micTabInitialized) populateMicList();
});

micSelect.addEventListener("change", () => {
  if (isListening) startCapture();
});

startBtn.addEventListener("click", startCapture);

async function startCapture() {
  try {
    cancelAnimationFrame(animFrame);
    if (currentStream) currentStream.getTracks().forEach(t => t.stop());
    if (audioCtx && audioCtx.state !== "closed") await audioCtx.close();

    audioCtx = new AudioContext();
    if (audioCtx.state === "suspended") await audioCtx.resume();

    const deviceId = micSelect.value;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      video: false,
    });
    currentStream = stream;

    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 8192;
    analyser.smoothingTimeConstant = 0.6;
    sourceNode = audioCtx.createMediaStreamSource(stream);
    sourceNode.connect(analyser);

    isListening = true;
    startBtn.disabled = true;
    stopBtn.disabled  = false;
    resultsEl.hidden  = false;
    statusEl.textContent = "Listening… play a chord!";
    statusEl.style.color = "";
    voteStart = performance.now();

    populateMicList();
    drawPiano(micPianoRoll, []);
    loop();
  } catch (e) {
    console.error("Mic init failed:", e);
    statusEl.textContent = `Mic error: ${e.name} — ${e.message}`;
    statusEl.style.color = "#f87171";
  }
}

stopBtn.addEventListener("click", () => {
  cancelAnimationFrame(animFrame);
  if (currentStream) currentStream.getTracks().forEach(t => t.stop());
  if (audioCtx && audioCtx.state !== "closed") audioCtx.close();
  isListening = false;
  startBtn.disabled = false;
  stopBtn.disabled  = true;
  statusEl.textContent = "Stopped.";
  resultsEl.hidden = true;
  lastNotes = null;
});

const VOTE_WINDOW_MS     = 300;
const ANALYSIS_INTERVAL_MS = 50;
let voteAccumulator = {};
let voteStart = 0;
let lastAnalysis = 0;

function loop(ts = 0) {
  animFrame = requestAnimationFrame(loop);
  if (ts - lastAnalysis < ANALYSIS_INTERVAL_MS) return;
  lastAnalysis = ts;

  const rawNotes = detectNotes(analyser);
  // Update piano with raw detected notes on every frame
  drawPiano(micPianoRoll, rawNotes.map(n => n.midi));

  if (rawNotes.length >= 2) {
    const key = rawNotes.map(n => n.midi % 12).sort((a, b) => a - b).join(",");
    voteAccumulator[key] = (voteAccumulator[key] || 0) + 1;
    voteAccumulator[key + "_notes"] = rawNotes;
  }
  if (ts - voteStart >= VOTE_WINDOW_MS) {
    commitVotes();
    voteAccumulator = {};
    voteStart = ts;
  }
}

function commitVotes() {
  let bestKey = null, bestCount = 0;
  for (const [k, v] of Object.entries(voteAccumulator)) {
    if (k.endsWith("_notes")) continue;
    if (v > bestCount) { bestCount = v; bestKey = k; }
  }
  if (!bestKey) {
    chordEl.textContent = "";
    micRomanEl.textContent = "";
    notesEl.textContent = "";
    micNotesDetEl.style.visibility = "hidden";
    document.getElementById("notation").innerHTML = "";
    return;
  }
  const notes = voteAccumulator[bestKey + "_notes"];
  if (notes) { lastNotes = notes; renderResult(notes); }
}

function toMusicSymbols(str) {
  return str.replace(/#/g, "♯").replace(/b/g, "♭");
}

function renderResult(notes) {
  const chord = recognizeChord(notes, accidentalPreference);
  const displayNames = notes.map(n => midiToNoteName(n.midi, accidentalPreference));

  if (chord) {
    chordEl.textContent = toMusicSymbols(chord.chord);
    micRomanEl.textContent = selectedKey
      ? getRomanNumeral(chord, selectedKey.pc, selectedKey.mode)
      : "";
    notesEl.textContent = toMusicSymbols(displayNames.join(", "));
    micNotesDetEl.style.visibility = "visible";
    statusEl.textContent = "Chord detected!";
    renderChordNotation(chord);
  } else if (notes.length >= 2) {
    chordEl.textContent = "?";
    micRomanEl.textContent = "";
    notesEl.textContent = toMusicSymbols(displayNames.join(", "));
    micNotesDetEl.style.visibility = "visible";
    statusEl.textContent = "Notes detected (chord unknown)";
    document.getElementById("notation").innerHTML = "";
  } else {
    chordEl.textContent = "";
    micRomanEl.textContent = "";
    notesEl.textContent = "";
    micNotesDetEl.style.visibility = "hidden";
    statusEl.textContent = "Listening… play a chord!";
  }
}

// ── MIDI ──────────────────────────────────────────────────────────────────────
let midiRunning = false;

midiStartBtn.addEventListener("click", async () => {
  if (midiRunning) return;
  midiStartBtn.disabled = true;
  midiStatusEl.textContent = "Requesting MIDI access…";
  midiStatusEl.style.color = "";

  const ok = await initMidi(onMidiNotesChange);
  if (!ok) {
    midiStatusEl.textContent = "Web MIDI not supported. Try Chrome or Edge.";
    midiStatusEl.style.color = "#f87171";
    midiStartBtn.disabled = false;
    return;
  }

  midiRunning = true;
  midiStartBtn.disabled = true;
  midiStopBtn.disabled  = false;
  midiDeviceRow.style.display = "flex";
  midiResultsEl.style.display = "flex";
  midiStatusEl.textContent = "Play notes on your keyboard.";
  drawPiano(midiPianoRoll, []);
});

midiStopBtn.addEventListener("click", () => {
  stopMidi();
  midiRunning = false;
  midiStartBtn.disabled = false;
  midiStopBtn.disabled  = true;
  midiDeviceRow.style.display = "none";
  midiResultsEl.style.display = "none";
  midiChordEl.textContent = "";
  midiRomanEl.textContent = "";
  midiNotesEl.textContent = "";
  midiStatusEl.textContent = 'Click "Start Analyzing" to begin.';
  document.getElementById("midiNotation").innerHTML = "";
  lastMidiNotes = [];
});

document.getElementById("midiSelect").addEventListener("change", e => {
  connectMidiInput(e.target.value);
});

function onMidiNotesChange(midiNotes) {
  lastMidiNotes = midiNotes;
  drawPiano(midiPianoRoll, midiNotes);

  if (midiNotes.length === 0) {
    midiChordEl.textContent = "";
    midiRomanEl.textContent = "";
    midiNotesEl.textContent = "";
    midiNotesDetEl.style.visibility = "hidden";
    midiStatusEl.textContent = "Play notes on your keyboard.";
    renderGrandStaffNotation([], accidentalPreference);
    return;
  }

  midiNotesDetEl.style.visibility = "visible";
  const noteObjs = midiNotes.map(m => ({ midi: m }));
  const chord = recognizeChord(noteObjs, accidentalPreference);
  const names = midiNotes.map(m => toMusicSymbols(midiToNoteName(m, accidentalPreference)));

  midiNotesEl.textContent = names.join(", ");
  midiChordEl.textContent = chord
    ? toMusicSymbols(chord.chord)
    : (midiNotes.length >= 2 ? "?" : "");
  midiRomanEl.textContent = (chord && selectedKey)
    ? getRomanNumeral(chord, selectedKey.pc, selectedKey.mode)
    : "";
  midiStatusEl.textContent = chord ? "Chord detected!" : "Listening…";

  renderGrandStaffNotation(midiNotes, accidentalPreference);
}
