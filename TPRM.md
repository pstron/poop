# The Poop Reference Manual

**Version 1.0**

## 1. Overview

Poop is a **functional esolang** where everything is a `poop` and you `pooping` into other `poop`s. No assignments, no objects - just pure pooping.

Program execution is essentially a process of substitution: all macros are expanded, inputs are substituted, and eventually the `poop`s interact with one another.

---

## 2. Syntax Guide

Code is made up of **tokens**; tokens must be separated by whitespace (spaces, newlines, or tabs).

### 2.1 Comments

* **Single-line comments**: begin with `//` - the rest of the line is ignored.
* **Multi-line comments**: begin with `/*` and end with `*/` - the enclosed content is ignored.

### 2.2 Identifiers

Identifiers name parameters or macros.

* **Variable names**: must consist of lowercase letters `[a-z]` or underscores `_`.
* **Macro names**: may be any name that is not a valid variable name or a lone escape character. They are commonly written in `PascalCase`. Macro names may also include digits, symbols, etc., and may be chosen to make code more convenient in certain contexts.

### 2.3 Literals

Literals are content that should be preserved as-is, typically used for output.

* **Format**: begin with `Po` and end with `op`; any characters may appear in between.
* **Behavior**: they represent their own textual content (with the leading `Po` and trailing `op` removed).
* `Poop` (4 characters) represents a **space**.
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

  1. `<x>` is fully evaluated and converted to a string.
  2. The result is written to standard output (the terminal).
  3. **Return value**: `<x>` itself is returned.
* **Characteristic**: functionally `Print` is equivalent to the identity `poop`, except that it prints the value it’s given.

---

## 5. Programming Paradigms

### 5.1 Scope and evaluation

* **Lexical scope**: parameter names are only valid inside the `poops ... qooq` in which they are defined.
* **Evaluation strategy**: normally applicative order (arguments are evaluated before application). However, inside function bodies that involve `Print`, a form of “lazy” substitution may be used to ensure side effects occur in the expected order.

### 5.2 Example: a basic greeting

```poop
// Define a macro Greet
poop Greet is 
    poop x poops 
        Hello Poop x 
    qooq 
qooq

// Execute: print (Greet "World")
pooping Print poopy
    pooping Greet poopy World qooq
qooq
```

### 5.3 Example: Church numerals

In Poop, numbers are just repeated function applications.

```poop
// 0: accepts f, accepts x, returns x
poop 0 is 
    poop f poops poop x poops x qooq qooq 
qooq

// Succ: successor function, n -> f -> x -> f (n f x)
poop Succ is
    poop n poops
        poop f poops
            poop x poops
                pooping f poopy
                    pooping pooping n poopy f qooq poopy x qooq
                qooq
            qooq
        qooq
    qooq
qooq
```

---

*Happy pooping.*

