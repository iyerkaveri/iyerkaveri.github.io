// Main app: wires mic → FFT → pitch detection → chord recognition → display

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

let audioCtx, analyser, sourceNode, animFrame, currentStream;
let accidentalPreference = "sharp";
let lastNotes = null; // re-render when the preference toggle changes
let isListening = false;

// Device labels are blank until mic permission has been granted at least
// once, so we populate on load (likely blank) and again after first capture.
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

populateMicList();
navigator.mediaDevices.addEventListener?.("devicechange", populateMicList);

// Switching mics while already listening restarts capture with the new device.
micSelect.addEventListener("change", () => {
  if (isListening) startCapture();
});

// Smoothing: accumulate note votes over ~300ms windows before committing
const VOTE_WINDOW_MS = 300;
const ANALYSIS_INTERVAL_MS = 50;
let voteAccumulator = {}; // noteSet string -> count
let voteStart = 0;

debugToggle.addEventListener("change", () => {
  debugPanel.hidden = !debugToggle.checked;
});

preferSharpBtn.addEventListener("click", () => setAccidentalPreference("sharp"));
preferFlatBtn.addEventListener("click", () => setAccidentalPreference("flat"));

function setAccidentalPreference(pref) {
  accidentalPreference = pref;
  preferSharpBtn.classList.toggle("active", pref === "sharp");
  preferFlatBtn.classList.toggle("active", pref === "flat");
  if (lastNotes) renderResult(lastNotes); // re-display immediately, don't wait for next chord
}

startBtn.addEventListener("click", startCapture);

async function startCapture() {
  try {
    // Tear down any previous session first (e.g. switching microphones).
    cancelAnimationFrame(animFrame);
    if (currentStream) currentStream.getTracks().forEach(t => t.stop());
    if (audioCtx) await audioCtx.close();

    // Create (and resume) the AudioContext synchronously within the click's
    // user-gesture window, before any `await`. If we create it after awaiting
    // getUserMedia, browsers can leave it "suspended" with no error thrown —
    // the analyser silently produces no data and nothing appears to happen.
    audioCtx = new AudioContext();
    if (audioCtx.state === "suspended") await audioCtx.resume();

    const deviceId = micSelect.value;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      video: false,
    });
    currentStream = stream;

    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 8192;              // High resolution for low frequencies
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

    populateMicList(); // labels are now available now that permission is granted

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
  if (audioCtx) audioCtx.close();
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
    // Sort notes by midi for consistent keying
    const key = notes.map(n => n.midi % 12).sort((a,b)=>a-b).join(",");
    voteAccumulator[key] = (voteAccumulator[key] || 0) + 1;
    // Store notes array with key for later retrieval
    voteAccumulator[key + "_notes"] = notes;
  }

  // Every VOTE_WINDOW_MS, commit the winning candidate
  if (ts - voteStart >= VOTE_WINDOW_MS) {
    commitVotes();
    voteAccumulator = {};
    voteStart = ts;
  }
}

function commitVotes() {
  // Find the key with the most votes
  let bestKey = null, bestCount = 0;
  for (const [k, v] of Object.entries(voteAccumulator)) {
    if (k.endsWith("_notes")) continue;
    if (v > bestCount) { bestCount = v; bestKey = k; }
  }

  if (!bestKey) return; // silence

  const notes = voteAccumulator[bestKey + "_notes"];
  if (!notes) return;

  lastNotes = notes;
  renderResult(notes);
}

// Swap ASCII accidentals for real musical glyphs in user-facing text. Safe as
// a blanket replace because '#'/'b' never appear in our chord/note vocabulary
// except as accidentals (no chord suffix or note letter relies on a literal
// lowercase 'b' or '#' for anything else).
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
    // No chord match — show the raw notes as text but nothing on the staff
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
  canvasCtx.fillStyle = "#111";
  canvasCtx.fillRect(0, 0, w, h);

  // Only show 0–2kHz range
  const maxBin = Math.floor(2000 / (analyser.context.sampleRate / analyser.fftSize));
  const barW = w / maxBin;

  for (let i = 0; i < maxBin; i++) {
    const v = data[i] / 255;
    const barH = v * h;
    canvasCtx.fillStyle = `hsl(${260 + v * 60}, 80%, ${40 + v * 30}%)`;
    canvasCtx.fillRect(i * barW, h - barH, Math.max(barW - 1, 1), barH);
  }
}
