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

  // Dense extended chords chosen in review: each needs exactly its own notes, with the root in the bass.
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:10,step:6},{semitone:13,step:8},{semitone:17,step:10}], suffix: "11b9", requireAll: true, rootOnly: true },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:13,step:8},{semitone:17,step:10}], suffix: "11b9", requireAll: true, rootOnly: true },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:9,step:5},{semitone:15,step:8}], suffix: "6(add#9)", requireAll: true, rootOnly: true },
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:18,step:10}], suffix: "m7#11", requireAll: true, rootOnly: true },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:10,step:6},{semitone:15,step:8},{semitone:17,step:10}], suffix: "11#9", requireAll: true, rootOnly: true },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:15,step:8},{semitone:17,step:10}], suffix: "11#9", requireAll: true, rootOnly: true },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:10,step:6},{semitone:13,step:8},{semitone:15,step:8},{semitone:21,step:12}], suffix: "13b9#9", requireAll: true, rootOnly: true },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:10,step:6},{semitone:13,step:8},{semitone:17,step:10},{semitone:21,step:12}], suffix: "13b9(add11)", requireAll: true, rootOnly: true },
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:14,step:8},{semitone:18,step:10}], suffix: "m9#11", requireAll: true, rootOnly: true },
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:18,step:10},{semitone:21,step:12}], suffix: "m13#11", requireAll: true, rootOnly: true },
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:14,step:8},{semitone:18,step:10},{semitone:21,step:12}], suffix: "m13#11", requireAll: true, rootOnly: true },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:10,step:6},{semitone:13,step:8},{semitone:15,step:8},{semitone:17,step:10}], suffix: "11b9#9", requireAll: true, rootOnly: true },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:13,step:8},{semitone:15,step:8},{semitone:17,step:10}], suffix: "11b9#9", requireAll: true, rootOnly: true },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:8,step:4},{semitone:10,step:6},{semitone:13,step:8},{semitone:17,step:10}], suffix: "11b9#5", requireAll: true, rootOnly: true },
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:7,step:4},{semitone:9,step:5},{semitone:14,step:8},{semitone:18,step:10}], suffix: "m6/9#11", requireAll: true, rootOnly: true },
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:7,step:4},{semitone:11,step:6},{semitone:14,step:8},{semitone:18,step:10}], suffix: "mM9#11", requireAll: true, rootOnly: true },
  { tones: [{semitone:0,step:0},{semitone:2,step:1},{semitone:7,step:4},{semitone:10,step:6},{semitone:18,step:10},{semitone:20,step:12}], suffix: "7sus2#11b13", requireAll: true, rootOnly: true },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:8,step:4},{semitone:10,step:6},{semitone:15,step:8},{semitone:17,step:10}], suffix: "11#9#5", requireAll: true, rootOnly: true },
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:18,step:10},{semitone:20,step:12}], suffix: "m7#11b13", requireAll: true, rootOnly: true },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:13,step:8},{semitone:17,step:10},{semitone:20,step:12}], suffix: "11b9b13", requireAll: true, rootOnly: true },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:14,step:8},{semitone:18,step:10},{semitone:20,step:12}], suffix: "9#11b13", requireAll: true, rootOnly: true },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:8,step:4},{semitone:10,step:6},{semitone:13,step:8},{semitone:15,step:8},{semitone:17,step:10}], suffix: "11b9#9#5", requireAll: true, rootOnly: true },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:10,step:6},{semitone:13,step:8},{semitone:15,step:8},{semitone:17,step:10},{semitone:21,step:12}], suffix: "13b9#9(add11)", requireAll: true, rootOnly: true },
  { tones: [{semitone:0,step:0},{semitone:3,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:14,step:8},{semitone:18,step:10},{semitone:20,step:12}], suffix: "m9#11b13", requireAll: true, rootOnly: true },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:15,step:8},{semitone:17,step:10},{semitone:20,step:12}], suffix: "11#9b13", requireAll: true, rootOnly: true },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:15,step:8},{semitone:17,step:10},{semitone:21,step:12}], suffix: "13#9(add11)", requireAll: true, rootOnly: true },
  { tones: [{semitone:0,step:0},{semitone:4,step:2},{semitone:7,step:4},{semitone:10,step:6},{semitone:13,step:8},{semitone:15,step:8},{semitone:17,step:10},{semitone:20,step:12}], suffix: "11b9#9b13", requireAll: true, rootOnly: true },

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

