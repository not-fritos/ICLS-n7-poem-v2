// ============================================================
// Data processing helpers for N+7 poem animation
// These functions can be loaded before sketch.js to keep
// the data logic separate from the p5 animation orchestration.
// ============================================================

function stripPunctuation(word) {
  if (!word) return { before: '', clean: '', after: '' };
  let start = 0;
  while (start < word.length && !/[a-zA-Z]/.test(word[start])) start++;
  if (start >= word.length) return { before: word, clean: word, after: '' };
  let end = word.length - 1;
  while (end > start && !/[a-zA-Z]/.test(word[end])) end--;
  return {
    before: word.substring(0, start),
    clean: word.substring(start, end + 1),
    after: word.substring(end + 1)
  };
}

function maxWordLenAtCol(arrays, col) {
  let max = 0;
  for (const arr of arrays) {
    const { clean } = stripPunctuation(arr[col] || '');
    max = Math.max(max, clean.length);
  }
  return max;
}

function processPoem(json) {
  const entries = Object.entries(json).sort((a, b) => {
    return parseInt(a[0].replace('N+', '')) - parseInt(b[0].replace('N+', ''));
  });

  const steps = entries.map(([_, poem]) => poem.split(/\s+/));
  const totalCols = Math.max(...steps.map(s => s.length));
  for (const step of steps) {
    while (step.length < totalCols) step.push('');
  }

  const changingIndices = new Set();
  for (let c = 0; c < totalCols; c++) {
    const first = steps[0][c];
    for (let s = 1; s < steps.length; s++) {
      if (steps[s][c] !== first) { changingIndices.add(c); break; }
    }
  }

  const maxLengths = [];
  const nounWords = {};
  const nonNounWords = {};

  for (let c = 0; c < totalCols; c++) {
    maxLengths.push(maxWordLenAtCol(steps, c));
    if (changingIndices.has(c)) {
      nounWords[c] = steps.map(step => step[c]);
    } else {
      nonNounWords[c] = steps[0][c];
    }
  }

  return { nounWords, nonNounWords, changingIndices, maxLengths, totalColumns: totalCols };
}
