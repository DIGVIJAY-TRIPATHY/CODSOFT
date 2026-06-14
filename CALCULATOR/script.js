/* ══════════════════════════════════════════════════════════════
   CALCULATOR ENGINE
   Architecture:
   - State machine: operand1, operator, operand2, displayMode
   - Expression string tracked separately for the top display
   - All logic in handleAction(); UI is purely a reaction to state
══════════════════════════════════════════════════════════════ */

const state = {
  current:       '0',      // what's shown in main display
  expression:    '',       // top expression line
  operand1:      null,     // first operand (number)
  operator:      null,     // pending operator string
  waitingForOp2: false,    // true right after operator pressed
  justEvaled:    false,    // true right after = pressed
  hasError:      false,
};

const history = [];        // array of {expr, result}
const MAX_DIGITS = 12;

/* ─── DOM refs ─────────────────────────────────── */
const displayNumber = document.getElementById('displayNumber');
const displayExpr   = document.getElementById('displayExpr');
const display       = document.getElementById('display');
const historyList   = document.getElementById('historyList');
const historyEmpty  = document.getElementById('historyEmpty');
const clearHistBtn  = document.getElementById('clearHistory');

/* ══════════════════════════════════════════════════
   DISPLAY RENDERING
══════════════════════════════════════════════════ */
function formatNumber(numStr) {
  // never format if it's mid-decimal entry (trailing dot or trailing zeros after dot)
  if (numStr === 'Error' || numStr === 'Infinity' || numStr === '−Infinity') return numStr;
  if (numStr.endsWith('.'))     return numStr;

  const num = parseFloat(numStr);
  if (isNaN(num)) return numStr;

  // switch to scientific notation for huge/tiny
  if (Math.abs(num) >= 1e13 || (Math.abs(num) < 1e-7 && Math.abs(num) > 0)) {
    return num.toExponential(6).replace('e+', 'e').replace('e-', 'e−');
  }

  // Format with locale but remove trailing zeros after decimal
  let s = numStr.includes('.') ? numStr : num.toLocaleString('en-US', { maximumFractionDigits: 10 });
  return s;
}

function getFontClass(str) {
  const len = str.replace(/[,.\-]/g, '').length;
  if (len <= 9)  return 'large';
  if (len <= 12) return 'medium';
  if (len <= 16) return 'small';
  return 'tiny';
}

function render() {
  const raw = state.current;
  const formatted = formatNumber(raw);

  displayNumber.textContent = formatted;
  displayNumber.className   = 'display-number ' + getFontClass(formatted);

  if (state.hasError) {
    displayNumber.classList.add('error');
  } else if (state.justEvaled) {
    displayNumber.classList.add('result');
  }

  // Expression line
  if (state.expression) {
    displayExpr.textContent = state.expression;
    displayExpr.classList.toggle('has-result', state.justEvaled);
  } else {
    displayExpr.innerHTML = '&nbsp;';
    displayExpr.classList.remove('has-result');
  }

  // Highlight active operator button
  document.querySelectorAll('.key-op').forEach(k => {
    k.style.color = '';
    k.style.background = '';
  });
  if (state.operator && state.waitingForOp2 && !state.justEvaled) {
    document.querySelectorAll('[data-value]').forEach(k => {
      if (k.dataset.value === state.operator) {
        k.style.background = 'linear-gradient(160deg,rgba(255,255,255,.18) 0%,transparent 60%), var(--violet)';
        k.style.color = '#fff';
      }
    });
  }
}

/* ══════════════════════════════════════════════════
   CALCULATION CORE
══════════════════════════════════════════════════ */
function calculate(a, op, b) {
  a = parseFloat(a);
  b = parseFloat(b);
  switch(op) {
    case '+':  return a + b;
    case '−':  return a - b;
    case '×':  return a * b;
    case '÷':
      if (b === 0) return 'Error';
      return a / b;
    default:   return b;
  }
}

function numToString(n) {
  if (n === 'Error') return 'Error';
  // avoid floating point dust
  let s = parseFloat(n.toPrecision(12)).toString();
  return s;
}

