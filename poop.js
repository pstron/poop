/**
 * poop.js
 * A minimal interpreter for the "poop" esolang to run on web
 * Port of poop.hs v1.4.1 -> JavaScript
 */

// ==========================================
// Data Structures (AST)
// ==========================================

const NodeType = {
    TOKEN: 'Token',
    LITERAL: 'Literal',
    FUNC: 'Func',
    MACRO_DEF: 'MacroDef',
    APPLY: 'Apply'
};

class Node {
    static Token(s) { return { type: NodeType.TOKEN, value: s }; }
    static Literal(s) { return { type: NodeType.LITERAL, value: s }; }
    static Func(p, body) { return { type: NodeType.FUNC, param: p, body: body }; }
    static MacroDef(n, body) { return { type: NodeType.MACRO_DEF, name: n, body: body }; }
    static Apply(f, arg) { return { type: NodeType.APPLY, func: f, args: arg }; }

    static toCodeString(node) {
        if (!node) return "";
        switch (node.type) {
            case NodeType.TOKEN: return node.value;
            case NodeType.LITERAL: return node.value;
            case NodeType.FUNC: return `poop ${node.param} poops ${nodesToCodeString(node.body)} qooq`;
            case NodeType.MACRO_DEF: return `poop ${node.name} is ${nodesToCodeString(node.body)} qooq`;
            case NodeType.APPLY: return `pooping ${Node.toCodeString(node.func)} poopy ${nodesToCodeString(node.args)} qooq`;
            default: return "";
        }
    }
}

function nodesToCodeString(nodes) {
    return nodes.map(n => Node.toCodeString(n)).join(' ');
}

// Standard String conversion for Print output (decodes Poop literals)
function nodesToOutputString(nodes) {
    return nodes.map(n => nodeToOutputString(n)).join('');
}

function nodeToOutputString(node) {
    if (!node) return "";
    switch (node.type) {
        case NodeType.TOKEN: return node.value;
        case NodeType.LITERAL: {
            const s = node.value;
            return s.length <= 4 ? "" : s.substring(2, s.length - 2);
        }
        case NodeType.FUNC: 
            return `poop ${node.param} poops ${nodesToOutputString(node.body)} qooq`;
        case NodeType.MACRO_DEF: 
            return `poop ${node.name} is ${nodesToOutputString(node.body)} qooq`;
        case NodeType.APPLY: 
            return `pooping ${nodeToOutputString(node.func)} poopy ${nodesToOutputString(node.args)} qooq`;
        default: return "";
    }
}

// Trace String conversion (Raw literals, escaped chars)
function nodesToTraceString(nodes) {
    return nodes.map(n => nodeToTraceString(n)).join(' ');
}

function nodeToTraceString(node) {
    if (!node) return "";
    switch (node.type) {
        case NodeType.TOKEN: return escapeForTrace(node.value);
        case NodeType.LITERAL: return escapeForTrace(node.value);
        case NodeType.FUNC: 
            return `poop ${node.param} poops ${nodesToTraceString(node.body)}qooq`;
        case NodeType.MACRO_DEF: 
            return `poop ${node.name} is ${nodesToTraceString(node.body)}qooq`;
        case NodeType.APPLY: 
            return `pooping ${nodeToTraceString(node.func)} poopy ${nodesToTraceString(node.args)}qooq`;
        default: return "";
    }
}

// ==========================================
// Lexer / Tokenizer
// ==========================================

function removeComments(str) {
    let out = "";
    let i = 0;
    while (i < str.length) {
        if (str[i] === '/' && i + 1 < str.length && str[i + 1] === '/') {
            i += 2;
            while (i < str.length && str[i] !== '\n') i++;
        } else if (str[i] === '/' && i + 1 < str.length && str[i + 1] === '*') {
            i += 2;
            while (i < str.length && !(str[i] === '*' && i + 1 < str.length && str[i + 1] === '/')) i++;
            if (i < str.length) {
                out += ' ';
                i += 2; // skip */
            }
        } else {
            out += str[i];
            i++;
        }
    }
    return out;
}

function unescapeStr(str) {
    let result = "";
    let i = 0;
    while (i < str.length) {
        if (str[i] === '\\' && i + 1 < str.length) {
            const next = str[i + 1];
            switch (next) {
                case 'n': result += '\n'; break;
                case 't': result += '\t'; break;
                case 'r': result += '\r'; break;
                case 's': result += ' '; break;
                case '\\': result += '\\'; break;
                default: result += next; break;
            }
            i += 2;
        } else {
            result += str[i];
            i++;
        }
    }
    return result;
}

