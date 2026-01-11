/**
 * poop.js
 * A minimal interpreter for the "poop" esolang, ported from Haskell.
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

    static toOutputString(node) {
        if (!node) return "";
        switch (node.type) {
            case NodeType.TOKEN: return node.value;
            case NodeType.LITERAL:
                const s = node.value;
                return s.length <= 4 ? " " : s.substring(2, s.length - 2);
            default: return "";
        }
    }
}

function nodesToCodeString(nodes) {
    return nodes.map(n => Node.toCodeString(n)).join(' ');
}

function nodesToOutputString(nodes) {
    return nodes.map(n => Node.toOutputString(n)).join('');
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
            i += 2; // skip */
        } else {
            out += str[i];
            i++;
        }
    }
    return out;
}

function unescapeStr(str) {
    return str.replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r')
        .replace(/\\\\/g, '\\');
}

function tokenize(s) {
    const cleaned = removeComments(s);
    // Split by whitespace strictly - no empty tokens
    const rawTokens = cleaned.split(/\s+/).filter(t => t.length > 0);
    return rawTokens.map(unescapeStr);
}

function isVarName(s) {
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
    if (tokens.length === 0) throw new Error("Unexpected end after 'poop'");
    const name = tokens[0];
    const ts = tokens.slice(1);

    if (ts.length > 0 && ts[0] === "is") {
        if (isVarName(name) || /^[\n\r\t\\]$/.test(name)) {
            throw new Error(`Illegal macro name: ${name}`);
        }
        const [body, afterBody] = parseExprs(ts.slice(1));
        if (afterBody.length > 0 && afterBody[0] === "qooq") {
            return [Node.MacroDef(name, body), afterBody.slice(1)];
        }
        throw new Error(`Missing 'qooq' for macro: ${name}`);
    } else if (ts.length > 0 && ts[0] === "poops") {
        if (!isVarName(name)) throw new Error(`Invalid parameter name: ${name}`);
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
                // Multiple nodes should be joined as a single token
                funcNode = Node.Token(funcNodes.map(n => {
                    if (n.type === NodeType.TOKEN) return n.value;
                    if (n.type === NodeType.LITERAL) return n.value;
                    return Node.toCodeString(n);
                }).join(' '));
            }
            return [Node.Apply(funcNode, argNodes), afterArg.slice(1)];
        }
    }
    throw new Error("Expected 'poopy' ... 'qooq' in 'pooping' structure");
}

function parseProgram(code) {
    const tokens = tokenize(code);
    const [nodes, rest] = parseExprs(tokens);
    if (rest.length > 0) throw new Error(`Unexpected tokens at end: ${rest.slice(0, 5)}`);
    return nodes;
}

// ==========================================
// Evaluator Helpers
// ==========================================

function isReduced(env, node) {
    if (node.type === NodeType.TOKEN) return node.value !== "Input" && !env.has(node.value);
    if (node.type === NodeType.LITERAL) return true;
    if (node.type === NodeType.FUNC || node.type === NodeType.MACRO_DEF) {
        return node.body.every(b => isReduced(env, b));
    }
    return false; // Apply is never reduced
}