// ── Spelling ──────────────────────────────────────────────────────────────────
// A chord tone takes the letter its step gives from the root (a ♭3 is a 3rd's letter), with whatever
// accidental lands it on the right pitch: from F♯, semitone 3 / step 2 is A; from G♭ it would be B𝄫.
const LETTER_NAMES = "CDEFGAB";
const LETTER_PCS   = [0, 2, 4, 5, 7, 9, 11];
const ACCIDENTALS  = { "-2": "bb", "-1": "b", "0": "", "1": "#", "2": "##" };

function spellDegree(rootName, tone) {
  const rootLetter = LETTER_NAMES.indexOf(rootName[0]);
  const rootPC = (LETTER_PCS[rootLetter] + (rootName.includes("#") ? 1 : rootName.includes("b") ? -1 : 0) + 12) % 12;
  const letter = (rootLetter + tone.step) % 7;
  const acc = ((rootPC + tone.semitone - LETTER_PCS[letter]) % 12 + 18) % 12 - 6;
  return LETTER_NAMES[letter] + (ACCIDENTALS[acc] ?? "");
}
const isDouble = name => /##|bb/.test(name);

// The root keeps the sharp/flat preference unless that spelling forces more double sharps/flats
// on the chord's own notes than the other one does (G♭m → F♯m, D♯ → E♭, A♯ → B♭).
const ENHARMONIC = { "C#": "Db", "Db": "C#", "D#": "Eb", "Eb": "D#", "F#": "Gb", "Gb": "F#",
                     "G#": "Ab", "Ab": "G#", "A#": "Bb", "Bb": "A#" };
function rootName(rootPC, pattern, names) {
  const preferred = names[rootPC], other = ENHARMONIC[preferred];
  if (!other) return preferred;
  const doubles = name => pattern.tones.filter(t => isDouble(spellDegree(name, t))).length;
  return doubles(other) < doubles(preferred) ? other : preferred;
}

// A bass that's a chord tone is spelled as that tone (C7/B♭ even with sharps); any other bass follows the preference.
function bassName(root, rootPC, pattern, bassPC, names) {
  const tone = pattern.tones.find(t => t.semitone % 12 === (bassPC - rootPC + 12) % 12);
  const asTone = tone && spellDegree(root, tone);
  return asTone && !isDouble(asTone) ? asTone : names[bassPC];
}
const ODD_BASS = new Set(["B#", "E#", "Cb", "Fb"]);

function makeMatch(rootPC, pattern, bassPC, names) {
  let root = rootName(rootPC, pattern, names);
  let bass = bassPC !== rootPC ? bassName(root, rootPC, pattern, bassPC, names) : null;
  // Never a B♯, E♯, C♭ or F♭ bass: respell the whole chord (G♯/B♯ → A♭/C), or, if the root can't be
  // respelled, name the bass as the preference does (E7♯5/C).
  if (ODD_BASS.has(bass)) {
    const other = ENHARMONIC[root];
    const otherBass = other && bassName(other, rootPC, pattern, bassPC, names);
    if (otherBass && !ODD_BASS.has(otherBass)) { root = other; bass = otherBass; }
    else bass = names[bassPC];
  }
  const m = {
    root, rootPC, suffix: pattern.suffix,
    chord: root + pattern.suffix, intervals: pattern.intervals, tones: pattern.tones,
  };
  if (bass) { m.bassName = bass; m.chord += "/" + bass; }
  return m;
}

