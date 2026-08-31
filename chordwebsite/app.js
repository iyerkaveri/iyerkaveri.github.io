// ── DOM refs ──────────────────────────────────────────────────────────────────
const preferSharpBtn = document.getElementById("preferSharpBtn");
const preferFlatBtn  = document.getElementById("preferFlatBtn");

// Mic tab
const micPanel   = document.getElementById("tab-mic");
const startBtn   = document.getElementById("startBtn");
const stopBtn    = document.getElementById("stopBtn");
const statusEl   = document.getElementById("statusText");
const resultsEl  = document.getElementById("results");
const chordEl    = document.getElementById("chordName");
const notesEl    = document.getElementById("notesDetected");
const debugPanel = document.getElementById("debugPanel");
const debugToggle = document.getElementById("debugToggle");
const canvas     = document.getElementById("spectrumCanvas");
const micSelect  = document.getElementById("micSelect");

// MIDI tab
const midiPanel      = document.getElementById("tab-midi");
const midiStartBtn   = document.getElementById("midiStartBtn");
const midiStopBtn    = document.getElementById("midiStopBtn");
const midiStatusEl   = document.getElementById("midiStatusText");
const midiChordEl    = document.getElementById("midiChordName");
const midiNotesEl    = document.getElementById("midiNotesDisplay");
const midiResultsEl  = document.getElementById("midiResults");
const midiDeviceRow  = document.getElementById("midiDeviceRow");

// ── Shared state ──────────────────────────────────────────────────────────────
let accidentalPreference = "sharp";
let lastNotes     = null;
let lastMidiNotes = [];

// ── Tabs ──────────────────────────────────────────────────────────────────────
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;

    // Toggle button styles
    document.querySelectorAll(".tab-btn").forEach(b =>
      b.classList.toggle("active", b.dataset.tab === tab)
    );

    // Show/hide panels
    micPanel.classList.toggle("active",  tab === "mic");
    midiPanel.classList.toggle("active", tab === "midi");

    // Stop mic if switching away
    if (tab !== "mic" && isListening) stopBtn.click();

    // Lazy mic device enumeration
    if (tab === "mic" && !micTabInitialized) {
      micTabInitialized = true;
      populateMicList();
    }
  });
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

const VOTE_WINDOW_MS = 300;
const ANALYSIS_INTERVAL_MS = 50;
let voteAccumulator = {};
let voteStart = 0;
let lastAnalysis = 0;

debugToggle.addEventListener("change", () => {
  debugPanel.hidden = !debugToggle.checked;
});

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
  const canvasCtx = canvas.getContext("2d");
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
  // Render empty staff now that the container has real dimensions.
  renderGrandStaffNotation([], accidentalPreference);
});

midiStopBtn.addEventListener("click", () => {
  stopMidi();
  midiRunning = false;
  midiStartBtn.disabled = false;
  midiStopBtn.disabled  = true;
  midiDeviceRow.style.display = "none";
  midiResultsEl.style.display = "none";
  midiChordEl.textContent = "—";
  midiNotesEl.textContent = "—";
  midiStatusEl.textContent = "Click “Start Analyzing” to begin.";
  document.getElementById("midiNotation").innerHTML = "";
});

document.getElementById("midiSelect").addEventListener("change", e => {
  connectMidiInput(e.target.value);
});

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
  midiChordEl.textContent = chord
    ? toMusicSymbols(chord.chord)
    : (midiNotes.length >= 2 ? "?" : "—");
  midiStatusEl.textContent = chord ? "Chord detected!" : "Listening…";

  renderGrandStaffNotation(midiNotes, accidentalPreference);
}
