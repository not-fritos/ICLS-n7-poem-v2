// ============================================================
// N+7 Animated Poem — p5.js sketch
// Data processing helpers (extractable to script.js)
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

function wrapText(str, maxW) {
  const words = str.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (textWidth(test) > maxW && cur) { lines.push(cur); cur = w; }
    else { cur = test; }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ============================================================
// p5.js Animation
// ============================================================

const WIPE_SEC = 1;
const HOLD_SEC = 4;
const TOTAL_SEC = WIPE_SEC + HOLD_SEC;
const PAD = 20;
const HEADER_PAD = 8;
const TITLE = "we are not professionals, and maybe that\u2019s okay";
const FOOTER = "an n+7 poem based on Ryan Lay\u2019s Personal Statement @UW-Madison 2027";

let poemData = null;
let curStep = 15;
let phase = 'load';
let phaseStart = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('Courier');
  fetch('script.json')
    .then(r => r.json())
    .then(j => {
      poemData = processPoem(j);
      fitFontSize();
      phase = 'wipe';
      phaseStart = millis();
    });
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (poemData) fitFontSize();
}

function fitFontSize() {
  const mw = width - 2 * PAD;
  for (let s = 20; s >= 6; s--) {
    textSize(s);
    const cw = textWidth('M');
    const sp = textWidth(' ');
    const lh = textAscent() + textDescent() + 4;
    const gap = 2 * lh;
    const titleLines = wrapText(TITLE, mw);
    const footerLines = wrapText(FOOTER, mw);
    const headerH = titleLines.length * lh + HEADER_PAD + lh + gap;
    const footerH = gap + footerLines.length * lh;
    let rows = 1, rw = 0;
    for (let c = 0; c < poemData.totalColumns; c++) {
      const colW = poemData.maxLengths[c] * cw;
      if (rw > 0 && rw + sp + colW > mw) { rows++; rw = 0; }
      rw += colW + (rw > 0 ? sp : 0);
    }
    const totalH = headerH + rows * lh + footerH;
    if (totalH <= height) return;
  }
  textSize(6);
}

function draw() {
  background(255);
  if (!poemData) return;

  const dt = (millis() - phaseStart) / 1000;

  if (phase === 'wipe') {
    drawPoem(min(dt / WIPE_SEC, 1));
    if (dt >= WIPE_SEC) phase = 'hold';
  } else if (phase === 'hold') {
    drawPoem(1);
    if (dt >= TOTAL_SEC) advance();
  }
}

function advance() {
  curStep = (curStep - 1 + 16) % 16;
  phase = 'wipe';
  phaseStart = millis();
}

function drawPoem(progress) {
  const { nounWords, nonNounWords, maxLengths, changingIndices } = poemData;
  const cw = textWidth('M');
  const sp = textWidth(' ');
  const mw = width - 2 * PAD;

  const rows = [];
  let curRow = [], curW = 0;
  for (let c = 0; c < poemData.totalColumns; c++) {
    const colW = maxLengths[c] * cw;
    if (curRow.length > 0 && curW + sp + colW > mw) {
      rows.push(curRow);
      curRow = [];
      curW = 0;
    }
    curRow.push({ col: c, width: colW });
    curW += colW + (curRow.length > 1 ? sp : 0);
  }
  if (curRow.length) rows.push(curRow);

  const lh = textAscent() + textDescent() + 4;
  const gap = 2 * lh;
  const poemH = rows.length * lh;
  const titleLines = wrapText(TITLE, width - 2 * PAD);
  const footerLines = wrapText(FOOTER, width - 2 * PAD);
  const headerH = titleLines.length * lh + HEADER_PAD + lh + gap;
  const footerH = gap + footerLines.length * lh;
  const totalH = headerH + poemH + footerH;
  const blockY = Math.max((height - totalH) / 2, 0);
  const titleY = blockY;
  const labelY = titleY + titleLines.length * lh + HEADER_PAD;
  const poemY = labelY + lh + gap;
  const footerY = poemY + poemH + gap;
  const thresholdY = poemY + progress * poemH;

  textAlign(CENTER, TOP);
  noStroke();
  fill(0);
  for (let i = 0; i < titleLines.length; i++) {
    text(titleLines[i], width / 2, titleY + i * lh);
  }
  text("N+" + curStep + " of 15", width / 2, labelY);

  textAlign(LEFT, TOP);

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const ry = poemY + r * lh;
    const rowBottom = ry + lh;

    const rowW = row.reduce((s, cell) => s + cell.width, 0) + (row.length - 1) * sp;
    let x = PAD + (width - 2 * PAD - rowW) / 2;

    for (const cell of row) {
      const { col, width: cellW } = cell;

      if (changingIndices.has(col)) {
        if (rowBottom <= thresholdY) {
          const word = nounWords[col][curStep];
          const hasPunct = stripPunctuation(word).after.length > 0;
          const hw = cellW + (hasPunct ? cw : 0);
          fill(173, 216, 230, 180);
          rect(x, ry, hw, lh);
          fill(0);
          text(word, x + (hw - textWidth(word)) / 2, ry);
        }
      } else {
        fill(0);
        text(nonNounWords[col], x + (cellW - textWidth(nonNounWords[col])) / 2, ry);
      }

      x += cellW + sp;
    }
  }

  textAlign(CENTER, TOP);
  fill(150);
  for (let i = 0; i < footerLines.length; i++) {
    text(footerLines[i], width / 2, footerY + i * lh);
  }
}