function escapeForTrace(str) {
    return str.replace(/\\/g, '\\\\')
              .replace(/\n/g, '\\n')
              .replace(/\t/g, '\\t')
              .replace(/\r/g, '\\r')
              .replace(/ /g, '\\s');
}

function tokenize(s) {
    const cleaned = removeComments(s);
    const rawTokens = cleaned.split(/\s+/).filter(t => t.length > 0);
    return rawTokens.map(unescapeStr);
}

function isVarName(s) {
    if (!s || s.length === 0) return false;
    return /^[a-z_]+$/.test(s);
}

function isLiteral(s) {
    if (["poop", "pooping", "qooq", "poops", "poopy", "is"].includes(s)) return false;
    return s.startsWith("Po") && s.endsWith("op") && s.length >= 4;
}

// ==========================================
// Parser
// ==========================================

function parseExprs(tokens) {
    if (tokens.length === 0) return [[], []];

    const t = tokens[0];
    const ts = tokens.slice(1);

    if (t === "qooq" || t === "poopy") {
        return [[], tokens];
    } else if (t === "poop") {
        const [node, rest] = parsePoop(ts);
        const [siblings, finalRest] = parseExprs(rest);
        return [[node, ...siblings], finalRest];
    } else if (t === "pooping") {
        const [node, rest] = parsePooping(ts);
        const [siblings, finalRest] = parseExprs(rest);
        return [[node, ...siblings], finalRest];
    } else {
        const node = isLiteral(t) ? Node.Literal(t) : Node.Token(t);
        const [siblings, rest] = parseExprs(ts);
        return [[node, ...siblings], rest];
    }
}

function parsePoop(tokens) {
    if (tokens.length === 0) throw new Error("Unexpected end of file after 'poop'");
    const name = tokens[0];
    const ts = tokens.slice(1);

    if (ts.length > 0 && ts[0] === "is") {
        if (isVarName(name) || ["\n", "\r", "\t", "\\"].includes(name)) {
            throw new Error(`Illegal macro name (cannot be variable format or escape char): ${JSON.stringify(name)}`);
        }
        const [body, afterBody] = parseExprs(ts.slice(1));
        if (afterBody.length > 0 && afterBody[0] === "qooq") {
            return [Node.MacroDef(name, body), afterBody.slice(1)];
        }
        throw new Error(`Missing 'qooq' for macro definition: ${name}`);
    } else if (ts.length > 0 && ts[0] === "poops") {
        if (!isVarName(name)) {
            throw new Error(`Invalid parameter name (must be [a-z_]+): ${JSON.stringify(name)}`);
        }
        const [body, afterBody] = parseExprs(ts.slice(1));
        if (afterBody.length > 0 && afterBody[0] === "qooq") {
            return [Node.Func(name, body), afterBody.slice(1)];
        }
        throw new Error(`Missing 'qooq' for function: ${name}`);
    }
    throw new Error(`Expected 'is' or 'poops' after 'poop ${name}'`);
}

function parsePooping(tokens) {
    const [funcNodes, afterFunc] = parseExprs(tokens);
    if (afterFunc.length > 0 && afterFunc[0] === "poopy") {
        const [argNodes, afterArg] = parseExprs(afterFunc.slice(1));
        if (afterArg.length > 0 && afterArg[0] === "qooq") {
            let funcNode;
            if (funcNodes.length === 1) {
                funcNode = funcNodes[0];
            } else {
                funcNode = Node.Token(funcNodes.map(n => Node.toCodeString(n)).join(' '));
            }
            return [Node.Apply(funcNode, argNodes), afterArg.slice(1)];
        }
    }
    throw new Error("Expected 'poopy' in 'pooping' structure");
}

function parseProgram(code) {
    const tokens = tokenize(code);
    const [nodes, rest] = parseExprs(tokens);
    if (rest.length > 0) {
        throw new Error(`Unexpected tokens at end: ${JSON.stringify(rest.slice(0, 5))}`);
    }
    return nodes;
}

// ==========================================
// Evaluator Helpers
// ==========================================

