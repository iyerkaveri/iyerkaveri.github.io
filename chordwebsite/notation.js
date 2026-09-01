// Render the recognized chord's canonical root-position voicing on a treble staff.
// We deliberately ignore the raw detected frequencies here — showing every stray
// harmonic/octave that the mic picked up looked noisy, so instead we rebuild a
// clean root, 3rd, 5th (...) stack from the matched chord's tones.

const { Renderer, Stave, StaveNote, StaveConnector, Voice, Formatter, Accidental } = Vex.Flow;

const LETTER_ORDER = ["C", "D", "E", "F", "G", "A", "B"];
const NATURAL_SEMITONE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// Split a chromatic note name like "C#", "Db", or "C" into { letter, accidental } (-1/0/1).
function parseChromaticRoot(rootName) {
  const letter = rootName[0];
  const accidental = rootName.includes("#") ? 1 : rootName.includes("b") ? -1 : 0;
  return { letter, accidental };
}

// Spell a chord tone using its diatonic step from the root, so a b3 lands on
// the correct letter+flat (e.g. Bb on the B line) instead of the chromatically
// nearest sharp (A#) — which is what plain semitone math would give you.
function spellTone(rootLetter, rootAccidental, tone, baseMidi) {
  const rootLetterIdx = LETTER_ORDER.indexOf(rootLetter);
  const targetLetter = LETTER_ORDER[(rootLetterIdx + tone.step) % 7];
  const naturalTargetPC = NATURAL_SEMITONE[targetLetter];

  const rootPC = (NATURAL_SEMITONE[rootLetter] + rootAccidental + 12) % 12;
  const actualTargetPC = (rootPC + tone.semitone) % 12;

  let accidental = ((actualTargetPC - naturalTargetPC + 6) % 12) - 6;

  const midi = baseMidi + tone.semitone;
  const octave = Math.floor(midi / 12) - 1;

  // Some chord tones (e.g. the dim5 of a flat-rooted diminished triad) land
  // a whole step off the natural letter, requiring a double sharp/flat.
  const ACCIDENTAL_SYMBOLS = { "-2": "bb", "-1": "b", "0": "", "1": "#", "2": "##" };
  const accidentalSymbol = ACCIDENTAL_SYMBOLS[accidental] ?? "";
  return {
    midi,
    name: `${targetLetter}${accidentalSymbol}${octave}`,
    accidental: accidentalSymbol,
  };
}

// Build an ascending root-position stack (root, 3rd, 5th, ...) in octave 4,
// from a recognized chord's {root, tones}.
function buildCanonicalChordNotes(chordMatch) {
  const { letter, accidental } = parseChromaticRoot(chordMatch.root);
  const rootPC = (NATURAL_SEMITONE[letter] + accidental + 12) % 12;
  const baseOctave = 4;
  const baseMidi = (baseOctave + 1) * 12 + rootPC; // e.g. C4 = 60

  return chordMatch.tones.map(tone => spellTone(letter, accidental, tone, baseMidi));
}

