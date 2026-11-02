// Key analysis: compute Roman numeral chord function for a recognised chord
// within a user-selected key.

// 24 keys in circle-of-fifths order within each mode.
const ALL_KEYS = [
  // ── Major ──────────────────────────────────────────────────────────────────
  { label: "C major",  pc: 0,  mode: "major" },
  { label: "G major",  pc: 7,  mode: "major" },
  { label: "D major",  pc: 2,  mode: "major" },
  { label: "A major",  pc: 9,  mode: "major" },
  { label: "E major",  pc: 4,  mode: "major" },
  { label: "B major",  pc: 11, mode: "major" },
  { label: "F♯ major", pc: 6,  mode: "major" },
  { label: "D♭ major", pc: 1,  mode: "major" },
  { label: "A♭ major", pc: 8,  mode: "major" },
  { label: "E♭ major", pc: 3,  mode: "major" },
  { label: "B♭ major", pc: 10, mode: "major" },
  { label: "F major",  pc: 5,  mode: "major" },
  // ── Minor ──────────────────────────────────────────────────────────────────
  { label: "A minor",  pc: 9,  mode: "minor" },
  { label: "E minor",  pc: 4,  mode: "minor" },
  { label: "B minor",  pc: 11, mode: "minor" },
  { label: "F♯ minor", pc: 6,  mode: "minor" },
  { label: "C♯ minor", pc: 1,  mode: "minor" },
  { label: "G♯ minor", pc: 8,  mode: "minor" },
  { label: "E♭ minor", pc: 3,  mode: "minor" },
  { label: "B♭ minor", pc: 10, mode: "minor" },
  { label: "F minor",  pc: 5,  mode: "minor" },
  { label: "C minor",  pc: 0,  mode: "minor" },
  { label: "G minor",  pc: 7,  mode: "minor" },
  { label: "D minor",  pc: 2,  mode: "minor" },
];

// Lookup tables: interval from tonic (0–11) → base Roman numeral string.
// The case/decoration is then adjusted based on chord quality.
const MAJOR_ROMAN = [
  "I", "♭II", "II", "♭III", "III", "IV", "♯IV", "V", "♭VI", "VI", "♭VII", "VII"
];
const MINOR_ROMAN = [
  "I", "♭II", "II", "III", "♯III", "IV", "♯IV", "V", "VI", "♯VI", "VII", "♯VII"
];

