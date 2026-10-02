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
    if (tab === "midi" && midiRunning) {
      drawPiano(midiPianoRoll, lastMidiNotes);
      renderMidiDisplay();
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
  if (midiRunning)          renderMidiDisplay();
  if (!lastNotes)           micRomanEl.textContent = "";
});

// ── Accidental preference ─────────────────────────────────────────────────────
preferSharpBtn.addEventListener("click", () => setAccidentalPreference("sharp"));
preferFlatBtn.addEventListener("click",  () => setAccidentalPreference("flat"));

function setAccidentalPreference(pref) {
  accidentalPreference = pref;
  preferSharpBtn.classList.toggle("active", pref === "sharp");
  preferFlatBtn.classList.toggle("active",  pref === "flat");
  if (lastNotes)            renderResult(lastNotes);
  if (midiRunning)          renderMidiDisplay();
}

// ── Piano roll ────────────────────────────────────────────────────────────────
const PIANO_LOW  = 21;   // A0
const PIANO_HIGH = 108;  // C8
const MIDDLE_C   = 60;
const IS_WHITE   = [true,false,true,false,true,true,false,true,false,true,false,true];
const WHITE_LETTERS = ["C",,"D",,"E","F",,"G",,"A",,"B"];

// White-key index of each white key, and for each black key the index of the white key to its right.
const WHITE_INDEX = {};
let NUM_WHITE = 0;
for (let m = PIANO_LOW; m <= PIANO_HIGH; m++) {
  WHITE_INDEX[m] = NUM_WHITE;
  if (IS_WHITE[m % 12]) NUM_WHITE++;
}