// Convert our note name (e.g. "Bbb4", "C##4", "G4") to a VexFlow key (e.g. "b/4")
function toVexKey(noteName) {
  const match = noteName.match(/^([A-G])(#{1,2}|b{1,2})?(\d)$/);
  if (!match) return null;
  const [, letter, , octave] = match;
  return `${letter.toLowerCase()}/${octave}`;
}

function drawStave(ctx, clef, y, width, noteList) {
  const stave = new Stave(20, y, width - 40);
  stave.addClef(clef);
  stave.setContext(ctx).draw();

  if (noteList.length === 0) {
    const rest = new StaveNote({ clef, keys: ["b/4"], duration: "wr" });
    const voice = new Voice({ num_beats: 4, beat_value: 4 });
    voice.addTickables([rest]);
    new Formatter().joinVoices([voice]).format([voice], width - 80);
    voice.draw(ctx, stave);
    return;
  }

  const keys = noteList.map(n => toVexKey(n.name)).filter(Boolean);
  if (keys.length === 0) return;

  const staveNote = new StaveNote({ clef, keys, duration: "w" });
  noteList.forEach((n, i) => {
    if (n.accidental) staveNote.addModifier(new Accidental(n.accidental), i);
  });

  const voice = new Voice({ num_beats: 4, beat_value: 4 });
  voice.addTickables([staveNote]);
  new Formatter().joinVoices([voice]).format([voice], width - 80);
  voice.draw(ctx, stave);
}

// Convert a MIDI note number to a VexFlow key + accidental object.
function midiToVexNote(midi, preference) {
  const pc = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  const name = (preference === "flat" ? FLAT_NAMES : SHARP_NAMES)[pc];
  const letter = name[0];
  const acc = name.slice(1); // "#", "b", or ""
  return { key: `${letter.toLowerCase()}/${octave}`, accidental: acc };
}

// Render actual MIDI notes on a grand staff (treble + bass) with brace.
// Both voices are formatted together so notes align vertically regardless
// of whether one hand has accidentals and the other does not.
// midiNotes is an array of sorted midi integers.
function renderGrandStaffNotation(midiNotes, preference) {
  const container = document.getElementById("midiNotation");
  container.innerHTML = "";

  const trebleVex = midiNotes.filter(m => m >= 60).map(m => midiToVexNote(m, preference));
  const bassVex   = midiNotes.filter(m => m < 60).map(m => midiToVexNote(m, preference));

  const width = Math.min((container.parentElement?.clientWidth ?? 500) - 40, 500);
  const height = 230;

  const renderer = new Renderer(container, Renderer.Backends.SVG);
  renderer.resize(width, height);
  const ctx = renderer.getContext();

  const trebleStave = new Stave(20, 10,  width - 40).addClef("treble").setContext(ctx).draw();
  const bassStave   = new Stave(20, 120, width - 40).addClef("bass").setContext(ctx).draw();

  new StaveConnector(trebleStave, bassStave)
    .setType(StaveConnector.type.BRACE).setContext(ctx).draw();
  new StaveConnector(trebleStave, bassStave)
    .setType(StaveConnector.type.SINGLE_LEFT).setContext(ctx).draw();

  // Build only the voices that have notes; format them together so
  // accidentals on one stave don't shift noteheads out of vertical alignment.
  const voices = [];
  let trebleVoice = null, bassVoice = null;

  if (trebleVex.length > 0) {
    const sn = new StaveNote({ clef: "treble", keys: trebleVex.map(n => n.key), duration: "w" });
    trebleVex.forEach((n, i) => { if (n.accidental) sn.addModifier(new Accidental(n.accidental), i); });
    trebleVoice = new Voice({ num_beats: 4, beat_value: 4 }).addTickables([sn]);
    voices.push(trebleVoice);
  }

  if (bassVex.length > 0) {
    const sn = new StaveNote({ clef: "bass", keys: bassVex.map(n => n.key), duration: "w" });
    bassVex.forEach((n, i) => { if (n.accidental) sn.addModifier(new Accidental(n.accidental), i); });
    bassVoice = new Voice({ num_beats: 4, beat_value: 4 }).addTickables([sn]);
    voices.push(bassVoice);
  }

  if (voices.length === 0) return;

  const formatter = new Formatter();
  voices.forEach(v => formatter.joinVoices([v]));
  formatter.format(voices, width - 80);

  if (trebleVoice) trebleVoice.draw(ctx, trebleStave);
  if (bassVoice)   bassVoice.draw(ctx, bassStave);
}

// Render the canonical root-position chord on a single treble staff.
function renderChordNotation(chordMatch) {
  const container = document.getElementById("notation");
  container.innerHTML = "";
  if (!chordMatch) return;

  const notes = buildCanonicalChordNotes(chordMatch);

  const width = Math.min(container.parentElement.clientWidth - 40, 500);
  const height = 130;

  const renderer = new Renderer(container, Renderer.Backends.SVG);
  renderer.resize(width, height);
  const ctx = renderer.getContext();

  drawStave(ctx, "treble", 10, width, notes);
}