function containsPrint(node) {
    if (node.type === NodeType.APPLY) {
        if (node.func.type === NodeType.TOKEN && node.func.value === "Print") return true;
        return containsPrint(node.func) || node.args.some(containsPrint);
    }
    if (node.type === NodeType.FUNC || node.type === NodeType.MACRO_DEF) {
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
    constructor(outputFn, logFn, inputFn, lazyMode = true, debugMode = false) {
        this.macros = new Map();
        this.outputFn = outputFn; // (str) => void
        this.logFn = logFn;       // (str) => void
        this.inputFn = inputFn;   // () => Promise<string>
        this.lazyMode = lazyMode;
        this.debugMode = debugMode;
    }

    debugLog(msg) {
        if (this.debugMode) this.logFn(msg);
    }

    async expandOnceNodes(nodes) {
        if (nodes.length === 0) return [[], false];
        const n = nodes[0];
        const ns = nodes.slice(1);

        // Helper to combine results
        const combine = async (firstNodes, firstChanged) => {
            const [restExpanded, restChanged] = await this.expandOnceNodes(ns);
            return [[...firstNodes, ...restExpanded], firstChanged || restChanged];
        };

        if (n.type === NodeType.TOKEN) {
            if (this.macros.has(n.value)) {
                return combine(deepCopyList(this.macros.get(n.value)), true);
            }
            return combine([n], false);
        }

        if (n.type === NodeType.LITERAL) return combine([n], false);

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
                // Join multiple expanded nodes as a single token
                newF = Node.Token(fExpandedList.map(node => {
                    if (node.type === NodeType.TOKEN) return node.value;
                    if (node.type === NodeType.LITERAL) return node.value;
                    return Node.toCodeString(node);
                }).join(' '));
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

    async step(nodes) {
        if (nodes.length === 0) return [[], false];

        // reduceFirst equivalent
        const n = nodes[0];
        const rest = nodes.slice(1);

        // PRIORITY 1: Input
        if (n.type === NodeType.TOKEN && n.value === "Input") {
            this.debugLog("[INPUT] Waiting for user...");
            const line = await this.inputFn();
            const inputNodes = parseProgram(line);
            return [[...inputNodes, ...rest], true];
        }

        // PRIORITY 2: Macro Definition
        if (n.type === NodeType.MACRO_DEF) {
            if (this.macros.has(n.name)) throw new Error(`Macro redefinition: ${n.name}`);
            this.debugLog(`[DEF] Macro: ${n.name}`);
            this.macros.set(n.name, n.body);
            return [rest, true];
        }

        // PRIORITY 3: Expand Macro (Standard Identifier)
        if (n.type === NodeType.TOKEN) {
            if (this.macros.has(n.value)) {
                this.debugLog(`[EXPAND] Macro: ${n.value}`);
                return [[...deepCopyList(this.macros.get(n.value)), ...rest], true];
            }
            const [newRest, changed] = await this.step(rest);
            return [[n, ...newRest], changed];
        }

        // PRIORITY 4: Function Application
        if (n.type === NodeType.APPLY) {
            const func = n.func;
            const args = n.args;

            // 4a. Reduce function head
            const [newFuncNodes, funcChanged] = await this.step([func]);
            if (funcChanged) {
                const funcPrime = newFuncNodes.length === 1 ? newFuncNodes[0] : Node.Token("ERROR_HEAD_REDUCTION");
                return [[Node.Apply(funcPrime, args), ...rest], true];
            }

            // Case: Standard Function
            if (func.type === NodeType.FUNC) {
                if (this.lazyMode) {
                    this.debugLog(`[APPLY-LAZY] Subst on ${func.param}`);
                    const substituted = substitute(func.param, args, func.body);
                    return [[...substituted, ...rest], true];
                } else {
                    // Eager / Original Mode
                    const [expandedBody, bodyExpanded] = await this.expandMacrosDeep(func.body);
                    if (bodyExpanded) {
                        return [[Node.Apply(Node.Func(func.param, expandedBody), args), ...rest], true];
                    }
                    if (containsPrint(Node.Func(func.param, func.body))) {
                        this.debugLog("[APPLY-ORIG] Func has Print. Lazy Subst.");
                        const substituted = substitute(func.param, args, func.body);
                        return [[...substituted, ...rest], true];
                    } else {
                        // Reduce args
                        const [newArgs, argsChanged] = await this.step(args);
                        if (argsChanged) {
                            return [[Node.Apply(func, newArgs), ...rest], true];
                        }
                        this.debugLog("[APPLY-ORIG] Beta-reduction (Eager)");
                        const substituted = substitute(func.param, args, func.body);
                        return [[...substituted, ...rest], true];
                    }
                }
            }

            // Case: Token (Print or Macro)
            if (func.type === NodeType.TOKEN) {
                if (func.value === "Print") {
                    if (args.every(a => isReduced(this.macros, a))) {
                        // Use the proper output conversion from Haskell version
                        const output = nodesToOutputString(args);
                        this.outputFn(output);
                        this.debugLog(`[PRINT] Output: "${output}"`);
                        return [[...args, ...rest], true];
                    } else {
                        const [newArgs, changed] = await this.step(args);
                        if (changed) return [[Node.Apply(Node.Token("Print"), newArgs), ...rest], true];
                        const [newRest, restChanged] = await this.step(rest);
                        return [[Node.Apply(Node.Token("Print"), args), ...newRest], restChanged];
                    }
                } else if (this.macros.has(func.value)) {
                    this.debugLog(`[EXPAND] Macro in Apply: ${func.value}`);
                    const body = this.macros.get(func.value);
                    const newFunc = body.length === 1 ? body[0] : Node.Token("ERROR_MACRO_SINGLE");
                    return [[Node.Apply(newFunc, args), ...rest], true];
                } else {
                    const [newArgs, changed] = await this.step(args);
                    if (changed) return [[Node.Apply(func, newArgs), ...rest], true];
                    const [newRest, restChanged] = await this.step(rest);
                    return [[Node.Apply(func, args), ...newRest], restChanged];
                }
            }

            // Case: Nested Application
            if (func.type === NodeType.APPLY) {
                const [innerRes, changed] = await this.step([n]);
                if (changed && innerRes.length > 0) return [[innerRes[0], ...rest], true];
            }

            // Fallback for Apply
            const [newArgs, changed] = await this.step(args);
            if (changed) return [[Node.Apply(func, newArgs), ...rest], true];
        }

        // PRIORITY LOW: Function Defs (Deep expansion)
        if (n.type === NodeType.FUNC) {
            const [newBody, changed] = await this.expandMacrosDeep(n.body);
            if (changed) return [[Node.Func(n.param, newBody), ...rest], true];
        }

        // Literals
        if (n.type === NodeType.LITERAL) {
            const [newRest, changed] = await this.step(rest);
            return [[n, ...newRest], changed];
        }

        // Fallback generic recursion on rest
        const [newRest, changed] = await this.step(rest);
        return [[n, ...newRest], changed];
    }

    async run(source) {
        this.macros.clear();
        try {
            let nodes = parseProgram(source);
            if (this.debugMode) this.logFn(`Initial AST: ${nodesToCodeString(nodes)}`);

            let changed = true;
            // Limit loop to prevent total browser freeze on infinite loops
            let maxSteps = 10000;
            let steps = 0;

            while (changed && steps < maxSteps) {
                if (this.debugMode) this.logFn(`--- Step ${steps} ---`);
                if (this.debugMode) this.logFn(`AST: ${nodesToCodeString(nodes)}`);

                const res = await this.step(nodes);
                nodes = res[0];
                changed = res[1];
                steps++;

                // Allow UI to breathe
                if (steps % 100 === 0) await new Promise(r => setTimeout(r, 0));
            }

            if (steps >= maxSteps) this.logFn("\n[Warning] Max steps reached. Halting.");

            return nodes;
        } catch (e) {
            this.logFn(`\nERROR: ${e.message}`);
            console.error(e);
        }
    }
}