// Web MIDI API integration — tracks currently held notes and fires a callback
// whenever the note set changes (note-on / note-off / all-notes-off).

let midiAccess = null;
let selectedInput = null;
const activeNotes = new Set(); // held midi note numbers

let onNotesChange = null;

async function initMidi(onChange) {
  onNotesChange = onChange;
  if (!navigator.requestMIDIAccess) return false;
  try {
    midiAccess = await navigator.requestMIDIAccess({ sysex: false });
    populateMidiDevices();
    // Set onstatechange AFTER initial setup to avoid a re-entrancy loop:
    // open() fires onstatechange, which would call populateMidiDevices again,
    // which would call connectMidiInput again, clearing activeNotes in a cycle.
    midiAccess.onstatechange = () => populateMidiDevices();
    return true;
  } catch (e) {
    console.warn("MIDI access denied:", e);
    return false;
  }
}

function populateMidiDevices() {
  const sel = document.getElementById("midiSelect");
  const prev = sel.value;
  sel.innerHTML = "";
  const inputs = [...midiAccess.inputs.values()];
  if (inputs.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No MIDI devices found";
    sel.appendChild(opt);
    connectMidiInput(null);
    return;
  }
  inputs.forEach(input => {
    const opt = document.createElement("option");
    opt.value = input.id;
    opt.textContent = input.name;
    sel.appendChild(opt);
  });
  const keepId = inputs.some(d => d.id === prev) ? prev : inputs[0].id;
  sel.value = keepId;
  connectMidiInput(keepId);
}

async function connectMidiInput(deviceId) {
  const newInput = deviceId ? (midiAccess.inputs.get(deviceId) ?? null) : null;

  // Already connected to this device — nothing to do.
  if (newInput === selectedInput && selectedInput !== null) return;

  // Detach from old input without closing the port (closing triggers
  // onstatechange, which would call connectMidiInput again in a loop).
  if (selectedInput) selectedInput.onmidimessage = null;

  selectedInput = newInput;
  activeNotes.clear();
  if (onNotesChange) onNotesChange([]);
  if (!selectedInput) return;

  await selectedInput.open();
  selectedInput.onmidimessage = handleMidi;
}

function handleMidi(event) {
  const [status, note, velocity] = event.data;
  const cmd = status & 0xF0;

  if (cmd === 0x90 && velocity > 0) {
    activeNotes.add(note);
  } else if (cmd === 0x80 || (cmd === 0x90 && velocity === 0)) {
    activeNotes.delete(note);
  } else if (cmd === 0xB0 && note === 123) {
    // All Notes Off
    activeNotes.clear();
  } else {
    // Clock, active sensing, etc. — don't fire change callback for these.
    return;
  }

  if (onNotesChange) onNotesChange([...activeNotes].sort((a, b) => a - b));
}

function getMidiNotes() {
  return [...activeNotes].sort((a, b) => a - b);
}

function stopMidi() {
  if (selectedInput) selectedInput.onmidimessage = null;
  selectedInput = null;
  activeNotes.clear();
}
