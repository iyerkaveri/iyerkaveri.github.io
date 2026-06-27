// Chord recognition from a set of pitch classes (0–11).
// Covers triads, 7ths, sus, add9, and common extensions.
// NOTE_NAMES is defined in pitchDetect.js (loaded first).

// Each pattern lists its chord tones as { semitone, step } pairs:
//   semitone = interval from root in semitones (matching logic uses this, mod 12)
//   step     = interval from root in diatonic letter-steps (0=root,1=2nd,2=3rd,
//              3=4th,4=5th,5=6th,6=7th,8=9th) — used to spell the tone with the
//              correct letter + accidental (e.g. b3 on a dim chord lands on the
//              3rd-letter-up from root, flattened, rather than "nearest sharp").
const CHORD_PATTERNS = [
  // Triads
  { tones: [{semitone:0,step:0}, {semitone:4,step:2}, {semitone:7,step:4}],                     suffix: ""      }, // Major
  { tones: [{semitone:0,step:0}, {semitone:3,step:2}, {semitone:7,step:4}],                     suffix: "m"     }, // Minor
  { tones: [{semitone:0,step:0}, {semitone:3,step:2}, {semitone:6,step:4}],                     suffix: "dim"   },
  { tones: [{semitone:0,step:0}, {semitone:4,step:2}, {semitone:8,step:4}],                     suffix: "aug"   },
  { tones: [{semitone:0,step:0}, {semitone:5,step:3}, {semitone:7,step:4}],                     suffix: "sus4"  },
  { tones: [{semitone:0,step:0}, {semitone:2,step:1}, {semitone:7,step:4}],                     suffix: "sus2"  },

  // 7ths
  { tones: [{semitone:0,step:0}, {semitone:4,step:2}, {semitone:7,step:4}, {semitone:11,step:6}], suffix: "maj7"  },
  { tones: [{semitone:0,step:0}, {semitone:4,step:2}, {semitone:7,step:4}, {semitone:10,step:6}], suffix: "7"     }, // Dominant 7
  { tones: [{semitone:0,step:0}, {semitone:3,step:2}, {semitone:7,step:4}, {semitone:10,step:6}], suffix: "m7"    },
  { tones: [{semitone:0,step:0}, {semitone:3,step:2}, {semitone:7,step:4}, {semitone:11,step:6}], suffix: "mMaj7" },
  { tones: [{semitone:0,step:0}, {semitone:3,step:2}, {semitone:6,step:4}, {semitone:10,step:6}], suffix: "m7b5"  },
  { tones: [{semitone:0,step:0}, {semitone:3,step:2}, {semitone:6,step:4}, {semitone:9, step:6}], suffix: "dim7"  },
  { tones: [{semitone:0,step:0}, {semitone:4,step:2}, {semitone:8,step:4}, {semitone:10,step:6}], suffix: "aug7"  },

  // Add chords (9th = step 8, an octave + 2nd above root)
  { tones: [{semitone:0,step:0}, {semitone:4,step:2}, {semitone:7,step:4}, {semitone:14,step:8}], suffix: "add9"  },
  { tones: [{semitone:0,step:0}, {semitone:3,step:2}, {semitone:7,step:4}, {semitone:14,step:8}], suffix: "madd9" },

  // 6ths
  { tones: [{semitone:0,step:0}, {semitone:4,step:2}, {semitone:7,step:4}, {semitone:9,step:5}],  suffix: "6"     },
  { tones: [{semitone:0,step:0}, {semitone:3,step:2}, {semitone:7,step:4}, {semitone:9,step:5}],  suffix: "m6"    },
];

// Derive flat semitone-interval list (mod 12) for matching logic.
for (const pattern of CHORD_PATTERNS) {
  pattern.intervals = pattern.tones.map(t => t.semitone % 12);
}

// Normalize intervals to be sorted mod-12 ascending from 0.
function normalizeIntervals(pcs) {
  const sorted = [...pcs].sort((a, b) => a - b);
  return sorted.map(pc => ((pc - sorted[0]) + 12) % 12).sort((a, b) => a - b);
}

// Score a match: how many pattern intervals are present in detectedPCs (pitch classes).
function matchScore(patternIntervals, detectedPCs, root) {
  const detectedRelative = detectedPCs.map(pc => ((pc - root) + 12) % 12);
  let hits = 0;
  for (const interval of patternIntervals) {
    if (detectedRelative.includes(interval)) hits++;
  }
  return hits;
}

// Main: given array of {midi, name} notes and an accidental preference
// ("sharp" or "flat"), return {chord, notes, root} or null.
function recognizeChord(notes, preference = "sharp") {
  if (notes.length < 2) return null;

  const names = preference === "flat" ? FLAT_NAMES : SHARP_NAMES;
  const pcs = [...new Set(notes.map(n => n.midi % 12))];

  let bestScore = 0;
  let bestMatch = null;

  for (let root = 0; root < 12; root++) {
    for (const pattern of CHORD_PATTERNS) {
      // Require at least root + one other note present
      if (!pcs.includes(root)) continue;
      const score = matchScore(pattern.intervals, pcs, root);
      // Score must cover all pattern intervals (full match) or nearly so
      const coverage = score / pattern.intervals.length;
      if (coverage >= 0.85 && score > bestScore) {
        bestScore = score;
        bestMatch = {
          chord: names[root] + pattern.suffix,
          root: names[root],
          suffix: pattern.suffix,
          intervals: pattern.intervals,
          tones: pattern.tones,
        };
      }
    }
  }

  return bestMatch;
}
