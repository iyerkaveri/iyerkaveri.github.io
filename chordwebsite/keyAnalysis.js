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

// Returns a Roman numeral string like "V7", "ii7♭9", "♭VII", etc.
// chord must have { rootPC, suffix } (as returned by recognizeChord).
// keyPC is the tonic pitch class (0–11); keyMode is "major" | "minor".
function getRomanNumeral(chord, keyPC, keyMode) {
  const interval = (chord.rootPC - keyPC + 12) % 12;
  const table = keyMode === "major" ? MAJOR_ROMAN : MINOR_ROMAN;
  const base  = table[interval];              // e.g. "♭VII" or "IV"

  // Separate any leading ♭/♯ prefix from the numeral letters.
  const m       = base.match(/^([♭♯]?)(.+)$/);
  const prefix  = m[1];
  const letters = m[2];                       // e.g. "VII"

  // Minor-quality suffixes: m, m7, mMaj7, m7b5, m9, m11, madd9, m6.
  // Starts with 'm' but is NOT "maj7" / "maj9" (those are major quality).
  const sfx     = chord.suffix;
  const isMinor = sfx.startsWith("m") && !sfx.startsWith("maj");
  // Full diminished (shows °); half-diminished (m7b5) is minor, not °.
  const isDim   = sfx === "dim" || sfx === "dim7";
  const isAug   = sfx === "aug" || sfx === "aug7";

  // Case: minor/dim → lowercase, major/aug/sus/power → uppercase.
  let numeral = (isMinor || isDim) ? letters.toLowerCase() : letters;
  let roman   = prefix + numeral;
  if (isDim) roman += "°";
  if (isAug) roman += "+";

  // Extension label appended after the degree+quality symbol.
  const EXT_MAP = {
    "":      "",      "m":     "",      "dim":   "",    "aug":  "",
    "sus4":  "sus4",  "sus2":  "sus2",
    "maj7":  "maj7",  "7":     "7",     "m7":    "7",   "mMaj7":"maj7",
    "m7b5":  "7♭5",   "dim7":  "7",     "aug7":  "7",   "7b5":  "7♭5",
    "9":     "9",     "maj9":  "maj9",  "m9":    "9",
    "7b9":   "7♭9",   "7#9":   "7♯9",   "7#11":  "7♯11","m11":  "11",
    "add9":  "add9",  "madd9": "add9",
    "6":     "6",     "m6":    "6",     "5":     "",
  };
  roman += (EXT_MAP[sfx] ?? sfx.replace(/#/g, "♯").replace(/b/g, "♭"));

  return roman;
}