// Name a played note (e.g. "C#4") by its place in the recognised chord: A/C plays C, A, C♯, E.
// Polychord notes follow the chord they belong to (the bottom one if both); notes outside the chord,
// and the notes of Q and TT (which have no chord degrees), follow the preference.
function spellPlayedNote(midi, chord, preference = "sharp") {
  const pc = midi % 12;
  let name = (preference === "flat" ? FLAT_NAMES : SHARP_NAMES)[pc];
  const parts = !chord || chord.suffix === "Q" || chord.suffix === "TT" ? []
              : chord.poly ? [chord.bottomMatch, chord.topMatch] : [chord];
  for (const part of parts) {
    const tone = part.tones.find(t => t.semitone % 12 === (pc - part.rootPC + 12) % 12);
    if (tone) { name = spellDegree(part.root, tone); break; }
  }
  return withOctave(name, midi);
}

// Add the octave to a note name spelled for this midi note: ("B#", 60) → "B#3".
function withOctave(name, midi) {
  const natural = LETTER_PCS[LETTER_NAMES.indexOf(name[0])];
  const acc = ((midi % 12 - natural) % 12 + 18) % 12 - 6;
  return name + (Math.round((midi - acc - natural) / 12) - 1);
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

// ── Polychords ────────────────────────────────────────────────────────────────
// A lower chord rooted on the bass (major or minor triad, or a power chord) under a complete chord
// on a different root above it (major, minor, diminished or augmented triad, or a maj7, dominant 7
// or m7) that adds at least one note; together they cover every played note. C C♯ E F♯ G A is F♯m over C.
// POLY_REPLACES sets which single-chord names a polychord may replace:
//   "none"          only notes that would otherwise get no name
//   "extendedSlash" also slash chords whose upper chord has a 9th, 11th or 13th (A13♯9/C → F♯m over C)
//   "anySlash"      also any other slash chord
const POLY_REPLACES = "extendedSlash";
const POLY_BOTTOM = ["", "m", "5"];
const POLY_TOP    = ["", "m", "dim", "aug", "maj7", "7", "m7"];

function polychord(pcs, bassPC, names) {
  const patternFor = suffix => CHORD_PATTERNS.find(p => p.suffix === suffix);
  const chordPCs = (root, pattern) => pattern.intervals.map(iv => (root + iv) % 12);
  const matches = [];
  for (const bSuffix of POLY_BOTTOM) {
    const bottom = chordPCs(bassPC, patternFor(bSuffix));
    if (!bottom.every(pc => pcs.includes(pc))) continue;
    for (const tSuffix of POLY_TOP) {
      for (let root = 0; root < 12; root++) {
        if (root === bassPC) continue;   // the two chords never share a root (no Cdim over C)
        const top = chordPCs(root, patternFor(tSuffix));
        if (!top.every(pc => pcs.includes(pc))) continue;
        if (!pcs.every(pc => bottom.includes(pc) || top.includes(pc))) continue;
        if (top.every(pc => bottom.includes(pc))) continue;
        matches.push({ bSuffix, tSuffix, root, shared: top.some(pc => bottom.includes(pc)) });
      }
    }
  }
  if (!matches.length) return null;
  // Prefer no shared notes, then a triad below, then a triad above, then the top root nearest above the bass.
  const isSeventh = m => m.tSuffix.includes("7");
  matches.sort((a, b) => (a.shared - b.shared) || ((a.bSuffix === "5") - (b.bSuffix === "5")) ||
    (isSeventh(a) - isSeventh(b)) || ((a.root - bassPC + 12) % 12) - ((b.root - bassPC + 12) % 12));
  const m = matches[0];
  const bottom = makeMatch(bassPC, patternFor(m.bSuffix), bassPC, names);
  const top    = makeMatch(m.root, patternFor(m.tSuffix), m.root, names);
  // Notation: the top chord stacked an octave above the bottom chord's root, spelled from the bottom root.
  const LETTERS = "CDEFGAB";
  const letterGap = (LETTERS.indexOf(top.root[0]) - LETTERS.indexOf(bottom.root[0]) + 7) % 7;
  const offset = (m.root - bassPC + 12) % 12;
  return {
    poly: true, top: top.chord, bottom: bottom.chord, chord: top.chord + "|" + bottom.chord,
    topMatch: top, bottomMatch: bottom,
    root: bottom.root, rootPC: bassPC, suffix: "poly",
    intervals: [...new Set([...bottom.intervals, ...top.intervals.map(iv => (iv + offset) % 12)])],
    tones: [...bottom.tones,
            ...top.tones.map(t => ({ semitone: 12 + offset + t.semitone, step: 7 + letterGap + t.step }))],
  };
}

// Whether a polychord may replace this single-chord result (see POLY_REPLACES).
function polyMayReplace(match) {
  if (!match) return true;
  if (!match.bassName || POLY_REPLACES === "none") return false;
  return POLY_REPLACES === "anySlash" || match.tones.some(t => t.step >= 8);
}

function recognizeChord(notes, preference = "sharp") {
  const match = recognizeSingleChord(notes, preference);
  if (notes.length < 2 || !polyMayReplace(match)) return match;
  const names = preference === "flat" ? FLAT_NAMES : SHARP_NAMES;
  const pcs = [...new Set(notes.map(n => n.midi % 12))];
  const bassPC = Math.min(...notes.map(n => n.midi)) % 12;
  return polychord(pcs, bassPC, names) ?? match;
}

// Main: given array of {midi} notes and an accidental preference,
// return a chord match object or null.
// Slash chord detection: if the lowest-midi note's pitch class differs from
// the recognised root, the result includes a /Bass suffix.
function recognizeSingleChord(notes, preference = "sharp") {
  if (notes.length < 2) return null;

  const names = preference === "flat" ? FLAT_NAMES : SHARP_NAMES;
  const pcs = [...new Set(notes.map(n => n.midi % 12))];
  // More than 8 different notes (octaves count once) is never named.
  if (pcs.length > 8) return null;

  // Bass note = lowest midi note
  const sortedByMidi = [...notes].sort((a, b) => a.midi - b.midi);
  const bassPC = sortedByMidi[0].midi % 12;

  // Two different notes: a tritone is "TT", a minor 7th names its dominant 7th (C–B♭ C7, B♭–C C7/B♭),
  // and a major 7th above the bass names its maj7 (C–B Cmaj7; B–C stays unnamed).
  if (pcs.length === 2) {
    const up = (pcs.find(pc => pc !== bassPC) - bassPC + 12) % 12;
    if (up === 6) return { root: names[bassPC], rootPC: bassPC, suffix: "TT", chord: "TT", intervals: [0, 6],
                           tones: [{ semitone: 0, step: 0 }, { semitone: 6, step: 3 }] };
    const dyad = suffix => CHORD_PATTERNS.find(p => p.suffix === suffix);
    if (up === 10) return makeMatch(bassPC, dyad("7"), bassPC, names);
    if (up === 2)  return makeMatch((bassPC + 2) % 12, dyad("7"), bassPC, names);
    if (up === 11) return makeMatch(bassPC, dyad("maj7"), bassPC, names);
  }

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
      if (pattern.rootOnly && root !== bassPC) continue;
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
  const isSus = !best.pattern.tones.some(t => t.step === 2) && best.pattern.suffix !== "13sus4" && !best.pattern.rootOnly;
  if (best.root === bassPC && isSus) {
    const upper = candidates.find(c => c.root !== bassPC && c.complete && c.explainsAll && TERTIAN.has(c.pattern.suffix));
    if (upper) best = upper;
  }

  return makeMatch(best.root, best.pattern, bassPC, names);
}
