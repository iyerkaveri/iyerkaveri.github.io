// FFT-based polyphonic pitch detection tuned for piano/guitar.
// Returns an array of note names (e.g. ["C4","E4","G4"]) from an AnalyserNode.

const SHARP_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const FLAT_NAMES  = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
const NOTE_NAMES = SHARP_NAMES; // default/back-compat alias

function freqToMidi(freq) {
  return 69 + 12 * Math.log2(freq / 440);
}

function midiToNoteName(midi, preference = "sharp") {
  const names = preference === "flat" ? FLAT_NAMES : SHARP_NAMES;
  const name = names[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

// Given FFT magnitude data, find spectral peaks above a threshold.
// Returns [{freq, magnitude}] sorted by magnitude desc.
function findPeaks(freqData, sampleRate, fftSize, minFreq = 60, maxFreq = 1500) {
  const binSize = sampleRate / fftSize;
  const minBin = Math.floor(minFreq / binSize);
  const maxBin = Math.min(Math.ceil(maxFreq / binSize), freqData.length - 2);

  // Relative threshold: a fraction of the loudest peak in range.
  // A global mean+std threshold gets skewed by one dominant note (very
  // common — chord notes are rarely equal volume) and silently filters
  // out the quieter notes, so anchor to the loudest peak instead.
  let maxMag = 0;
  for (let i = minBin; i <= maxBin; i++) {
    if (freqData[i] > maxMag) maxMag = freqData[i];
  }
  if (maxMag < 0.01) return []; // effectively silence

  const threshold = maxMag * 0.03; // notes up to ~30dB quieter than the loudest still count

  const peaks = [];
  for (let i = minBin + 1; i < maxBin; i++) {
    if (
      freqData[i] > freqData[i - 1] &&
      freqData[i] > freqData[i + 1] &&
      freqData[i] > threshold
    ) {
      // Quadratic interpolation for sub-bin accuracy
      const alpha = freqData[i - 1];
      const beta  = freqData[i];
      const gamma = freqData[i + 1];
      const offset = (alpha - gamma) / (2 * (alpha - 2 * beta + gamma));
      const freq = (i + offset) * binSize;
      peaks.push({ freq, magnitude: freqData[i] });
    }
  }
  return peaks.sort((a, b) => b.magnitude - a.magnitude);
}

// Suppress harmonics: drop any peak that is an integer multiple (2x-5x) of a
// lower-frequency peak already kept. We must walk in frequency order (not
// magnitude order) — a harmonic overtone can be louder than the fundamental
// that produced it, and if we trusted magnitude order that loud harmonic
// would get accepted *before* its fundamental and never get suppressed.
function suppressHarmonics(peaks) {
  const byFreq = [...peaks].sort((a, b) => a.freq - b.freq);
  const kept = [];
  for (const peak of byFreq) {
    let isHarmonic = false;
    for (const ref of kept) {
      for (let h = 2; h <= 5; h++) {
        const expected = ref.freq * h;
        if (Math.abs(peak.freq - expected) / expected < 0.03) {
          isHarmonic = true;
          break;
        }
      }
      if (isHarmonic) break;
    }
    if (!isHarmonic) kept.push(peak);
  }
  return kept.sort((a, b) => b.magnitude - a.magnitude);
}

// Convert peaks to MIDI note numbers (rounded) with dedup by pitch class.
function peaksToNotes(peaks) {
  const seen = new Set();
  const notes = [];
  for (const { freq } of peaks) {
    if (freq < 60 || freq > 1500) continue;
    const midi = Math.round(freqToMidi(freq));
    if (midi < 36 || midi > 96) continue;
    const pc = midi % 12; // pitch class
    if (!seen.has(pc)) {
      seen.add(pc);
      notes.push({ midi, name: midiToNoteName(midi) });
    }
  }
  return notes;
}

// Main entry: given AnalyserNode, return detected notes.
function detectNotes(analyser) {
  const fftSize = analyser.fftSize;
  const sampleRate = analyser.context.sampleRate;
  const freqData = new Float32Array(analyser.frequencyBinCount);
  analyser.getFloatFrequencyData(freqData);

  // Convert dB to linear magnitude
  const linear = freqData.map(db => db === -Infinity ? 0 : Math.pow(10, db / 20));

  const peaks = findPeaks(linear, sampleRate, fftSize);
  const fundamentals = suppressHarmonics(peaks.slice(0, 20));
  return peaksToNotes(fundamentals.slice(0, 6));
}
