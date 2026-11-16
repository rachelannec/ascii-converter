const charInput = document.getElementById('charInput');
const hexOutput = document.getElementById('hexOutput');
const decOutput = document.getElementById('decOutput');
const binOutput = document.getElementById('binOutput');

charInput.addEventListener('input', (e) => {
  const text = e.target.value;
  
  let hexStr = '';
  let decStr = '';
  let binStr = '';

  for (let i = 0; i < text.length; i++) {
    // Get the decimal ASCII code
    const code = text.charCodeAt(i);
    
    // Convert to formats needed for emu8086
    // Pad hex with 0 so it's always 2 digits (e.g., 0A instead of A)
    hexStr += code.toString(16).toUpperCase().padStart(2, '0') + 'h '; 
    decStr += code.toString(10) + ' ';
    binStr += code.toString(2).padStart(8, '0') + 'b ';
  }

  hexOutput.innerText = hexStr.trim();
  decOutput.innerText = decStr.trim();
  binOutput.innerText = binStr.trim();
});