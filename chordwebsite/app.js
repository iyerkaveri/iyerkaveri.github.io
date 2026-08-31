// Main app: wires mic → FFT → pitch detection → chord recognition → display
// Also handles MIDI tab: Web MIDI API → held notes → chord recognition → grand staff

// ── DOM refs ────────────────────────────────────────────────────────────────
const startBtn  = document.getElementById("startBtn");
const stopBtn   = document.getElementById("stopBtn");
const statusEl  = document.getElementById("statusText");
const resultsEl = document.getElementById("results");
const chordEl   = document.getElementById("chordName");
const notesEl   = document.getElementById("notesDetected");
const debugPanel = document.getElementById("debugPanel");
const debugToggle = document.getElementById("debugToggle");
const canvas    = document.getElementById("spectrumCanvas");
const canvasCtx = canvas.getContext("2d");
const preferSharpBtn = document.getElementById("preferSharpBtn");
const preferFlatBtn  = document.getElementById("preferFlatBtn");
const micSelect = document.getElementById("micSelect");

// MIDI panel
const midiStartBtn   = document.getElementById("midiStartBtn");
const midiStopBtn    = document.getElementById("midiStopBtn");
const midiStatusEl   = document.getElementById("midiStatusText");
const midiChordEl    = document.getElementById("midiChordName");
const midiNotesEl    = document.getElementById("midiNotesDisplay");
const midiResultsEl  = document.getElementById("midiResults");
const midiDeviceRow  = document.getElementById("midiDeviceRow");

let audioCtx, analyser, sourceNode, animFrame, currentStream;
let accidentalPreference = "sharp";
let lastNotes = null;
let lastMidiNotes = [];
let isListening = false;

// ── Tab switching ────────────────────────────────────────────────────────────
const tabBtns  = document.querySelectorAll(".tab-btn");
const micPanel = document.getElementById("tab-mic");
const midiPanel = document.getElementById("tab-midi");

tabBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    tabBtns.forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
    micPanel.hidden  = tab !== "mic";
    midiPanel.hidden = tab !== "midi";
    if (tab !== "mic" && isListening) stopBtn.click();
  });
});

// ── Accidental preference (shared across tabs) ─────────────────────────────
preferSharpBtn.addEventListener("click", () => setAccidentalPreference("sharp"));
preferFlatBtn.addEventListener("click",  () => setAccidentalPreference("flat"));

function setAccidentalPreference(pref) {
  accidentalPreference = pref;
  preferSharpBtn.classList.toggle("active", pref === "sharp");
  preferFlatBtn.classList.toggle("active",  pref === "flat");
  if (lastNotes)             renderResult(lastNotes);
  if (lastMidiNotes.length)  onMidiNotesChange(lastMidiNotes);
}

// Defer mic device enumeration until mic tab is first opened
let micTabInitialized = false;
tabBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn.dataset.tab === "mic" && !micTabInitialized) {
      micTabInitialized = true;
      populateMicList();
    }
  });
});

// ── Microphone ───────────────────────────────────────────────────────────────
async function populateMicList() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const mics = devices.filter(d => d.kind === "audioinput");
    const previousValue = micSelect.value;
    micSelect.innerHTML = "";
    mics.forEach((d, i) => {
      const opt = document.createElement("option");
      opt.value = d.deviceId;
      opt.textContent = d.label || `Microphone ${i + 1}`;
      micSelect.appendChild(opt);
    });
    if (previousValue && mics.some(d => d.deviceId === previousValue)) {
      micSelect.value = previousValue;
    }
  } catch (e) {
    console.error("Could not list microphones:", e);
  }
}

// populateMicList() is called lazily when mic tab is first opened (above).
navigator.mediaDevices.addEventListener?.("devicechange", () => {
  if (micTabInitialized) populateMicList();
});

micSelect.addEventListener("change", () => {
  if (isListening) startCapture();
});

const VOTE_WINDOW_MS = 300;
const ANALYSIS_INTERVAL_MS = 50;
let voteAccumulator = {};
let voteStart = 0;

debugToggle.addEventListener("change", () => {
  debugPanel.hidden = !debugToggle.checked;
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
});

let lastAnalysis = 0;

