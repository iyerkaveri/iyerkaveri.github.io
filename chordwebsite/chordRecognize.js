// Chord recognition from a set of pitch classes (0–11).
// NOTE_NAMES / SHARP_NAMES / FLAT_NAMES are defined in pitchDetect.js (loaded first).

// Each pattern lists its chord tones as { semitone, step } pairs:
//   semitone = interval from root (matching uses this mod 12)
//   step     = diatonic letter-steps from root (used to spell the tone with the
//              correct accidental — e.g. b3 lands on the 3rd letter, flattened)
const CHORD_PATTERNS = [
  // ── Power chord ───────────────────────────────────────────────────────────
  { tones: [{semitone:0,step:0},{semitone:7,step:4}],                                              suffix: "5"     },

  // ── Triads ────────────────────────────────────────────────────────────────
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4}],                          suffix: ""      }, // Major
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:7,step:4}],                          suffix: "m"     },
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:6,step:4}],                          suffix: "dim"   },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:8,step:4}],                          suffix: "aug"   },
  { tones: [{semitone:0,step:0},{semitone:5,step:3},{semitone:7,step:4}],                          suffix: "sus4"  },
  { tones: [{semitone:0,step:0},{semitone:2,step:1},{semitone:7,step:4}],                          suffix: "sus2"  },

  // ── 7ths ──────────────────────────────────────────────────────────────────
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:11,step:6}],     suffix: "maj7"  },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:10,step:6}],     suffix: "7"     },
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:7,step:4},{semitone:10,step:6}],     suffix: "m7"    },
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:7,step:4},{semitone:11,step:6}],     suffix: "mMaj7" },
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:6,step:4},{semitone:10,step:6}],     suffix: "m7b5"  },
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:6,step:4},{semitone:9, step:6}],     suffix: "dim7"  },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:8,step:4},{semitone:10,step:6}],     suffix: "aug7"  },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:6,step:4},{semitone:10,step:6}],     suffix: "7b5"   },

  // ── 9ths and altered dominants ────────────────────────────────────────────
  // semitone 14 = 9th (step 8 = 2nd letter), 13 = b9, 15 = #9
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:14,step:8}], suffix: "9"    },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:11,step:6},{semitone:14,step:8}], suffix: "maj9" },
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:14,step:8}], suffix: "m9"   },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:13,step:8}], suffix: "7b9"  },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:15,step:8}], suffix: "7#9"  },
  // semitone 18 = #11 (step 10 = 4th letter, sharped)
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:18,step:10}], suffix: "7#11" },
  // semitone 17 = 11th (step 10 = 4th letter, natural)
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:17,step:10}], suffix: "m11"  },

  // ── Add chords ────────────────────────────────────────────────────────────
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:14,step:8}],     suffix: "add9"  },
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:7,step:4},{semitone:14,step:8}],     suffix: "madd9" },

  // ── 6ths ──────────────────────────────────────────────────────────────────
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:9,step:5}],      suffix: "6"     },
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:7,step:4},{semitone:9,step:5}],      suffix: "m6"    },
];

// Derive flat semitone-interval list (mod 12) for matching logic.
for (const pattern of CHORD_PATTERNS) {
  pattern.intervals = pattern.tones.map(t => t.semitone % 12);
}

function matchScore(patternIntervals, detectedPCs, root) {
  const rel = detectedPCs.map(pc => ((pc - root) + 12) % 12);
  return patternIntervals.filter(iv => rel.includes(iv)).length;
}

// Main: given array of {midi} notes and an accidental preference,
// return a chord match object or null.
// Slash chord detection: if the lowest-midi note's pitch class differs from
// the recognised root, the result includes a /Bass suffix.
function recognizeChord(notes, preference = "sharp") {
  if (notes.length < 2) return null;

  const names = preference === "flat" ? FLAT_NAMES : SHARP_NAMES;
  const pcs = [...new Set(notes.map(n => n.midi % 12))];

  // Bass note = lowest midi note
  const sortedByMidi = [...notes].sort((a, b) => a.midi - b.midi);
  const bassPC = sortedByMidi[0].midi % 12;

  let bestScore = 0;
  let bestMatch = null;

  for (let root = 0; root < 12; root++) {
    if (!pcs.includes(root)) continue;
    for (const pattern of CHORD_PATTERNS) {
      const score = matchScore(pattern.intervals, pcs, root);
      const coverage = score / pattern.intervals.length;
      if (coverage >= 0.85 && score > bestScore) {
        bestScore = score;
        bestMatch = {
          root:      names[root],
          rootPC:    root,
          suffix:    pattern.suffix,
          chord:     names[root] + pattern.suffix,
          intervals: pattern.intervals,
          tones:     pattern.tones,
        };
      }
    }
  }

  if (bestMatch && bassPC !== bestMatch.rootPC) {
    bestMatch.bassName = names[bassPC];
    bestMatch.chord   += "/" + names[bassPC];
  }

  return bestMatch;
}
