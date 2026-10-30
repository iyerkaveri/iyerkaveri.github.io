// Chord recognition from a set of pitch classes (0–11).
// NOTE_NAMES / SHARP_NAMES / FLAT_NAMES are defined in pitchDetect.js (loaded first).

// Each pattern lists its chord tones as { semitone, step } pairs:
//   semitone = interval from root (matching uses semitone % 12)
//   step     = diatonic letter-steps from root (used to spell the tone with the
//              correct accidental — e.g. b3 lands on the 3rd letter, flattened)
const CHORD_PATTERNS = [
  // ── Power chord ───────────────────────────────────────────────────────────
  { tones: [{semitone:0,step:0},{semitone:7,step:4}],                                                           suffix: "5"       },

  // ── Triads ────────────────────────────────────────────────────────────────
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4}],                                        suffix: ""        },
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:7,step:4}],                                        suffix: "m"       },
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:6,step:4}],                                        suffix: "dim"     },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:8,step:4}],                                        suffix: "aug"     },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:6,step:4}],                                        suffix: "(b5)"    },
  { tones: [{semitone:0,step:0},{semitone:5,step:3},{semitone:7,step:4}],                                        suffix: "sus4"    },
  { tones: [{semitone:0,step:0},{semitone:2,step:1},{semitone:7,step:4}],                                        suffix: "sus2"    },
  { tones: [{semitone:0,step:0},{semitone:2,step:1},{semitone:5,step:3},{semitone:7,step:4}],                    suffix: "sus2sus4" },

  // ── Add chords (2nd/4th in same octave as triad) ──────────────────────────
  { tones: [{semitone:0,step:0},{semitone:2,step:1},{semitone:4,step:2},{semitone:7,step:4}],                    suffix: "add2"    },
  { tones: [{semitone:0,step:0},{semitone:2,step:1},{semitone:3,step:2},{semitone:7,step:4}],                    suffix: "madd2"   },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:5,step:3},{semitone:7,step:4}],                    suffix: "add4"    },
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:5,step:3},{semitone:7,step:4}],                    suffix: "madd4"   },
  { tones: [{semitone:0,step:0},{semitone:2,step:1},{semitone:4,step:2},{semitone:5,step:3},{semitone:7,step:4}], suffix: "add2add4" },
  { tones: [{semitone:0,step:0},{semitone:2,step:1},{semitone:3,step:2},{semitone:5,step:3},{semitone:7,step:4}], suffix: "madd2add4" },

  // dim7 sits above the 6ths so C–E♭–A (dim7 without its implied ♭5) beats Cm6 on the tie.
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:6,step:4},{semitone:9, step:6}],                   suffix: "dim7"    },

  // ── 6ths ──────────────────────────────────────────────────────────────────
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:9,step:5}],                    suffix: "6"       },
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:7,step:4},{semitone:9,step:5}],                    suffix: "m6"      },

  // ── 7ths ──────────────────────────────────────────────────────────────────
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:11,step:6}],                   suffix: "maj7"    },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:10,step:6}],                   suffix: "7"       },
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:7,step:4},{semitone:10,step:6}],                   suffix: "m7"      },
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:7,step:4},{semitone:11,step:6}],                   suffix: "mM7"     },
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:6,step:4},{semitone:10,step:6}],                   suffix: "m7b5"    },
  // 7♭5 / 7♯5: the altered 5th replaces the P5, all four notes required (with a P5 they're 7♯11 / 7♭13).
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:8,step:4},{semitone:10,step:6}],                   suffix: "7#5",  requireAll: true },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:8,step:4},{semitone:11,step:6}],                   suffix: "maj7#5"  },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:6,step:4},{semitone:10,step:6}],                   suffix: "7b5",  requireAll: true },
  { tones: [{semitone:0,step:0},{semitone:5,step:3},{semitone:7,step:4},{semitone:10,step:6}],                                          suffix: "7sus4"       },
  { tones: [{semitone:0,step:0},{semitone:2,step:1},{semitone:7,step:4},{semitone:10,step:6}],                                          suffix: "7sus2"       },
  { tones: [{semitone:0,step:0},{semitone:2,step:1},{semitone:5,step:3},{semitone:7,step:4},{semitone:10,step:6}],                       suffix: "7sus2sus4"   },
  { tones: [{semitone:0,step:0},{semitone:5,step:3},{semitone:7,step:4},{semitone:11,step:6}],                                          suffix: "maj7sus4"    },
  { tones: [{semitone:0,step:0},{semitone:2,step:1},{semitone:7,step:4},{semitone:11,step:6}],                                          suffix: "maj7sus2"    },
  { tones: [{semitone:0,step:0},{semitone:2,step:1},{semitone:5,step:3},{semitone:7,step:4},{semitone:11,step:6}],                       suffix: "maj7sus2sus4"},
  { tones: [{semitone:0,step:0},{semitone:5,step:3},{semitone:7,step:4},{semitone:10,step:6},{semitone:21,step:12}],                     suffix: "13sus4"      },
  { tones: [{semitone:0,step:0},{semitone:5,step:3},{semitone:7,step:4},{semitone:10,step:6},{semitone:14,step:8},{semitone:21,step:12}], suffix: "13sus4", need: [9] }, // 9th optional

  // ── 9ths ──────────────────────────────────────────────────────────────────
  // semitone 14 = 9th (step 8), 13 = b9, 15 = #9
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:14,step:8}], suffix: "9"     },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:11,step:6},{semitone:14,step:8}], suffix: "maj9"  },
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:14,step:8}], suffix: "m9"    },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:13,step:8}], suffix: "7b9"   },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:15,step:8}], suffix: "7#9"   },
  // semitone 18 = #11 (step 10), 17 = 11th, 20 = b13 (step 12)
  // 7♯11 / 7♭13 need the P5 — without it the same note is the ♭5 / ♯5 (7♭5 / 7♯5).
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:18,step:10}], suffix: "7#11", requireFifth: true },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:20,step:12}], suffix: "7b13", requireFifth: true },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:14,step:8},{semitone:18,step:10}], suffix: "9#11" },
  // `need` lists tones (semitones mod 12) that must be played beyond the 3rd/7th.
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:8,step:4},{semitone:10,step:6},{semitone:14,step:8}], suffix: "9#5",  requireAll: true },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:8,step:4},{semitone:11,step:6},{semitone:14,step:8}], suffix: "maj9#5", requireAll: true },
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:6,step:4},{semitone:10,step:6},{semitone:14,step:8}], suffix: "m9b5", requireAll: true },
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:6,step:4},{semitone:10,step:6},{semitone:17,step:10}], suffix: "m11b5", requireAll: true },
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:6,step:4},{semitone:10,step:6},{semitone:14,step:8},{semitone:17,step:10}], suffix: "m11b5", need: [6, 5] },
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:20,step:12}], suffix: "m7b13", requireFifth: true, need: [8] },
  // Dominant 11 (natural 11 over the major 3rd), 9th optional.
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:17,step:10}], suffix: "11", need: [5] },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:14,step:8},{semitone:17,step:10}], suffix: "11", need: [5] },
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:17,step:10}], suffix: "m11"  },
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:7,step:4},{semitone:11,step:6},{semitone:14,step:8}], suffix: "mM9"  },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:11,step:6},{semitone:18,step:10}], suffix: "maj7(#11)" },
  // 11ths (with 9th) — listed after the 9ths so a plain 9th voicing wins the tie.
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:14,step:8},{semitone:17,step:10}], suffix: "m11"     },
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:7,step:4},{semitone:11,step:6},{semitone:14,step:8},{semitone:17,step:10}], suffix: "mM11"    },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:11,step:6},{semitone:14,step:8},{semitone:17,step:10}], suffix: "maj11"   },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:11,step:6},{semitone:14,step:8},{semitone:18,step:10}], suffix: "maj9(#11)" },

  // ── 6/9 chords ────────────────────────────────────────────────────────────
  // semitone 9 = 6th (step 5), semitone 14 = 9th (step 8)
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:9,step:5},{semitone:14,step:8}], suffix: "6/9"  },
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:7,step:4},{semitone:9,step:5},{semitone:14,step:8}], suffix: "m6/9" },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:9,step:5},{semitone:14,step:8},{semitone:18,step:10}], suffix: "6/9#11", need: [4, 9, 2, 6] },

  // ── 13ths ─────────────────────────────────────────────────────────────────
  // Two patterns per 13th type:
  //  • 6-interval (with 9th): scores 6 when C,E,G,Bb,D,A all present →
  //    beats C9 (score 5). C9 listed first so C9 wins the 5-5 tie when no A.
  //  • 5-interval (without 9th): scores 4/5 = 0.80 when omit5 AND omit9
  //    (e.g. C-E-Bb-A) → handles the omit5 case the 6-interval misses.
  // semitone 21 = 13th (step 12), semitone 14 = 9th (step 8)
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:14,step:8},{semitone:21,step:12}], suffix: "13"    },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:11,step:6},{semitone:14,step:8},{semitone:21,step:12}], suffix: "maj13" },
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:14,step:8},{semitone:21,step:12}], suffix: "m13"   },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:21,step:12}], suffix: "13"    },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:11,step:6},{semitone:21,step:12}], suffix: "maj13" },
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:21,step:12}], suffix: "m13"   },
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:7,step:4},{semitone:11,step:6},{semitone:14,step:8},{semitone:21,step:12}], suffix: "mM13" },
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:7,step:4},{semitone:11,step:6},{semitone:21,step:12}], suffix: "mM13" },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:11,step:6},{semitone:14,step:8},{semitone:18,step:10},{semitone:21,step:12}], suffix: "maj13(#11)" },

  // ── Altered dominants (b9/♯9 with b5 or #5) ──────────────────────────────
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:6,step:4},{semitone:10,step:6},{semitone:13,step:8}], suffix: "7b5b9"  },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:8,step:4},{semitone:10,step:6},{semitone:13,step:8}], suffix: "7#5b9"  },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:6,step:4},{semitone:10,step:6},{semitone:15,step:8}], suffix: "7b5#9"  },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:8,step:4},{semitone:10,step:6},{semitone:15,step:8}], suffix: "7#5#9"  },

  // 13 with b9 / #9
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:13,step:8},{semitone:21,step:12}], suffix: "13b9" },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:15,step:8},{semitone:21,step:12}], suffix: "13#9" },
  // 13 with ♯11 (lydian dominant), and 13 with ♯11 plus an altered 9th; 9th/5th optional where natural.
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:14,step:8},{semitone:18,step:10},{semitone:21,step:12}], suffix: "13#11",   need: [6, 9] },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:13,step:8},{semitone:18,step:10},{semitone:21,step:12}], suffix: "13b9#11", need: [1, 6, 9] },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:15,step:8},{semitone:18,step:10},{semitone:21,step:12}], suffix: "13#9#11", need: [3, 6, 9] },
  { tones: [{semitone:0,step:0},{semitone:5,step:3},{semitone:7,step:4},{semitone:10,step:6},{semitone:13,step:8},{semitone:21,step:12}], suffix: "13sus4b9", need: [1, 9] },

  // 7alt: dom7 with ≥3 of {b9,#9,b5,#5} — four 3-alteration combos + all-four.
  // Ordered most→fewest intervals so highest score wins in the matching loop.
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:6,step:4},{semitone:8,step:4},{semitone:10,step:6},{semitone:13,step:8},{semitone:15,step:8}], suffix: "7alt" }, // all four
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:6,step:4},{semitone:10,step:6},{semitone:13,step:8},{semitone:15,step:8}], suffix: "7alt" }, // b9+#9+b5
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:8,step:4},{semitone:10,step:6},{semitone:13,step:8},{semitone:15,step:8}], suffix: "7alt" }, // b9+#9+#5
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:6,step:4},{semitone:8,step:4},{semitone:10,step:6},{semitone:13,step:8}], suffix: "7alt" }, // b9+b5+#5
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:6,step:4},{semitone:8,step:4},{semitone:10,step:6},{semitone:15,step:8}], suffix: "7alt" }, // #9+b5+#5
  // Two alterations of the same kind are also 7alt (one 5th + one 9th alteration keeps its specific name above).
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:13,step:8},{semitone:15,step:8}], suffix: "7alt" }, // b9+#9
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:6,step:4},{semitone:8,step:4},{semitone:10,step:6}], suffix: "7alt" },                     // b5+#5
];