// Returns the Roman numeral as { numeral, figure, after }, e.g. { "V", ["6","5"], "(♭9)" }, or null.
// chord must have { rootPC, suffix } (as returned by recognizeChord).
// keyPC is the tonic pitch class (0–11); keyMode is "major" | "minor".
// midis (the played notes) lets augmented 6th chords be recognised by their exact notes.
// secondary: read dominant chords that lead to another degree as V/x (C7 in C → V7/IV), and
// diminished / half-diminished chords a half step below one as vii°7/x, viiø7/x (F♯dim7 in C → vii°7/V).
function getRomanParts(chord, keyPC, keyMode, midis, secondary = false) {
  if (chord.suffix === "Q" || chord.suffix === "TT" || chord.poly) return null;
  const aug6 = midis && augmentedSixth(midis, keyPC);
  if (aug6) return { numeral: aug6, figure: ["+6"], after: "" };
  const interval = (chord.rootPC - keyPC + 12) % 12;
  // Neapolitan: a major triad on ♭2, in either mode (N, N⁶, N⁶₄).
  if (interval === 1 && chord.suffix === "") return { numeral: "N", figure: figuredBass(chord), after: "" };
  const table = keyMode === "major" ? MAJOR_ROMAN : MINOR_ROMAN;
  const target = secondary ? secondaryTarget(chord, interval, keyMode) : null;
  const lt     = secondary && !target ? leadingToneTarget(chord, interval, keyMode) : null;
  const base  = target ? "V" : lt ? "VII" : table[interval];   // e.g. "♭VII" or "IV"

  // Separate any leading ♭/♯ prefix from the numeral letters.
  const m       = base.match(/^([♭♯]?)(.+)$/);
  const prefix  = m[1];
  const letters = m[2];                       // e.g. "VII"

  // Minor-quality suffixes: m, m7, mMaj7, m7b5, m9, m11, madd9, m6.
  // Starts with 'm' but is NOT "maj7" / "maj9" (those are major quality).
  const sfx     = chord.suffix;
  const isMinor = sfx.startsWith("m") && !sfx.startsWith("maj");
  // Full diminished (shows °); half-diminished (m7b5) is minor with ø (viiø7).
  const isDim   = sfx === "dim" || sfx === "dim7";
  const isAug   = sfx === "aug";

  // Case: minor/dim → lowercase, major/aug/sus/power → uppercase.
  let numeral = (isMinor || isDim) ? letters.toLowerCase() : letters;
  let roman   = prefix + numeral;
  if (isDim) roman += "°";
  if (isAug) roman += "+";

  // Extension label appended after the degree+quality symbol.
  const EXT_MAP = {
    "":         "",       "m":      "",       "dim":    "",       "aug":    "",
    "sus4":     "sus4",   "sus2":   "sus2",   "sus2sus4":    "sus2sus4",
    "7sus4":    "7sus4",  "7sus2":  "7sus2",  "7sus2sus4":   "7sus2sus4",
    "maj7sus4": "maj7sus4","maj7sus2":"maj7sus2","maj7sus2sus4":"maj7sus2sus4",
    "13sus4":   "13sus4",
    "add2":     "add2",   "madd2":  "add2",   "add4":   "add4",   "madd4":  "add4",   "madd2add4": "add2add4", "add2add4": "add2add4", "(b5)": "(♭5)",
    "6":        "6",      "m6":     "6",      "6/9":    "6/9",    "m6/9":   "6/9",
    "maj7":     "maj7",   "7":      "7",      "m7":     "7",     "mM7":    "maj7",
    "m7b5":     "ø7",    "dim7":   "7",      "7#5":    "7♯5",   "7b5":    "7♭5",
    "maj7#5":   "maj7♯5", "maj7(#11)": "maj7(♯11)", "maj9(#11)": "maj9(♯11)", "maj13(#11)": "maj13(♯11)",
    "maj11":    "maj11",  "mM9":    "maj9",   "mM11":   "maj11", "mM13":   "maj13",
    "9":        "9",      "maj9":   "maj9",   "m9":     "9",
    "7b9":      "7♭9",    "7#9":    "7♯9",    "7#11":   "7♯11",  "m11":    "11",
    "7b13":     "7♭13",   "9#11":   "9♯11",
    "9#5":      "9♯5",    "maj9#5": "maj9♯5", "m9b5":   "ø9",    "m11b5":  "ø11",  "m7b13":  "7♭13",
    "11":       "11",     "6/9#11": "6/9♯11", "13#11":  "13♯11", "13b9#11": "13♭9♯11", "13#9#11": "13♯9♯11",
    "13sus4b9": "13sus4♭9",
    "13":       "13",     "maj13":  "maj13",  "m13":    "13",
    "13b9":     "13♭9",   "13#9":   "13♯9",
    "7b5b9":    "7♭5♭9",  "7#5b9":  "7♯5♭9", "7b5#9":  "7♭5♯9", "7#5#9":  "7♯5♯9",
    "7alt":     "7alt",   "5":      "",
    "m7#11":    "7♯11",   "m9#11":  "9♯11",   "m13#11": "13♯11", "m6/9#11": "6/9♯11",
    "mM9#11":   "maj9♯11", "m7#11b13": "7♯11♭13", "m9#11b13": "9♯11♭13",
  };
  const ext = EXT_MAP[sfx] ?? sfx.replace(/#/g, "♯").replace(/b/g, "♭");

  // Figured bass for inversions (bass is the chord's 3rd, 5th or 7th): triads 6 / 6-4, 7th chords
  // 6-5 / 4-3 / 4-2. The figure replaces the 7, and anything else goes in brackets: V⁶₅(♭9), I⁶(add2).
  // A diminished 7th may be read from another of its notes (Adim7 → F♯dim7, vii°⁶₅/V).
  const figure = figuredBass(chord, lt ? (chord.rootPC + lt.shift) % 12 : chord.rootPC);
  const of = target ? "/" + target : lt && lt.target ? "/" + lt.target : "";
  if (!figure) return { numeral: roman + ext + of, figure: null, after: "" };
  const m2 = ext.match(/^(maj|ø)?(7|9|11|13)?(.*)$/);
  const rest = (m2[2] && m2[2] !== "7" ? m2[2] : "") + m2[3];
  return { numeral: roman + (m2[1] || ""), figure, after: (rest ? "(" + rest.replace(/^\((.*)\)$/, "$1") + ")" : "") + of };
}

// Augmented 6th chords, in either mode: exactly these notes above the tonic, with ♭6 in the bass.
// It+6 ♭6 1 ♯4, Fr+6 ♭6 1 2 ♯4, Ger+6 ♭6 1 ♭3 ♯4 (in C: A♭ C F♯, A♭ C D F♯, A♭ C E♭ F♯).
const AUG_SIXTHS = { "0,6,8": "It", "0,2,6,8": "Fr", "0,3,6,8": "Ger" };
function augmentedSixth(midis, keyPC) {
  const bass = Math.min(...midis);
  if ((bass - keyPC + 120) % 12 !== 8) return null;
  const ivs = [...new Set(midis.map(m => (m - keyPC + 120) % 12))].sort((a, b) => a - b);
  return AUG_SIXTHS[ivs.join(",")] ?? null;
}

// An augmented 6th chord's notes are spelled from the key, so the 6th itself shows: A♭ C E♭ F♯ in C.
const AUG6_DEGREES = { 8: { semitone: 8, step: 5 }, 0: { semitone: 0, step: 0 }, 2: { semitone: 2, step: 1 },
                       3: { semitone: 3, step: 2 }, 6: { semitone: 6, step: 3 } };
function spellAugmentedSixthNote(midi, keyPC, keyMode) {
  const tonic = ALL_KEYS.find(k => k.pc === keyPC && k.mode === keyMode).label.split(" ")[0]
    .replace("♯", "#").replace("♭", "b");
  return withOctave(spellDegree(tonic, AUG6_DEGREES[(midi - keyPC + 120) % 12]), midi);
}

// Secondary dominants: the degree a dominant chord resolves to (a 5th below its root), or null.
// Dominant 7th-type chords (major 3rd + minor 7th) and major triads that aren't already in the key qualify;
// targets are the key's major and minor triads other than the tonic (no diminished ones).
const SECONDARY_TARGETS = { major: { 2: "ii", 4: "iii", 5: "IV", 7: "V", 9: "vi" },
                            minor: { 3: "III", 5: "iv", 7: "V", 8: "VI", 10: "VII" } };
const DIATONIC_MAJOR_TRIADS = { major: [0, 5, 7], minor: [3, 5, 7, 8, 10] };   // IV in minor: melodic minor
function secondaryTarget(chord, interval, keyMode) {
  const semis = chord.tones.map(t => t.semitone % 12);
  const dominant7 = semis.includes(4) && semis.includes(10);
  const triad = chord.suffix === "" && !DIATONIC_MAJOR_TRIADS[keyMode].includes(interval);
  if (!dominant7 && !triad) return null;
  return SECONDARY_TARGETS[keyMode][(interval + 5) % 12] ?? null;
}

// Secondary leading-tone chords: a dim triad, dim7 or half-diminished chord a half step below one of the
// key's major or minor chords reads vii°/x, vii°7/x or viiø7/x; below the tonic it's plain vii°7.
// Chords already in the key (vii° in major, ii° in minor) are left alone. A dim7 can be heard from any of
// its four notes, so the recognised root is tried first, then the tonic, then V, ii, vi, IV, iii (major)
// or V, iv, VI, III, VII (minor). Returns { shift, target } (target "" for the tonic), or null.
const DIATONIC_DIM = { major: [11], minor: [2] };
const LT_PRIORITY  = { major: [0, 7, 2, 9, 5, 4], minor: [0, 7, 5, 8, 3, 10] };
function leadingToneTarget(chord, interval, keyMode) {
  const sfx = chord.suffix;
  const dim7 = sfx === "dim7";
  if (!dim7 && !["dim", "m7b5", "m9b5", "m11b5"].includes(sfx)) return null;
  if (!dim7 && DIATONIC_DIM[keyMode].includes(interval)) return null;
  const label = t => t === 0 ? "" : SECONDARY_TARGETS[keyMode][t];
  const options = (dim7 ? [0, 3, 6, 9] : [0])
    .map(shift => ({ shift, target: label((interval + shift + 1) % 12), t: (interval + shift + 1) % 12 }))
    .filter(o => o.target !== undefined);
  if (!options.length) return null;
  if (options[0].shift === 0) return options[0];
  return options.sort((a, b) => LT_PRIORITY[keyMode].indexOf(a.t) - LT_PRIORITY[keyMode].indexOf(b.t))[0];
}

// A diminished 7th read from another of its notes is spelled from that root, as the leading tone of
// its target: A C E♭ F♯ (vii°⁶₅/V in C), not A C E♭ G♭. Returns the note name with octave, or null.
const SCALE_STEPS = { major: { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 },
                      minor: { 0: 0, 2: 1, 3: 2, 5: 3, 7: 4, 8: 5, 10: 6 } };
function spellReadDim7Note(midi, chord, keyPC, keyMode) {
  if (!chord || chord.suffix !== "dim7") return null;
  const lt = leadingToneTarget(chord, (chord.rootPC - keyPC + 12) % 12, keyMode);
  if (!lt || lt.shift === 0) return null;
  const tonic = ALL_KEYS.find(k => k.pc === keyPC && k.mode === keyMode).label.split(" ")[0]
    .replace("♯", "#").replace("♭", "b");
  const target = spellDegree(tonic, { semitone: lt.t, step: SCALE_STEPS[keyMode][lt.t] });
  const root = spellDegree(target, { semitone: 11, step: 6 });
  if (/##|bb/.test(root)) return null;   // a G𝄪 root would be harder to read than the plain spelling
  const rootPC = (chord.rootPC + lt.shift) % 12;
  const tone = chord.tones.find(t => t.semitone % 12 === (midi - rootPC + 120) % 12);
  return tone ? withOctave(spellDegree(root, tone), midi) : null;
}

// The figured-bass numbers for an inverted chord, top to bottom (["6", "5"]), or null.
// rootPC lets a diminished 7th be figured from a different root than the one it was named on.
function figuredBass(chord, rootPC = chord.rootPC) {
  if (!chord.tones) return null;
  const bassPC = chord.bassName ? pcFromName(chord.bassName) : chord.rootPC;
  const bassIv = (bassPC - rootPC + 12) % 12;
  if (bassIv === 0) return null;
  const bassTone = chord.tones.find(t => t.semitone % 12 === bassIv);
  if (!bassTone) return null;
  const has7 = chord.tones.some(t => t.step === 6);
  const figs = has7 ? { 2: ["6", "5"], 4: ["4", "3"], 6: ["4", "2"] } : { 2: ["6"], 4: ["6", "4"] };
  return figs[bassTone.step] ?? null;
}

function pcFromName(name) {
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[name[0]];
  let acc = 0;
  for (const ch of name.slice(1)) acc += (ch === "#" || ch === "♯") ? 1 : (ch === "b" || ch === "♭") ? -1 : 0;
  return (base + acc + 12) % 12;
}

// Returns a Roman numeral string like "V7", "ii7♭9", "V6/5(♭9)" (figures joined with "/").
function getRomanNumeral(chord, keyPC, keyMode, midis, secondary = false) {
  const r = getRomanParts(chord, keyPC, keyMode, midis, secondary);
  if (!r) return "";
  return r.numeral + (r.figure ? r.figure.join("/") : "") + r.after;
}