/* ══════════════════════════════════════════════════
   ACTION HANDLER  (the brain)
══════════════════════════════════════════════════ */
function handleAction(action, value) {
  if (state.hasError && action !== 'clear') return;

  switch(action) {

    /* ── DIGIT ──────────────────────────────────── */
    case 'digit': {
      if (state.justEvaled) {
        // Start fresh after a completed calculation
        state.current     = value;
        state.expression  = '';
        state.justEvaled  = false;
      } else if (state.waitingForOp2) {
        state.current     = value;
        state.waitingForOp2 = false;
      } else {
        if (state.current === '0' && value !== '0') {
          state.current = value;
        } else if (state.current.replace('-','').replace('.','').length < MAX_DIGITS) {
          state.current = (state.current === '0') ? value : state.current + value;
        }
      }
      break;
    }

    /* ── DECIMAL ────────────────────────────────── */
    case 'decimal': {
      if (state.justEvaled) {
        state.current    = '0.';
        state.expression = '';
        state.justEvaled = false;
      } else if (state.waitingForOp2) {
        state.current       = '0.';
        state.waitingForOp2 = false;
      } else if (!state.current.includes('.')) {
        state.current += '.';
      }
      break;
    }

    /* ── OPERATOR ───────────────────────────────── */
    case 'operator': {
      const incoming = value;
      const cur = parseFloat(state.current);

      if (state.justEvaled) {
        // Chain from previous result
        state.operand1    = state.current;
        state.expression  = formatNumber(state.current) + ' ' + incoming;
        state.operator    = incoming;
        state.waitingForOp2 = true;
        state.justEvaled  = false;
      } else if (state.operator && !state.waitingForOp2) {
        // Chained operators: evaluate pending, then set new operator
        const result = calculate(state.operand1, state.operator, state.current);
        if (result === 'Error') { triggerError(); return; }
        const rs = numToString(result);
        state.current    = rs;
        state.operand1   = rs;
        state.expression = formatNumber(rs) + ' ' + incoming;
        state.operator   = incoming;
        state.waitingForOp2 = true;
      } else {
        // First operator press
        state.operand1    = state.current;
        state.operator    = incoming;
        state.expression  = formatNumber(state.current) + ' ' + incoming;
        state.waitingForOp2 = true;
      }
      break;
    }

    /* ── EQUALS ─────────────────────────────────── */
    case 'equals': {
      if (!state.operator) return;

      const op2 = state.waitingForOp2 ? state.operand1 : state.current;
      const fullExpr = formatNumber(state.operand1) + ' ' + state.operator + ' ' + formatNumber(op2);
      const result = calculate(state.operand1, state.operator, op2);

      if (result === 'Error') { triggerError(); return; }

      const rs = numToString(result);
      addHistory(fullExpr, formatNumber(rs));

      state.expression  = fullExpr + ' =';
      state.current     = rs;
      state.justEvaled  = true;
      state.waitingForOp2 = false;

      // flash the display
      display.classList.remove('flash');
      void display.offsetWidth; // reflow to re-trigger
      display.classList.add('flash');
      setTimeout(()=>display.classList.remove('flash'), 450);
      break;
    }

    /* ── CLEAR ──────────────────────────────────── */
    case 'clear': {
      state.current       = '0';
      state.expression    = '';
      state.operand1      = null;
      state.operator      = null;
      state.waitingForOp2 = false;
      state.justEvaled    = false;
      state.hasError      = false;
      break;
    }

    /* ── SIGN TOGGLE ────────────────────────────── */
    case 'sign': {
      if (state.current === '0' || state.current === 'Error') return;
      state.current = state.current.startsWith('-')
        ? state.current.slice(1)
        : '-' + state.current;
      break;
    }

    /* ── PERCENT ────────────────────────────────── */
    case 'percent': {
      const val = parseFloat(state.current);
      if (isNaN(val)) return;
      // if there's a pending operation, percentage is relative
      if (state.operand1 && state.operator && (state.operator === '+' || state.operator === '−')) {
        state.current = numToString((parseFloat(state.operand1) * val) / 100);
      } else {
        state.current = numToString(val / 100);
      }
      state.waitingForOp2 = false;
      break;
    }

    /* ── BACKSPACE ──────────────────────────────── */
    case 'backspace': {
      if (state.justEvaled || state.waitingForOp2) return;
      if (state.current.length > 1) {
        state.current = state.current.slice(0, -1);
        if (state.current === '-') state.current = '0';
      } else {
        state.current = '0';
      }
      break;
    }
  }

  render();
}