function isReduced(env, node) {
    if (node.type === NodeType.TOKEN) {
        return node.value !== "Input" && !env.has(node.value);
    }
    if (node.type === NodeType.LITERAL) return true;
    if (node.type === NodeType.FUNC) {
        return node.body.every(b => isReduced(env, b));
    }
    if (node.type === NodeType.MACRO_DEF) {
        return node.body.every(b => isReduced(env, b));
    }
    return false; // Apply is never reduced
}

// Strict check for Print command: only Literals and Tokens are printable.
function isPrintable(env, node) {
    if (node.type === NodeType.TOKEN) {
        return node.value !== "Input" && !env.has(node.value);
    }
    if (node.type === NodeType.LITERAL) return true;
    return false;
}

function containsPrint(node) {
    if (node.type === NodeType.APPLY) {
        if (node.func.type === NodeType.TOKEN && node.func.value === "Print") return true;
        return containsPrint(node.func) || node.args.some(containsPrint);
    }
    if (node.type === NodeType.FUNC) {
        return node.body.some(containsPrint);
    }
    if (node.type === NodeType.MACRO_DEF) {
        return node.body.some(containsPrint);
    }
    return false;
}

function substitute(param, argNodes, nodes) {
    let result = [];
    for (const n of nodes) {
        if (n.type === NodeType.TOKEN && n.value === param) {
            result.push(...argNodes.map(deepCopy));
        } else if (n.type === NodeType.TOKEN) {
            result.push(Node.Token(n.value));
        } else if (n.type === NodeType.LITERAL) {
            result.push(Node.Literal(n.value));
        } else if (n.type === NodeType.FUNC) {
            if (n.param === param) {
                result.push(Node.Func(n.param, deepCopyList(n.body)));
            } else {
                result.push(Node.Func(n.param, substitute(param, argNodes, n.body)));
            }
        } else if (n.type === NodeType.MACRO_DEF) {
            result.push(Node.MacroDef(n.name, substitute(param, argNodes, n.body)));
        } else if (n.type === NodeType.APPLY) {
            const newF = substitute(param, argNodes, [n.func])[0];
            const newA = substitute(param, argNodes, n.args);
            result.push(Node.Apply(newF, newA));
        }
    }
    return result;
}

function deepCopy(node) {
    return JSON.parse(JSON.stringify(node));
}

function deepCopyList(nodes) {
    return nodes.map(deepCopy);
}

// ==========================================
// Interpreter State & Logic
// ==========================================

class PoopInterpreter {
    constructor(outputFn, logFn, inputFn, options = {}) {
        this.macros = new Map();
        this.outputFn = outputFn;
        this.logFn = logFn;
        this.inputFn = inputFn;
        this.debugMode = options.debugMode || false;
        this.traceMode = options.traceMode || false;
        this.lazyMode = options.lazyMode !== undefined ? options.lazyMode : true;
        this.printTotalSteps = options.printTotalSteps || false;
        this.showStepNo = options.showStepNo || false;
        this.stepCount = 0;
    }

    logDebug(msg) {
        if (this.debugMode) {
            const prefix = this.showStepNo ? `[Step ${this.stepCount + 1}] ` : "[poop.js] ";
            this.logFn(prefix + msg);
        }
    }

    logTrace(nodes) {
        if (this.traceMode) {
            const prefix = this.showStepNo ? `[Step ${this.stepCount + 1}] ` : "[Trace] ";
            this.logFn(prefix + nodesToTraceString(nodes));
        }
    }

    async expandOnceNodes(nodes) {
        if (nodes.length === 0) return [[], false];
        const n = nodes[0];
        const ns = nodes.slice(1);

        if (n.type === NodeType.TOKEN) {
            if (this.macros.has(n.value)) {
                const [restExpanded, restChanged] = await this.expandOnceNodes(ns);
                return [[...deepCopyList(this.macros.get(n.value)), ...restExpanded], true];
            }
            const [restExpanded, restChanged] = await this.expandOnceNodes(ns);
            return [[n, ...restExpanded], restChanged];
        }

        if (n.type === NodeType.LITERAL) {
            const [restExpanded, restChanged] = await this.expandOnceNodes(ns);
            return [[n, ...restExpanded], restChanged];
        }

        if (n.type === NodeType.FUNC) {
            const [newB, changedB] = await this.expandOnceNodes(n.body);
            const [restExpanded, restChanged] = await this.expandOnceNodes(ns);
            return [[Node.Func(n.param, newB), ...restExpanded], changedB || restChanged];
        }

        if (n.type === NodeType.MACRO_DEF) {
            const [newB, changedB] = await this.expandOnceNodes(n.body);
            const [restExpanded, restChanged] = await this.expandOnceNodes(ns);
            return [[Node.MacroDef(n.name, newB), ...restExpanded], changedB || restChanged];
        }

        if (n.type === NodeType.APPLY) {
            const [fExpandedList, fChanged] = await this.expandOnceNodes([n.func]);
            let newF;
            if (fExpandedList.length === 1) {
                newF = fExpandedList[0];
            } else {
                newF = Node.Token(fExpandedList.map(node => Node.toCodeString(node)).join(' '));
            }
            const [newArgs, argsChanged] = await this.expandOnceNodes(n.args);
            const [restExpanded, restChanged] = await this.expandOnceNodes(ns);
            return [[Node.Apply(newF, newArgs), ...restExpanded], fChanged || argsChanged || restChanged];
        }

        return [[], false];
    }