function drawPiano(canvas, highlightedMidi) {
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  if (!W) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const kw = W / NUM_WHITE;
  const bw = kw * 0.6;
  const bh = H * 0.6;
  const lit = new Set(highlightedMidi);

  const cs = getComputedStyle(document.documentElement);
  const v = name => cs.getPropertyValue(name).trim();
  const font = getComputedStyle(document.body).fontFamily;

  ctx.clearRect(0, 0, W, H);

  // White keys, with letter names along the bottom (octave number on every C).
  const labelSize = Math.max(6, Math.min(9, kw * 0.75));
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 ${labelSize}px ${font}`;
  for (let m = PIANO_LOW; m <= PIANO_HIGH; m++) {
    if (!IS_WHITE[m % 12]) continue;
    const x = WHITE_INDEX[m] * kw;
    const on = lit.has(m);
    ctx.fillStyle = on ? v("--piano-white-lit") : v("--piano-white-bg");
    ctx.fillRect(x + 0.5, 0.5, kw - 1, H - 1);
    ctx.strokeStyle = v("--piano-border");
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, 0.5, kw - 1, H - 1);

    const isC = m % 12 === 0;
    const label = WHITE_LETTERS[m % 12] + (isC ? Math.floor(m / 12) - 1 : "");
    ctx.fillStyle = on ? v("--piano-label-lit") : (isC ? v("--piano-label-c") : v("--piano-label"));
    // C labels get the room under the black-key line; other letters only when keys are wide enough.
    if (isC || kw >= 9) {
      if (isC && kw < 14) ctx.font = `800 ${labelSize * 0.85}px ${font}`;
      ctx.fillText(label, x + kw / 2, H - 4);
      ctx.font = `700 ${labelSize}px ${font}`;
    }

    if (m === MIDDLE_C) {
      ctx.fillStyle = on ? v("--piano-label-lit") : v("--piano-middle-c");
      ctx.beginPath();
      ctx.arc(x + kw / 2, bh + (H - bh) * 0.35, Math.max(2, kw * 0.22), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Black keys on top, centred over the boundary with the next white key.
  for (let m = PIANO_LOW; m <= PIANO_HIGH; m++) {
    if (IS_WHITE[m % 12]) continue;
    const x = WHITE_INDEX[m] * kw - bw / 2;
    ctx.fillStyle = lit.has(m) ? v("--piano-black-lit") : v("--piano-black-bg");
    ctx.fillRect(x, 0, bw, bh);
  }
}

window.addEventListener("resize", () => {
  drawPiano(micPianoRoll, lastNotes ? lastNotes.map(n => n.midi) : []);
  drawPiano(midiPianoRoll, lastMidiNotes);
});

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
    chordEl.textContent = "";
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
  pedalHeldNotes = null;
  releasedAt.clear();
});

document.getElementById("midiSelect").addEventListener("change", e => {
  connectMidiInput(e.target.value);
});

// Every note sounding under the sustain pedal (held at press + pressed since); null when pedal is up.
let pedalHeldNotes = null;

// Pedal fade: notes released under the pedal fade out on the staff only.
const pedalFadeEl      = document.getElementById("pedalFade");
const pedalFadeValueEl = document.getElementById("pedalFadeValue");
let pedalFadeMs = +pedalFadeEl.value * 1000;
const releasedAt = new Map(); // midi → performance.now() when released under pedal
let fadeFrame = null;

pedalFadeEl.addEventListener("input", () => {
  pedalFadeMs = +pedalFadeEl.value * 1000;
  pedalFadeValueEl.textContent = `${(+pedalFadeEl.value).toFixed(1)} s`;
  if (midiRunning) renderMidiNotation();
});

function noteOpacity(midi) {
  const t = releasedAt.get(midi);
  if (t === undefined) return 1;
  return Math.max(0, 1 - (performance.now() - t) / pedalFadeMs);
}

function onMidiNotesChange(midiNotes, sustainDown = false) {
  const now = performance.now();
  if (sustainDown) {
    for (const m of lastMidiNotes) if (!midiNotes.includes(m)) releasedAt.set(m, now);
    for (const m of midiNotes) releasedAt.delete(m);
  } else {
    releasedAt.clear();
  }

  lastMidiNotes = midiNotes;
  drawPiano(midiPianoRoll, midiNotes);

  pedalHeldNotes = sustainDown
    ? [...new Set([...(pedalHeldNotes ?? []), ...midiNotes])].sort((a, b) => a - b)
    : null;

  renderMidiDisplay();
}

function renderMidiNotation() {
  renderGrandStaffNotation(pedalHeldNotes ?? lastMidiNotes, accidentalPreference, noteOpacity);

  const stillFading = [...releasedAt.keys()].some(m => noteOpacity(m) > 0);
  if (stillFading && fadeFrame === null) {
    fadeFrame = setTimeout(() => { fadeFrame = null; renderMidiNotation(); }, 50);
  }
}

function renderMidiDisplay() {
  const midiNotes = pedalHeldNotes ?? lastMidiNotes;

  if (midiNotes.length === 0) {
    midiChordEl.textContent = "";
    midiRomanEl.textContent = "";
    midiNotesEl.textContent = "";
    midiNotesDetEl.style.visibility = "hidden";
    midiStatusEl.textContent = "Play notes on your keyboard.";
    renderMidiNotation();
    return;
  }

  midiNotesDetEl.style.visibility = "visible";
  const noteObjs = midiNotes.map(m => ({ midi: m }));
  const chord = recognizeChord(noteObjs, accidentalPreference);
  const names = midiNotes.map(m => toMusicSymbols(midiToNoteName(m, accidentalPreference)));

  midiNotesEl.textContent = names.join(", ");
  midiChordEl.textContent = chord ? toMusicSymbols(chord.chord) : "";
  midiRomanEl.textContent = (chord && selectedKey)
    ? getRomanNumeral(chord, selectedKey.pc, selectedKey.mode)
    : "";
  midiStatusEl.textContent = pedalHeldNotes
    ? "Held by sustain pedal"
    : (chord ? "Chord detected!" : "Listening…");

  renderMidiNotation();
}
