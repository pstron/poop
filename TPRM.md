# The Poop Reference Manual

**Version 1.3**

## 1. Overview

Poop is a **functional esolang** where everything is a `poop` and you `pooping` into other `poop`s. No assignments, no objects - just pure pooping.

Program execution is essentially a process of substitution: all macros are expanded, inputs are substituted, and eventually the `poop`s interact with one another.

---

## 2. Syntax Guide

Code is made up of **tokens**; tokens must be separated by whitespace (spaces, newlines, or tabs).

### 2.1 Escape sequences

Throughout the language, backslash `\` introduces escape sequences in textual content:

- `\n` -> newline character
- `\t` -> tab character  
- `\r` -> carriage return
- `\s` -> space character
- `\\` -> backslash

### 2.2 Comments

* **Single-line comments**: begin with `//` - the rest of the line is ignored.
* **Multi-line comments**: begin with `/*` and end with `*/` - the enclosed content is ignored.

### 2.3 Identifiers

Identifiers name parameters or macros.

* **Variable names**: must consist of lowercase letters `[a-z]` or underscores `_`.
* **Macro names**: may be any name that is not a valid variable name or a lone escape character. They are commonly written in `PascalCase`. Macro names may also include digits, symbols, etc., and may be chosen to make code more convenient in certain contexts.

### 2.4 Literals

Literals are content that should be preserved as-is, typically used for output.

* **Format**: begin with `Po` and end with `op`; any characters may appear in between.
* **Behavior**: they represent their own textual content (with the leading `Po` and trailing `op` removed).
* `Poop` (4 characters) represents a **empty string** (if you print it, nothing will appear).
* `Po...op` (length > 4) represents the content between `Po` and `op`.
* `Popoopop` represents the string `"poop"` (used to avoid being interpreted as a keyword).
* `Po\n\nop` represents two newline characters.

> **Note**: Literals are never subject to macro substitution and are never treated as keywords. They are exactly what they look like.

---

## 3. Core Mechanisms

Poop is built from just three primitive actions. All higher-level behavior is composed from these three.

### 3.1 `poop`

Defines a `poop` that is ready to accept parameters.

```poop
poop <param-name> poops <function-body> qooq
```

* **Meaning**: create (manufacture) a `poop`. It is initially inert.
* **Behavior**: when it is `pooping`ed (called), all occurrences of `<param-name>` inside `<function-body>` will be replaced with the supplied argument.
* **Rule**: `<param-name>` must be a legal variable name.

### 3.2 `pooping`

Applies an argument to a `poop`, replacing variables inside it.

```poop
pooping <poop> poopy <argument> qooq
```

* **Meaning**: we are `pooping` a `poop`: `<poop>`, using `<argument>` after `poopy` as the argument.
* **Order**: first find the `<poop>`, then prepare the `<argument>`, then perform the combination.
* **Associativity**: for multiple parameters, nesting is used.
* **Evaluation of Non-poop Targets**: If `<poop>` is not a `poop`, the `pooping` expression remains unevaluated until the target becomes a `poop` (or will never be evaluated if no such situation).

### 3.3 Defining macros

Give a piece of code a name for reuse.

```poop
poop <macro-name> is <content> qooq
```

* **Meaning**: `<macro-name>` becomes an alias for `<content>`.
* **Rules**:

  * **Non-recursive**: a macro’s definition must not contain the macro itself (otherwise infinite recursion may occur).
  * **Preprocessing / expansion**: macros are expanded when needed during program execution.

---

## 4. Built-in Macros

The environment provides two special built-in macros.

### 4.1 `Input`

`Input` is a special macro.

* When the interpreter encounters `Input`, execution pauses.
* **User action**: the user types one line of text.
* **Replacement**: that line of text is **parsed as Poop code** and directly replaces the `Input` in the program. This means the user’s input can be not only data but also logic.

### 4.2 `Print`

`Print` is a `poop` that exists for its side effect.

* **Form**: `pooping Print poopy <x> qooq`
* **Behavior**:

  1. **Evaluation**: <x> is fully evaluated.
  2. **String Conversion**: The result is converted to a string (multiple adjacent tokens are concatenated without added spaces).
  3. **Output**: The result is written to standard output (the terminal).
  4. **Return value**: `<x>` itself is returned.
* **Characteristic**: functionally `Print` is equivalent to the identity `poop`, except that it prints the value it’s given.

---

## 5. Evaluation Model

### 5.1 Scope and evaluation

* **Lexical scope**: parameter names are only valid inside the `poops ... qooq` in which they are defined. A parameter defined in an inner `poop` shadows any parameter of the same name from an outer `poop`.
* **Evaluation strategy**: The default strategy is **lazy evaluation (call-by-name)**. Arguments are substituted into the function body *before* they are reduced, and are only evaluated when their value is needed. This means functions can be defined that might never use certain arguments, and their evaluation will be skipped. This also ensures predictable ordering of side-effects like `Print`.

## 6. Programming Examples

### 6.1 Example: a basic greeting

```poop
// A example Hello World poop program
// Define a macro Greet
poop Greet is
  poop name poops
    PoHello\sop name
  qooq
qooq

// Execute: Print (Greet "World")
pooping Print poopy
  pooping Greet poopy
    PoWorldop
  qooq
qooq
```

### 6.2 Example: Church numerals

In Poop, numbers are just repeated function applications.

```poop
// 0: f -> x -> x
poop 0 is 
  poop f poops poop x poops x qooq qooq 
qooq

// Succ: successor function, n -> f -> x -> f (n f x)
poop Succ is
  poop n poops
    poop f poops
      poop x poops
        pooping f poopy
          pooping 
            pooping n poopy f qooq
          poopy x
          qooq
        qooq
      qooq
    qooq
  qooq
qooq

// >: Print a Church numeral as repeated "poop"s
poop > is
  poop num poops
    pooping
      pooping num poopy Print qooq
      poopy Popoop\nop
    qooq
  qooq
qooq
```

---

*Happy pooping.*