/* ══════════════════════════════════════════════════
   ERROR STATE
══════════════════════════════════════════════════ */
function triggerError() {
  state.current    = 'Error';
  state.expression = 'Cannot divide by zero';
  state.hasError   = true;
  render();
  display.classList.remove('shake');
  void display.offsetWidth;
  display.classList.add('shake');
  setTimeout(()=>display.classList.remove('shake'), 500);
}

/* ══════════════════════════════════════════════════
   HISTORY
══════════════════════════════════════════════════ */
function addHistory(expr, result) {
  history.unshift({ expr, result });
  if (history.length > 50) history.pop();
  renderHistory();
}

function renderHistory() {
  if (history.length === 0) {
    historyEmpty.style.display = 'flex';
    // remove all items
    [...historyList.querySelectorAll('.hist-item')].forEach(el=>el.remove());
    return;
  }
  historyEmpty.style.display = 'none';

  // remove old items
  [...historyList.querySelectorAll('.hist-item')].forEach(el=>el.remove());

  history.forEach((h, idx) => {
    const item = document.createElement('div');
    item.className = 'hist-item' + (idx === 0 ? ' new' : '');
    item.innerHTML = `
      <div class="hist-expr">${h.expr}</div>
      <div class="hist-result">${h.result}</div>
    `;
    // click to restore result
    item.addEventListener('click', () => {
      state.current       = h.result.replace(/,/g, '');
      state.expression    = h.expr + ' =';
      state.operator      = null;
      state.operand1      = null;
      state.waitingForOp2 = false;
      state.justEvaled    = true;
      state.hasError      = false;
      render();
      // brief highlight
      item.style.borderColor = 'rgba(124,58,237,.5)';
      setTimeout(()=>item.style.borderColor='',400);
    });
    historyList.appendChild(item);
  });
}

clearHistBtn.addEventListener('click', () => {
  history.length = 0;
  renderHistory();
});

/* ══════════════════════════════════════════════════
   BUTTON CLICK EVENTS
══════════════════════════════════════════════════ */
document.getElementById('grid').addEventListener('click', e => {
  const key = e.target.closest('[data-action]');
  if (!key) return;
  const action = key.dataset.action;
  const value  = key.dataset.value;

  // mechanical press visual — already handled by :active CSS,
  // but we also want the class for keyboard events
  key.classList.add('pressed');
  setTimeout(() => key.classList.remove('pressed'), 120);

  // backspace ripple
  if (action === 'operator' && key.classList.contains('key-del')) {
    key.classList.add('ripple');
    setTimeout(()=>key.classList.remove('ripple'), 420);
  }

  handleAction(action, value);
});

/* ══════════════════════════════════════════════════
   KEYBOARD SUPPORT
   Full mapping — every key the user expects to work, works.
══════════════════════════════════════════════════ */
const KEY_MAP = {
  '0':         ['digit', '0'],
  '1':         ['digit', '1'],
  '2':         ['digit', '2'],
  '3':         ['digit', '3'],
  '4':         ['digit', '4'],
  '5':         ['digit', '5'],
  '6':         ['digit', '6'],
  '7':         ['digit', '7'],
  '8':         ['digit', '8'],
  '9':         ['digit', '9'],
  '.':         ['decimal'],
  ',':         ['decimal'],
  '+':         ['operator', '+'],
  '-':         ['operator', '−'],
  '*':         ['operator', '×'],
  '/':         ['operator', '÷'],
  'Enter':     ['equals'],
  '=':         ['equals'],
  'Escape':    ['clear'],
  'Delete':    ['clear'],
  'Backspace': ['backspace'],
  '%':         ['percent'],
};

document.addEventListener('keydown', e => {
  // don't intercept if user is focused on history clear button
  if (e.target === clearHistBtn) return;

  const mapping = KEY_MAP[e.key];
  if (!mapping) return;
  e.preventDefault();

  const [action, value] = mapping;

  // visual feedback — find and flash the matching key
  let selector;
  if (action === 'digit')    selector = `[data-action="digit"][data-value="${value}"]`;
  else if (action === 'operator') selector = `[data-action="operator"][data-value="${value}"]`;
  else                       selector = `[data-action="${action}"]`;

  const el = document.querySelector(selector);
  if (el) {
    el.classList.add('pressed');
    setTimeout(()=>el.classList.remove('pressed'), 120);
  }

  handleAction(action, value);
});

/* ══════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════ */
render();
renderHistory();