    async expandMacrosDeep(nodes) {
        let current = nodes;
        let accChanged = false;
        while (true) {
            const [next, changed] = await this.expandOnceNodes(current);
            if (!changed) return [next, accChanged];
            current = next;
            accChanged = true;
        }
    }

    async reduceFirst(nodes) {
        if (nodes.length === 0) return [[], false];

        const n = nodes[0];
        const rest = nodes.slice(1);

        // PRIORITY 1: Input
        if (n.type === NodeType.TOKEN && n.value === "Input") {
            this.logDebug("Input requested...");
            const line = await this.inputFn();
            const inputNodes = parseProgram(line);
            return [[...inputNodes, ...rest], true];
        }

        // PRIORITY 2: Macro Definition
        if (n.type === NodeType.MACRO_DEF) {
            if (this.macros.has(n.name)) {
                throw new Error(`Macro redefinition error: ${n.name}`);
            }
            this.logDebug(`Defined Macro: ${n.name}`);
            this.macros.set(n.name, n.body);
            return [rest, true];
        }

        // PRIORITY 3: Expand macros (Standard identifier resolution)
        if (n.type === NodeType.TOKEN) {
            if (this.macros.has(n.value)) {
                if (this.traceMode) {
                    this.logDebug(`Expanded Macro: ${n.value}`);
                }
                return [[...deepCopyList(this.macros.get(n.value)), ...rest], true];
            }
            const [newRest, changed] = await this.reduceFirst(rest);
            return [[n, ...newRest], changed];
        }

        // PRIORITY 4: Function Application
        if (n.type === NodeType.APPLY) {
            const func = n.func;
            const args = n.args;

            // 4a. Reduce the function head first
            const [newFunc, funcChanged] = await this.reduceFirst([func]);
            if (funcChanged) {
                const funcPrime = newFunc.length === 1 ? newFunc[0] : Node.Token("ERROR");
                return [[Node.Apply(funcPrime, args), ...rest], true];
            }

            // CASE: Standard Function
            if (func.type === NodeType.FUNC) {
                if (this.lazyMode) {
                    // [STRATEGY: LAZY]
                    if (this.traceMode) {
                        this.logDebug(`Lazy Apply on: ${func.param}`);
                    }
                    const substituted = substitute(func.param, args, func.body);
                    return [[...substituted, ...rest], true];
                } else {
                    // [STRATEGY: LEGACY / STRICT]
                    const [expandedBody, bodyExpanded] = await this.expandMacrosDeep(func.body);
                    if (bodyExpanded) {
                        return [[Node.Apply(Node.Func(func.param, expandedBody), args), ...rest], true];
                    }
                    if (func.body.some(containsPrint)) {
                        if (this.traceMode) {
                            this.logDebug("Legacy Apply: Contains Print, Lazy Subst.");
                        }
                        const substituted = substitute(func.param, args, func.body);
                        return [[...substituted, ...rest], true];
                    } else {
                        // Eagerly reduce arguments first
                        const [newArgs, argsChanged] = await this.reduceFirst(args);
                        if (argsChanged) {
                            return [[Node.Apply(func, newArgs), ...rest], true];
                        }
                        if (this.traceMode) {
                            this.logDebug("Legacy Apply: Beta-reduction.");
                        }
                        const substituted = substitute(func.param, args, func.body);
                        return [[...substituted, ...rest], true];
                    }
                }
            }

            // CASE: Token (Built-ins or Macros)
            if (func.type === NodeType.TOKEN) {
                if (func.value === "Print") {
                    if (args.every(a => isPrintable(this.macros, a))) {
                        const output = nodesToOutputString(args);
                        this.outputFn(output);
                        this.logDebug(`Print Output: ${output}`);
                        return [[...args, ...rest], true];
                    } else {
                        // Try to reduce arguments
                        const [newArgs, changed] = await this.reduceFirst(args);
                        if (changed) {
                            return [[Node.Apply(Node.Token("Print"), newArgs), ...rest], true];
                        }
                        // Stuck Print
                        const [newRest, restChanged] = await this.reduceFirst(rest);
                        return [[Node.Apply(Node.Token("Print"), args), ...newRest], restChanged];
                    }
                } else if (this.macros.has(func.value)) {
                    const body = this.macros.get(func.value);
                    const newFunc = body.length === 1 ? body[0] : Node.Token("ERROR_MACRO_SINGLE");
                    return [[Node.Apply(newFunc, args), ...rest], true];
                } else {
                    const [newArgs, changed] = await this.reduceFirst(args);
                    if (changed) {
                        return [[Node.Apply(func, newArgs), ...rest], true];
                    }
                    const [newRest, restChanged] = await this.reduceFirst(rest);
                    return [[Node.Apply(func, args), ...newRest], restChanged];
                }
            }

            // CASE: Nested Application
            if (func.type === NodeType.APPLY) {
                const [newInner, changed] = await this.reduceFirst([Node.Apply(func.func, func.args)]);
                if (changed && newInner.length > 0) {
                    return [[Node.Apply(newInner[0], args), ...rest], true];
                } else {
                    // If inner application is stuck, try reducing args
                    const [newArgs, argsChanged] = await this.reduceFirst(args);
                    if (argsChanged) {
                        return [[Node.Apply(func, newArgs), ...rest], true];
                    }
                    const [newRest, restChanged] = await this.reduceFirst(rest);
                    return [[n, ...newRest], restChanged];
                }
            }

            // Fallback
            const [newArgs, changed] = await this.reduceFirst(args);
            if (changed) {
                return [[Node.Apply(func, newArgs), ...rest], true];
            }
            const [newRest, restChanged] = await this.reduceFirst(rest);
            return [[Node.Apply(func, args), ...newRest], restChanged];
        }

        // PRIORITY LOW: Function Definitions (Macro expansion only)
        if (n.type === NodeType.FUNC) {
            const [newBody, changed] = await this.expandMacrosDeep(n.body);
            if (changed) {
                return [[Node.Func(n.param, newBody), ...rest], true];
            }
            const [newRest, restChanged] = await this.reduceFirst(rest);
            return [[Node.Func(n.param, n.body), ...newRest], restChanged];
        }

        if (n.type === NodeType.LITERAL) {
            const [newRest, changed] = await this.reduceFirst(rest);
            return [[n, ...newRest], changed];
        }

        // Fallback
        const [newRest, changed] = await this.reduceFirst(rest);
        return [[n, ...newRest], changed];
    }

