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
const traceCheck = document.getElementById('trace-mode');
const stepsCheck = document.getElementById('steps-mode');
const stepnoCheck = document.getElementById('stepno-mode');

const DEFAULT_CODE = `// Example: Hello World in poop
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
let isRunning = false;

function appendOutput(str) {
    outputArea.textContent += str;
    outputArea.scrollTop = outputArea.scrollHeight;
}

function appendLog(str) {
    logArea.textContent += str + "\n";
    logArea.scrollTop = logArea.scrollHeight;
}

function resetToDefaultCode() {
    if (isRunning) {
        alert("Cannot reset code while the interpreter is running.");
        return;
    }
    
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
    appendLog("Input> ");
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

// Trace mode implies debug mode
traceCheck.addEventListener('change', () => {
    if (traceCheck.checked) {
        debugCheck.checked = true;
    }
});

runBtn.addEventListener('click', async () => {
    if (isRunning) return;
    
    // Reset UI
    outputArea.textContent = "";
    logArea.textContent = "";
    inputArea.disabled = true;
    inputBtn.disabled = true;
    inputResolver = null;
    
    const source = codeArea.value;
    const isLazy = lazyCheck.checked;
    const isDebug = debugCheck.checked;
    const isTrace = traceCheck.checked;
    const isPrintSteps = stepsCheck.checked;
    const isShowStepNo = stepnoCheck.checked;
    
    const options = {
        debugMode: isDebug || isTrace,
        traceMode: isTrace,
        lazyMode: isLazy,
        printTotalSteps: isPrintSteps,
        showStepNo: isShowStepNo
    };
    
    const interpreter = new PoopInterpreter(
        appendOutput,
        appendLog,
        requestInput,
        options
    );
    
    isRunning = true;
    runBtn.disabled = true;
    runBtn.textContent = "Running...";
    
    try {
        await interpreter.run(source);
    } catch (e) {
        // Error already logged by interpreter
    }
    
    isRunning = false;
    runBtn.disabled = false;
    runBtn.textContent = "Run Poop";
});

resetBtn.addEventListener('click', resetToDefaultCode);

// Initial Setup
inputArea.disabled = true;
inputBtn.disabled = true;
codeArea.value = DEFAULT_CODE;
