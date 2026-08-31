// Web MIDI API integration — tracks currently held notes and fires a callback
// whenever the note set changes (note-on / note-off / all-notes-off).

let midiAccess = null;
let selectedInput = null;
const activeNotes = new Set(); // held midi note numbers

// onNotesChange(sortedMidiArray) is called on every state change.
let onNotesChange = null;

async function initMidi(onChange) {
  onNotesChange = onChange;
  if (!navigator.requestMIDIAccess) return false;
  try {
    midiAccess = await navigator.requestMIDIAccess({ sysex: false });
    midiAccess.onstatechange = () => populateMidiDevices();
    populateMidiDevices();
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
  if (selectedInput) {
    selectedInput.onmidimessage = null;
    await selectedInput.close().catch(() => {});
  }
  selectedInput = deviceId ? (midiAccess.inputs.get(deviceId) ?? null) : null;
  activeNotes.clear();
  if (onNotesChange) onNotesChange([]);
  if (!selectedInput) return;
  await selectedInput.open();
  selectedInput.onmidimessage = handleMidi;
}

function handleMidi(event) {
  const [status, note, velocity] = event.data;
  console.log("MIDI:", status.toString(16), note, velocity);
  const cmd = status & 0xF0;
  if (cmd === 0x90 && velocity > 0) {
    activeNotes.add(note);
  } else if (cmd === 0x80 || (cmd === 0x90 && velocity === 0)) {
    activeNotes.delete(note);
  } else if (cmd === 0xB0 && note === 123) {
    // All Notes Off CC
    activeNotes.clear();
  }
  if (onNotesChange) onNotesChange([...activeNotes].sort((a, b) => a - b));
}

function getMidiNotes() {
  return [...activeNotes].sort((a, b) => a - b);
}

function stopMidi() {
  if (selectedInput) selectedInput.onmidimessage = null;
  activeNotes.clear();
}