function loop(ts = 0) {
  animFrame = requestAnimationFrame(loop);
  if (debugToggle.checked) drawSpectrum();
  if (ts - lastAnalysis < ANALYSIS_INTERVAL_MS) return;
  lastAnalysis = ts;

  const notes = detectNotes(analyser);
  if (notes.length >= 2) {
    const key = notes.map(n => n.midi % 12).sort((a, b) => a - b).join(",");
    voteAccumulator[key] = (voteAccumulator[key] || 0) + 1;
    voteAccumulator[key + "_notes"] = notes;
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
  if (!bestKey) return;
  const notes = voteAccumulator[bestKey + "_notes"];
  if (!notes) return;
  lastNotes = notes;
  renderResult(notes);
}

function toMusicSymbols(str) {
  return str.replace(/#/g, "♯").replace(/b/g, "♭");
}

function renderResult(notes) {
  const chord = recognizeChord(notes, accidentalPreference);
  const displayNames = notes.map(n => midiToNoteName(n.midi, accidentalPreference));
  if (chord) {
    chordEl.textContent = toMusicSymbols(chord.chord);
    notesEl.textContent = toMusicSymbols(displayNames.join(", "));
    statusEl.textContent = "Chord detected!";
    renderChordNotation(chord);
  } else if (notes.length >= 2) {
    chordEl.textContent = "?";
    notesEl.textContent = toMusicSymbols(displayNames.join(", "));
    statusEl.textContent = "Notes detected (chord unknown)";
    document.getElementById("notation").innerHTML = "";
  } else {
    statusEl.textContent = "Listening… play a chord!";
  }
}

function drawSpectrum() {
  const bufLen = analyser.frequencyBinCount;
  const data = new Uint8Array(bufLen);
  analyser.getByteFrequencyData(data);
  const w = canvas.width, h = canvas.height;
  canvasCtx.clearRect(0, 0, w, h);
  canvasCtx.fillStyle = "#FFFBEF";
  canvasCtx.fillRect(0, 0, w, h);
  const maxBin = Math.floor(2000 / (analyser.context.sampleRate / analyser.fftSize));
  const barW = w / maxBin;
  for (let i = 0; i < maxBin; i++) {
    const v = data[i] / 255;
    const barH = v * h;
    canvasCtx.fillStyle = `hsl(95, ${30 + v * 25}%, ${75 - v * 45}%)`;
    canvasCtx.fillRect(i * barW, h - barH, Math.max(barW - 1, 1), barH);
  }
}

// ── MIDI ─────────────────────────────────────────────────────────────────────
function onMidiNotesChange(midiNotes) {
  lastMidiNotes = midiNotes;
  if (midiNotes.length === 0) {
    midiChordEl.textContent = "—";
    midiNotesEl.textContent = "—";
    midiStatusEl.textContent = "Play notes on your keyboard.";
    renderGrandStaffNotation([], accidentalPreference);
    return;
  }

  const noteObjs = midiNotes.map(m => ({ midi: m }));
  const chord = recognizeChord(noteObjs, accidentalPreference);
  const names = midiNotes.map(m => toMusicSymbols(midiToNoteName(m, accidentalPreference)));

  midiNotesEl.textContent = names.join(", ");
  midiChordEl.textContent = chord ? toMusicSymbols(chord.chord) : (midiNotes.length >= 2 ? "?" : "—");
  midiStatusEl.textContent = chord ? "Chord detected!" : "Listening…";

  renderGrandStaffNotation(midiNotes, accidentalPreference);
}

document.getElementById("midiSelect").addEventListener("change", e => {
  connectMidiInput(e.target.value);
});

let midiRunning = false;

midiStartBtn.addEventListener("click", async () => {
  if (midiRunning) return;
  midiStartBtn.disabled = true;
  midiStatusEl.textContent = "Requesting MIDI access…";
  midiStatusEl.style.color = "";

  const ok = await initMidi(onMidiNotesChange);
  if (!ok) {
    midiStatusEl.textContent = "Web MIDI is not supported in this browser. Try Chrome or Edge.";
    midiStatusEl.style.color = "#f87171";
    midiStartBtn.disabled = false;
    return;
  }

  midiRunning = true;
  midiStartBtn.disabled = true;
  midiStopBtn.disabled  = false;
  midiDeviceRow.hidden  = false;
  midiResultsEl.hidden  = false;
  midiStatusEl.textContent = "Play notes on your keyboard.";
});

midiStopBtn.addEventListener("click", () => {
  stopMidi();
  midiRunning = false;
  midiStartBtn.disabled = false;
  midiStopBtn.disabled  = true;
  midiDeviceRow.hidden  = true;
  midiResultsEl.hidden  = true;
  midiChordEl.textContent = "—";
  midiNotesEl.textContent = "—";
  midiStatusEl.textContent = "Click "Start Analyzing" to begin.";
  document.getElementById("midiNotation").innerHTML = "";
});