    async step(nodes) {
        return await this.reduceFirst(nodes);
    }

    async runEval(nodes) {
        this.logTrace(nodes);
        
        const [newNodes, changed] = await this.step(nodes);
        
        if (changed) {
            if (this.printTotalSteps || this.showStepNo) {
                this.stepCount++;
            }
            return await this.runEval(newNodes);
        } else {
            if (this.debugMode) {
                this.logDebug("Terminated.");
            }
            if (this.printTotalSteps && this.debugMode) {
                this.logFn(`[poop.js] Total reduction steps: ${this.stepCount}`);
            }
            return newNodes;
        }
    }

    async run(source) {
        this.macros.clear();
        this.stepCount = 0;
        
        try {
            const ast = parseProgram(source);
            
            if (this.debugMode) {
                this.logFn("[poop.js] Started interpreter v1.4.1");
                if (!this.lazyMode) {
                    this.logFn("[poop.js] WARNING: Legacy (Strict) evaluation is deprecated. Default is Lazy.");
                }
                if (this.traceMode) {
                    this.logFn("[poop.js] Trace Mode Enabled (Full AST Dump).");
                }
            }
            
            return await this.runEval(ast);
        } catch (e) {
            this.logFn(`Error parsing: ${e.message}`);
            console.error(e);
            throw e;
        }
    }
}
