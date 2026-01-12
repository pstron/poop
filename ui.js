/**
 * ui.js
 * DOM manipulation and gluing the interpreter to the page.
 */

// DOM Elements
const codeArea = document.getElementById('code-area');
const outputArea = document.getElementById('output-area');
const logArea = document.getElementById('log-area');
const inputArea = document.getElementById('input-line');
const inputBtn = document.getElementById('send-btn');
const runBtn = document.getElementById('run-btn');
const resetBtn = document.getElementById('reset-btn');
const lazyCheck = document.getElementById('lazy-mode');
const debugCheck = document.getElementById('debug-mode');

const DEFAULT_CODE = `// A example Hello World poop program
poop Greet is
  poop name poops
    PoHello\\sop name
  qooq
qooq

pooping Print poopy
  pooping Greet poopy
    PoWorldop
  qooq
qooq`;

// Input Handling State
let inputResolver = null;

function appendOutput(str) {
    outputArea.textContent += str;
    outputArea.scrollTop = outputArea.scrollHeight;
}

function appendLog(str) {
    logArea.textContent += str + "\n";
    logArea.scrollTop = logArea.scrollHeight;
}

function resetToDefaultCode() {
    if (codeArea.value === DEFAULT_CODE) {
        return;
    }

    if (confirm("Are you sure you want to reset the code to the default example? This will overwrite your current code.")) {
        codeArea.value = DEFAULT_CODE;
        appendLog("[System] Code has been reset to default example.");
    }
}

// The function called when interpreter hits "Input" token
function requestInput() {
    appendLog("[System] Waiting for input...");
    inputArea.disabled = false;
    inputBtn.disabled = false;
    inputArea.focus();

    return new Promise((resolve) => {
        inputResolver = resolve;
    });
}

// User clicks Send or hits Enter
function handleInputSubmit() {
    if (!inputResolver) return;

    const val = inputArea.value;
    appendOutput(`> ${val}\n`); // Echo input with newline
    inputArea.value = "";
    inputArea.disabled = true;
    inputBtn.disabled = true;

    const resolve = inputResolver;
    inputResolver = null;
    resolve(val);
}

// Setup Event Listeners
inputBtn.addEventListener('click', handleInputSubmit);
inputArea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleInputSubmit();
});

runBtn.addEventListener('click', async () => {
    // Reset UI
    outputArea.textContent = "";
    logArea.textContent = "";
    inputArea.disabled = true;
    inputBtn.disabled = true;
    inputResolver = null;

    const source = codeArea.value;
    const isLazy = lazyCheck.checked;
    const isDebug = debugCheck.checked;

    appendLog(`Starting Poop Interpreter... (Lazy: ${isLazy}, Debug: ${isDebug})`);

    const interpreter = new PoopInterpreter(
        appendOutput,
        appendLog,
        requestInput,
        isLazy,
        isDebug
    );

    runBtn.disabled = true;
    runBtn.textContent = "Running...";

    await interpreter.run(source);

    runBtn.disabled = false;
    runBtn.textContent = "Run Poop";
    appendLog("Terminated.");
});

resetBtn.addEventListener('click', resetToDefaultCode);

// Initial Setup
inputArea.disabled = true;
inputBtn.disabled = true;
