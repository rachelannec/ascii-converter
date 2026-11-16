const charInput = document.getElementById('charInput');
const outputBody = document.getElementById('outputBody');

// Map invisible/special ASCII codes to readable labels
const specialChars = {
  9: '[TAB]',
  10: '[LF] (Line Feed / Enter)',
  13: '[CR] (Carriage Return)',
  27: '[ESC]',
  32: '[SPACE]'
};

charInput.addEventListener('input', (e) => {
  const text = e.target.value;
  
  // Clear the table before generating new rows
  outputBody.innerHTML = ''; 

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    
    // Determine if it's a normal character or a special/invisible one
    let displayChar = text[i];
    if (specialChars[code]) {
      displayChar = `<span class="special-char">${specialChars[code]}</span>`;
    }

    // Convert to x86 assembly formats
    const hex = code.toString(16).toUpperCase().padStart(2, '0') + 'h'; 
    const dec = code.toString(10);
    const bin = code.toString(2).padStart(8, '0') + 'b';

    // Create a new row in the table
    const row = `<tr>
      <td>${displayChar}</td>
      <td>${hex}</td>
      <td>${dec}</td>
      <td>${bin}</td>
    </tr>`;
    
    // Append the row to the table body
    outputBody.innerHTML += row;
  }
});

// Optional: Prevent the "Tab" key from just moving focus away from the textarea,
// so you can actually type a Tab character into it to see its ASCII code (09h).
charInput.addEventListener('keydown', function(e) {
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = this.selectionStart;
    const end = this.selectionEnd;
    
    // Insert a tab character at the cursor
    this.value = this.value.substring(0, start) + "\t" + this.value.substring(end);
    this.selectionStart = this.selectionEnd = start + 1;
    
    // Manually trigger the input event to update the table
    this.dispatchEvent(new Event('input'));
  }
});