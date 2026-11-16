const fs = require('fs');
const path = require('path');

const charInput = document.getElementById('charInput');
const outputBody = document.getElementById('outputBody');
const crlfToggle = document.getElementById('crlfToggle');
const dollarToggle = document.getElementById('dollarToggle');
const dosboxScriptOut = document.getElementById('dosboxScriptOut');
const dosboxDebugOut = document.getElementById('dosboxDebugOut');
const asmDbOut = document.getElementById('asmDbOut');
const clearInputBtn = document.getElementById('clearInputBtn');

// Map invisible/special ASCII codes to readable labels
const specialChars = {
  0: '[NUL] (Null)',
  7: '[BEL] (Beep / Bell)',
  8: '[BS] (Backspace)',
  9: '[TAB] (Horizontal Tab)',
  10: '[LF] (Line Feed)',
  11: '[VT] (Vertical Tab)',
  12: '[FF] (Form Feed / New Page)',
  13: '[CR] (Carriage Return)',
  26: '[SUB] (Ctrl+Z / EOF)',
  27: '[ESC] (Escape)',
  32: '[SPACE]',
  36: "'$' (DOS String Terminator)",
  127: '[DEL] (Delete)'
};

// Format raw 2-digit hex for DOSBox (e.g. "0D", "41", "B3")
function toDosboxHex(code) {
  return code.toString(16).toUpperCase().padStart(2, '0');
}

// Format MASM / TASM / emu8086 hex literal (e.g. "0Dh", "41h", "0B3h")
// Prefix with '0' if the first hex digit is A-F
function toAsmHex(code) {
  const rawHex = toDosboxHex(code);
  const needsLeadingZero = /^[A-F]/.test(rawHex);
  return (needsLeadingZero ? '0' : '') + rawHex + 'h';
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Convert input text into an array of byte codes, respecting the CR+LF option
function getByteCodes(text) {
  const bytes = [];
  const useCrLf = crlfToggle.checked;

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code === 10 && useCrLf) {
      // If previous char wasn't already CR (13), emit CR (0Dh) before LF (0Ah)
      if (i === 0 || text.charCodeAt(i - 1) !== 13) {
        bytes.push({ code: 13, char: '\r' });
      }
      bytes.push({ code: 10, char: '\n' });
    } else {
      bytes.push({ code, char: text[i] });
    }
  }
  return bytes;
}