// Derive flat semitone-interval list (mod 12) for matching logic.
for (const pattern of CHORD_PATTERNS) {
  pattern.intervals = pattern.tones.map(t => t.semitone % 12);
  // The 5th that may be left out: a perfect 5th for major/minor/sus4 triads and 7th chords and above,
  // or the ♭5 of dim7 (already implied by "dim"). Any other altered 5th must be played.
  // (Sus4 without a 5th ties with the inverted power chord; the bass note decides: C–F is Csus4, F–C is F5.)
  pattern.optionalFifth =
    pattern.suffix === "dim7" ? 6 :
    pattern.intervals.includes(7) &&
    (pattern.intervals.includes(10) || pattern.intervals.includes(11) ||
     ["", "m", "sus4"].includes(pattern.suffix)) ? 7 : null;
  // 7th chords and above must contain their 3rd and 7th (sus chords: the sus tone instead of the 3rd).
  const seventh = pattern.tones.filter(t => t.step === 6);
  const third   = pattern.tones.filter(t => t.step === 2);
  const susTone = pattern.tones.filter(t => (t.step === 1 || t.step === 3) && t.semitone < 12);
  pattern.required = seventh.length
    ? [...seventh, ...(third.length ? third : susTone)].map(t => t.semitone % 12)
    : [];
  if (pattern.requireAll)   pattern.required = [...pattern.intervals];
  if (pattern.requireFifth) { pattern.required.push(7); pattern.optionalFifth = null; }
  if (pattern.need) pattern.required.push(...pattern.need);
  if (pattern.suffix === "6/9#11") pattern.optionalFifth = 7;
  // add2add4: every note except the 5th must be played (C D E F is complete).
  if (pattern.suffix === "add2add4" || pattern.suffix === "madd2add4") {
    pattern.optionalFifth = 7;
    pattern.required = pattern.intervals.filter(iv => iv !== 7);
  }
  // With 2+ alterations, ♯11/♭13 are named ♭5/♯5 and a played P5 doesn't change the name (C E G B♭ D♭ F♯ → C7♭5♭9).
  pattern.allowedExtras = /^7(alt|[b#]5[b#]9)$/.test(pattern.suffix) ? [7] : [];
}

function matchScore(patternIntervals, detectedPCs, root) {
  const rel = detectedPCs.map(pc => ((pc - root) + 12) % 12);
  return patternIntervals.filter(iv => rel.includes(iv)).length;
}

// ── Quartal stacks ────────────────────────────────────────────────────────────
// Notes that stack upward from the bass in perfect (P, +5) or augmented (A, +6) 4ths.
// Keyed by the stack's 4ths; value is [root offset from bass, suffix]. Any stack not listed reads as "Q".
const QUARTAL_NAMES = {
  PP:     [0, "7sus4"],
  PPP:    [0, "m11"],      APP:    [0, "maj7(#11)"],
  PPPP:   [5, "m11"],      PPPA:   [0, "m13"],  PPAP:   [0, "13"],  APPP:   [0, "maj13(#11)"],
  PPPPP:  [10, "m11"],     PPPPA:  [5, "m13"],  PPPAP:  [0, "m13"], PPAPP:  [0, "13"], APPPP: [0, "maj13(#11)"],
  PPPPAP: [10, "13"],      PPPAPP: [0, "m13"],  PPAPPP: [0, "13"],  APPPPP: [0, "maj13(#11)"],
};

// Returns the P/A string if every pitch class stacks in 4ths starting from the bass, else null.
function quartalStack(pcs, bassPC) {
  const walk = (cur, left, seq) => {
    if (left.length === 0) return seq;
    for (const [step, mark] of [[5, "P"], [6, "A"]]) {
      const next = (cur + step) % 12;
      if (left.includes(next)) {
        const found = walk(next, left.filter(pc => pc !== next), seq + mark);
        if (found) return found;
      }
    }
    return null;
  };
  return walk(bassPC, pcs.filter(pc => pc !== bassPC), "");
}

// Triads and 7ths with a 3rd — a complete one above the bass beats a sus reading of the bass (Bb/C, G/C).
const TERTIAN = new Set(["", "m", "dim", "aug", "(b5)", "maj7", "7", "m7", "mM7", "m7b5", "dim7", "7#5", "maj7#5", "7b5"]);

function makeMatch(rootPC, pattern, bassPC, names) {
  const m = {
    root: names[rootPC], rootPC, suffix: pattern.suffix,
    chord: names[rootPC] + pattern.suffix, intervals: pattern.intervals, tones: pattern.tones,
  };
  if (bassPC !== rootPC) { m.bassName = names[bassPC]; m.chord += "/" + names[bassPC]; }
  return m;
}

function quartalMatch(seq, pcs, bassPC, names) {
  const named = QUARTAL_NAMES[seq];
  if (named) {
    const rootPC = (bassPC + named[0]) % 12;
    const pattern = CHORD_PATTERNS.filter(p => p.suffix === named[1])
      .reduce((a, b) => matchScore(b.intervals, pcs, rootPC) > matchScore(a.intervals, pcs, rootPC) ? b : a);
    return makeMatch(rootPC, pattern, bassPC, names);
  }
  // Spell the stack as written: each 4th is the next letter-name a 4th up (A = sharpened 4th).
  let semitone = 0;
  const tones = [{ semitone: 0, step: 0 }];
  for (const mark of seq) { semitone += mark === "P" ? 5 : 6; tones.push({ semitone, step: tones.length * 3 }); }
  return {
    root: names[bassPC], rootPC: bassPC, suffix: "Q", chord: "Q",
    intervals: tones.map(t => t.semitone % 12), tones,
  };
}

// Main: given array of {midi} notes and an accidental preference,
// return a chord match object or null.
// Slash chord detection: if the lowest-midi note's pitch class differs from
// the recognised root, the result includes a /Bass suffix.
function recognizeChord(notes, preference = "sharp") {
  if (notes.length < 2) return null;

  const names = preference === "flat" ? FLAT_NAMES : SHARP_NAMES;
  const pcs = [...new Set(notes.map(n => n.midi % 12))];
  // More than 8 different notes (octaves count once) is never named.
  if (pcs.length > 8) return null;

  // Bass note = lowest midi note
  const sortedByMidi = [...notes].sort((a, b) => a.midi - b.midi);
  const bassPC = sortedByMidi[0].midi % 12;

  if (pcs.length >= 3) {
    const seq = quartalStack(pcs, bassPC);
    if (seq) return quartalMatch(seq, pcs, bassPC, names);
  }

  const candidates = [];
  CHORD_PATTERNS.forEach((pattern, index) => {
    for (let root = 0; root < 12; root++) {
      if (!pcs.includes(root)) continue;
      if (pattern.required.some(iv => !pcs.includes((root + iv) % 12))) continue;
      const score = matchScore(pattern.intervals, pcs, root);
      const has = iv => pcs.includes((root + iv) % 12);
      const fifth = pattern.optionalFifth;
      // A played ♭5/♯5 the pattern doesn't account for means the 5th is altered, not omitted.
      const otherFifthPlayed = fifth !== null &&
        [6, 7, 8].some(iv => iv !== fifth && !pattern.intervals.includes(iv) && has(iv));
      const fifthMissing = fifth !== null && !has(fifth) && !otherFifthPlayed;
      const coverage = score / (pattern.intervals.length - (fifthMissing ? 1 : 0));
      if (coverage < 0.75) continue;
      // Every played note is a chord tone (a slash chord's bass may be anything).
      const explainsAll = pcs.every(pc => {
        const iv = (pc - root + 12) % 12;
        return pc === bassPC || pattern.intervals.includes(iv) || pattern.allowedExtras.includes(iv);
      });
      const bassInterval = (bassPC - root + 12) % 12;
      const bassIsChordTone = pattern.intervals.includes(bassInterval);
      // A slash chord's bass may be its 3rd, 5th or 7th (an inversion); a bass that's only its 2nd/9th/maj7/6th etc.
      // reads as a plain chord over that note instead (B♭ D♭ F over C is B♭m/C, not B♭madd2/C).
      const inversionTones = pattern.suffix === "dim7" ? [3, 6, 9] : [3, 4, 6, 7, 8, 10];
      if (root !== bassPC && bassIsChordTone && !inversionTones.includes(bassInterval)) continue;
      // Sus chords with a 9th or higher are never inverted or slashed (C D♭ E♭ G♭ A♭ B♭ B is A♭m11/C, not D♭13sus4/C).
      if (root !== bassPC && !pattern.tones.some(t => t.step === 2) && pattern.tones.some(t => t.step >= 8)) continue;
      // A slash chord's own score excludes its bass, so B D F♯ over C is Bm/C, not D13/C (which leans on C as its 7th).
      const ownScore = root === bassPC ? score : score - (bassIsChordTone ? 1 : 0);
      candidates.push({ root, pattern, index, ownScore, explainsAll, bassIsChordTone,
                        complete: score === pattern.intervals.length });
    }
  });
  // No name at all beats a name that ignores a played note (C D♭ D E♭ is not Cmadd2).
  if (!candidates.some(c => c.explainsAll)) return null;

  // Rank: explains every note > more matched tones > nothing missing > bass is a chord tone (C7/B♭ over C/B♭)
  //       > root in the bass (C6 vs Am7) > root closest above the bass (same answer in every key) > list order.
  const aboveBass = c => (c.root - bassPC + 12) % 12;
  const rank = (a, b) =>
    (b.explainsAll - a.explainsAll) || (b.ownScore - a.ownScore) || (b.complete - a.complete) ||
    (b.bassIsChordTone - a.bassIsChordTone) || ((b.root === bassPC) - (a.root === bassPC)) ||
    (aboveBass(a) - aboveBass(b)) || (a.index - b.index);
  candidates.sort(rank);
  let best = candidates[0];

  // A sus reading of the bass gives way to a complete triad/7th above it (C D F B♭ → B♭/C),
  // except a 13sus4, which keeps its name (C F A B♭ D is C13sus4, not B♭maj7/C).
  const isSus = !best.pattern.tones.some(t => t.step === 2) && best.pattern.suffix !== "13sus4";
  if (best.root === bassPC && isSus) {
    const upper = candidates.find(c => c.root !== bassPC && c.complete && c.explainsAll && TERTIAN.has(c.pattern.suffix));
    if (upper) best = upper;
  }

  return makeMatch(best.root, best.pattern, bassPC, names);
}