function updateConverter() {
  const text = charInput.value;
  const bytes = getByteCodes(text);

  if (bytes.length === 0) {
    outputBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: #777; padding: 18px;">
          Type or insert characters above to convert into DOSBox &amp; emu8086 hexadecimal.
        </td>
      </tr>`;
    dosboxScriptOut.textContent = '--';
    dosboxDebugOut.textContent = '--';
    asmDbOut.textContent = '--';
    return;
  }

  let rowsHtml = '';
  const rawHexList = [];
  const asmHexList = [];

  bytes.forEach((item, idx) => {
    const { code, char } = item;
    const dosHex = toDosboxHex(code);
    const asmHex = toAsmHex(code);
    const dec = code.toString(10);
    const bin = code.toString(2).padStart(8, '0') + 'b';
    const offset = '+' + idx.toString(16).toUpperCase().padStart(2, '0') + 'h';

    rawHexList.push(dosHex);
    asmHexList.push(asmHex);

    let displayChar = escapeHtml(char);
    if (specialChars[code]) {
      displayChar = `<span class="special-char">${specialChars[code]}</span>`;
    } else if (code < 32) {
      displayChar = `<span class="special-char">[CTRL+${String.fromCharCode(code + 64)}]</span>`;
    }

    const instr = `MOV DL, ${asmHex}`;

    rowsHtml += `<tr>
      <td style="color:#888;">${offset}</td>
      <td>${displayChar}</td>
      <td class="hex-dosbox">${dosHex}</td>
      <td class="hex-asm">${asmHex}</td>
      <td class="asm-instr"><code>${instr}</code></td>
      <td>${dec}</td>
      <td>${bin}</td>
    </tr>`;
  });

  outputBody.innerHTML = rowsHtml;

  // Build summary snippets for DOSBox debug and MASM/emu8086 DB
  const appendDollar = dollarToggle.checked;
  const debugBytes = [...rawHexList];
  const dbBytes = [...asmHexList];

  if (appendDollar && rawHexList[rawHexList.length - 1] !== '24') {
    debugBytes.push('24');
    dbBytes.push("'$'");
  }

  dosboxDebugOut.textContent = `e 0100 ${debugBytes.join(' ')}`;
  asmDbOut.textContent = `MSG DB ${dbBytes.join(', ')}`;

  // Build DOSBox debug script (a 100 / mov ah, 02 / mov dx, <hex> / int 21 ...)
  const scriptLines = ['a 100', 'mov ah, 02'];
  bytes.forEach((item) => {
    const shortHex = item.code.toString(16).toLowerCase();
    scriptLines.push(`mov dx, ${shortHex}`);
    scriptLines.push('int 21');
  });
  scriptLines.push('int 20', '', 'rcx', '100', 'n PROG.com', 'w', 'q');
  dosboxScriptOut.textContent = scriptLines.join('\n');
}

charInput.addEventListener('input', updateConverter);
crlfToggle.addEventListener('change', updateConverter);
dollarToggle.addEventListener('change', updateConverter);

// Allow typing Tab character directly into textarea
charInput.addEventListener('keydown', function (e) {
  if (e.key === 'Tab') {
    e.preventDefault();
    insertAtCursor('\t');
  }
});

function insertAtCursor(str) {
  const start = charInput.selectionStart;
  const end = charInput.selectionEnd;
  charInput.value = charInput.value.substring(0, start) + str + charInput.value.substring(end);
  charInput.selectionStart = charInput.selectionEnd = start + str.length;
  charInput.focus();
  updateConverter();
}

// Quick Insert buttons
document.querySelectorAll('.chip-btn[data-charcode]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const code = parseInt(btn.getAttribute('data-charcode'), 10);
    // If inserting LF (10) explicitly via button, temporarily bypass automatic CR prepend if user only wants LF
    insertAtCursor(String.fromCharCode(code));
  });
});

clearInputBtn.addEventListener('click', () => {
  charInput.value = '';
  charInput.focus();
  updateConverter();
});

// Copy buttons
document.querySelectorAll('.copy-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const targetId = btn.getAttribute('data-copy-target');
    const targetEl = document.getElementById(targetId);
    if (!targetEl || targetEl.textContent === '--') return;

    navigator.clipboard.writeText(targetEl.textContent).then(() => {
      const original = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => {
        btn.textContent = original;
      }, 1200);
    });
  });
});

// Navigation Tabs
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const targetTab = btn.getAttribute('data-tab');
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach((sec) => sec.classList.remove('active'));

    btn.classList.add('active');
    document.getElementById(targetTab).classList.add('active');
  });
});

// Modal for ASCII Conversion Chart
const chartModal = document.getElementById('chartModal');
const openChartBtn = document.getElementById('openChartBtn');
const closeChartBtn = document.getElementById('closeChartBtn');
const chartImage = document.getElementById('chartImage');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const zoomResetBtn = document.getElementById('zoomResetBtn');

let currentZoom = 100;

function applyZoom() {
  if (currentZoom === 100) {
    chartImage.style.maxWidth = '100%';
    chartImage.style.width = 'auto';
  } else {
    chartImage.style.maxWidth = 'none';
    chartImage.style.width = `${currentZoom}%`;
  }
}

openChartBtn.addEventListener('click', () => {
  chartModal.classList.add('open');
});

closeChartBtn.addEventListener('click', () => {
  chartModal.classList.remove('open');
});

chartModal.addEventListener('click', (e) => {
  if (e.target === chartModal) {
    chartModal.classList.remove('open');
  }
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && chartModal.classList.contains('open')) {
    chartModal.classList.remove('open');
  }
});

zoomInBtn.addEventListener('click', () => {
  currentZoom = Math.min(250, currentZoom + 25);
  applyZoom();
});

zoomOutBtn.addEventListener('click', () => {
  currentZoom = Math.max(50, currentZoom - 25);
  applyZoom();
});

zoomResetBtn.addEventListener('click', () => {
  currentZoom = 100;
  applyZoom();
});

// Uncommon & Exam-Critical ASCII Cheatsheet Data
const cheatsheetItems = [
  {
    name: 'NUL (Null Character)',
    code: 0,
    category: 'Control',
    notes: 'C-style string terminator (00h). Also returned first by INT 16h / INT 21h when pressing extended keys (arrows, F1–F12) before the scan code.'
  },
  {
    name: 'BEL (Bell / Beep)',
    code: 7,
    category: 'Control',
    notes: 'Triggers an audible system beep when printed via INT 21h / AH=02h (MOV DL, 07h). Classic exam trick question!'
  },
  {
    name: 'BS (Backspace)',
    code: 8,
    category: 'Control',
    notes: 'Moves cursor 1 column left (non-destructive unless you print SPACE 20h then BS 08h again). Returned in AL when Backspace key is pressed.'
  },
  {
    name: 'TAB (Horizontal Tab)',
    code: 9,
    category: 'Control',
    notes: 'Advances cursor to the next 8-column tab stop.'
  },
  {
    name: 'LF (Line Feed)',
    code: 10,
    category: 'Control',
    notes: 'Moves cursor vertically DOWN 1 line in the SAME column! Does NOT return cursor to column 0 in DOSBox/emu8086 unless paired with CR (0Dh).'
  },
  {
    name: 'FF (Form Feed / New Page)',
    code: 12,
    category: 'Control',
    notes: 'Page break control character; clears screen or ejects printer page in some DOS environments.'
  },
  {
    name: 'CR (Carriage Return / Enter)',
    code: 13,
    category: 'Control',
    notes: 'Moves cursor to column 0 of the CURRENT line! Also the exact value returned in AL by INT 21h / AH=01h when the user presses Enter.'
  },
  {
    name: 'SUB (Ctrl+Z / DOS EOF)',
    code: 26,
    category: 'Control',
    notes: 'End-of-File (EOF) marker in DOS text files.'
  },
  {
    name: 'ESC (Escape)',
    code: 27,
    category: 'Control',
    notes: 'Returned when ESC key is pressed. Frequently tested in input loops (e.g., CMP AL, 1Bh / JE EXIT).'
  },
  {
    name: 'SPACE (Blank Space)',
    code: 32,
    category: 'Printable / Special',
    notes: 'First printable ASCII character (20h / 32). Also equals the bit mask (bit 5) used to toggle between Uppercase and Lowercase letters!'
  },
  {
    name: "'$' (Dollar Sign)",
    code: 36,
    category: 'DOS Terminator',
    notes: 'REQUIRED string terminator for INT 21h / AH=09h (24h / 36). Without it, DOS keeps printing random memory until it finds 24h!'
  },
  {
    name: "'0' – '9' (ASCII Digits)",
    code: 48,
    rangeEnd: 57,
    category: 'Range Boundary',
    notes: "'0' is 30h (48) and '9' is 39h (57). Convert single digit 0–9 to ASCII: ADD DL, 30h. Convert ASCII digit to numeric: SUB AL, 30h."
  },
  {
    name: "'A' – 'Z' (Uppercase Letters)",
    code: 65,
    rangeEnd: 90,
    category: 'Range Boundary',
    notes: "'A' is 41h (65) and 'Z' is 5Ah (90). To convert uppercase to lowercase: ADD AL, 20h (or OR AL, 20h)."
  },
  {
    name: "'a' – 'z' (Lowercase Letters)",
    code: 97,
    rangeEnd: 122,
    category: 'Range Boundary',
    notes: "'a' is 61h (97) and 'z' is 7Ah (122). To convert lowercase to uppercase: SUB AL, 20h (or AND AL, 0DFh)."
  },
  {
    name: 'DEL (Delete)',
    code: 127,
    category: 'Control',
    notes: 'Last 7-bit standard ASCII code (7Fh / 127 — all 7 bits set: 01111111b).'
  },
  {
    name: '░ ▒ ▓ (Shaded Blocks)',
    code: 176,
    rangeEnd: 178,
    category: 'Extended DOS (CP437)',
    notes: 'Light (B0h/176), Medium (B1h/177), and Dark (B2h/178) shade characters in DOSBox / emu8086 video memory.'
  },
  {
    name: '│ (Box Vertical Line)',
    code: 179,
    category: 'Extended DOS (CP437)',
    notes: 'Single vertical box-drawing border in DOS CP437 (MOV DL, 0B3h).'
  },
  {
    name: '─ (Box Horizontal Line)',
    code: 196,
    category: 'Extended DOS (CP437)',
    notes: 'Single horizontal box-drawing border in DOS CP437 (MOV DL, 0C4h).'
  },
  {
    name: '┌ ┐ └ ┘ (Box Corners)',
    code: 218,
    customDosHex: 'DA / BF / C0 / D9',
    customAsmHex: '0DAh / 0BFh / 0C0h / 0D9h',
    customDec: '218 / 191 / 192 / 217',
    category: 'Extended DOS (CP437)',
    notes: 'Top-Left (0DAh), Top-Right (0BFh), Bottom-Left (0C0h), Bottom-Right (0D9h) single-line box corners.'
  },
  {
    name: '█ (Full Solid Block)',
    code: 219,
    category: 'Extended DOS (CP437)',
    notes: 'Solid foreground block (0DBh / 219), commonly used for drawing bars or cursors in DOSBox.'
  }
];

const cheatsheetBody = document.getElementById('cheatsheetBody');
const cheatsheetSearch = document.getElementById('cheatsheetSearch');

function renderCheatsheet(filterText = '') {
  const query = filterText.trim().toLowerCase();
  let html = '';

  cheatsheetItems.forEach((item) => {
    const dosHex = item.customDosHex
      ? item.customDosHex
      : item.rangeEnd
      ? `${toDosboxHex(item.code)}–${toDosboxHex(item.rangeEnd)}`
      : toDosboxHex(item.code);

    const asmHex = item.customAsmHex
      ? item.customAsmHex
      : item.rangeEnd
      ? `${toAsmHex(item.code)}–${toAsmHex(item.rangeEnd)}`
      : toAsmHex(item.code);

    const dec = item.customDec
      ? item.customDec
      : item.rangeEnd
      ? `${item.code}–${item.rangeEnd}`
      : item.code.toString(10);

    const bin = item.code.toString(2).padStart(8, '0') + 'b';

    const searchable = `${item.name} ${dosHex} ${asmHex} ${dec} ${bin} ${item.category} ${item.notes}`.toLowerCase();
    if (query && !searchable.includes(query)) return;

    html += `<tr>
      <td class="special-char">${escapeHtml(item.name)}</td>
      <td class="hex-dosbox">${dosHex}</td>
      <td class="hex-asm">${asmHex}</td>
      <td>${dec}</td>
      <td>${bin}</td>
      <td><span class="category-badge">${escapeHtml(item.category)}</span></td>
      <td>${escapeHtml(item.notes)}</td>
    </tr>`;
  });

  if (!html) {
    html = `<tr><td colspan="7" style="text-align:center; color:#777; padding: 16px;">No matching ASCII items found.</td></tr>`;
  }

  cheatsheetBody.innerHTML = html;
}

cheatsheetSearch.addEventListener('input', (e) => {
  renderCheatsheet(e.target.value);
});

// Atomic Examples Loader (reads all .html files from examples/ folder)
const examplesContainer = document.getElementById('examplesContainer');
const examplesFilterBar = document.getElementById('examplesFilterBar');
const reloadExamplesBtn = document.getElementById('reloadExamplesBtn');
let currentExampleFilter = 'ALL';

function loadAtomicExamples() {
  const examplesDir = path.join(__dirname, 'examples');
  if (!fs.existsSync(examplesDir)) {
    examplesContainer.innerHTML = `<p style="color:#888;">No <code>examples/</code> directory found.</p>`;
    return;
  }

  const files = fs
    .readdirSync(examplesDir)
    .filter((f) => f.endsWith('.html'))
    .sort();

  // Render filter buttons
  let filterHtml = `<span style="font-size: 12px; color: #9cdcfe; font-weight: bold;">Atomic Files (<code>examples/</code>):</span>`;
  filterHtml += `<button class="chip-btn example-filter-btn" data-file="ALL" style="${
    currentExampleFilter === 'ALL' ? 'background:#007acc;color:#fff;border-color:#007acc;' : ''
  }">All (${files.length})</button>`;

  files.forEach((file) => {
    const activeStyle =
      currentExampleFilter === file ? 'background:#007acc;color:#fff;border-color:#007acc;' : '';
    filterHtml += `<button class="chip-btn example-filter-btn" data-file="${escapeHtml(
      file
    )}" style="${activeStyle}">${escapeHtml(file)}</button>`;
  });

  examplesFilterBar.innerHTML = filterHtml;

  examplesFilterBar.querySelectorAll('.example-filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentExampleFilter = btn.getAttribute('data-file');
      loadAtomicExamples();
    });
  });

  // Render atomic example contents
  let contentHtml = '';
  const visibleFiles =
    currentExampleFilter === 'ALL' ? files : files.filter((f) => f === currentExampleFilter);

  visibleFiles.forEach((file) => {
    const fullPath = path.join(examplesDir, file);
    // Normalize "../assets/" to "assets/" so paths autocompleted inside examples/ resolve from index.html
    const rawHtml = fs
      .readFileSync(fullPath, 'utf-8')
      .replace(/(src|href)=(["'])\.\.\/assets\//g, '$1=$2assets/');
    contentHtml += `
      <div class="atomic-example-wrapper">
        <div class="example-file-tag">📄 Atomic File: <code>examples/${escapeHtml(file)}</code></div>
        ${rawHtml}
      </div>`;
  });

  examplesContainer.innerHTML =
    contentHtml || `<p style="color:#888;">No example files found in <code>examples/</code>.</p>`;

  // Auto-convert any plain <div class="samp-vid"> into a collapsible <details class="samp-vid"> dropdown
  examplesContainer.querySelectorAll('div.samp-vid').forEach((div) => {
    const details = document.createElement('details');
    details.className = 'samp-vid';

    const heading = div.querySelector('h4, h5, label');
    const titleText = heading ? heading.textContent : '🎬 Sample Video Walkthrough';
    if (heading) heading.remove();

    const summary = document.createElement('summary');
    summary.textContent = titleText;

    const body = document.createElement('div');
    body.className = 'samp-vid-body';
    while (div.firstChild) {
      body.appendChild(div.firstChild);
    }

    details.appendChild(summary);
    details.appendChild(body);
    div.replaceWith(details);
  });

  // Ensure all videos inside examples have controls and pause automatically when dropdown closes
  examplesContainer.querySelectorAll('details.samp-vid').forEach((details) => {
    const video = details.querySelector('video');
    if (video) {
      video.controls = true;
      details.addEventListener('toggle', () => {
        if (!details.open) {
          video.pause();
        }
      });
    }
  });
}

if (reloadExamplesBtn) {
  reloadExamplesBtn.addEventListener('click', () => {
    loadAtomicExamples();
    const orig = reloadExamplesBtn.textContent;
    reloadExamplesBtn.textContent = '✓ Reloaded!';
    setTimeout(() => {
      reloadExamplesBtn.textContent = orig;
    }, 1000);
  });
}

// Initialize views
renderCheatsheet();
updateConverter();
loadAtomicExamples();