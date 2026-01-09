# 💩 Poop Programming Language

A Haskell implementation of a interpreter of Poop - a **functional esolang** where everything is a `poop` and you `pooping` into other `poop`s. No assignments, no objects - just pure pooping.

## Quick Start

```bash
# Build the interpreter (GHC needed)
ghc poop.hs -o poop

# Run your poop program
./poop hello.poop
```

## Learn Poop

Please check [The Poop Reference Manual](TPRM.md).

## Example

```poop
// A example Hello World poop program
poop Greet is
  poop name poops
    Hello Poop name
  qooq
qooq

pooping Print poopy
  pooping Greet poopy
    World
  qooq
qooq
```

If you run it with the interpreter, the program will output `Hello World`.

## Features

- **Minimal**: 3 primitives (`poop`, `pooping`, macros)
- **Functional**: Everything is lambda calculus in disguise
- **Weirdly consistent**: Everything revolves around poop metaphors
- **Interactive**: `Input` reads and executes code from user
- **Printing**: `Print` shows values (and returns them unchanged)

## License

This project is dual-licensed:

- [**The Poop License**](POOPLICENSE): You may use it totally freely but I assume no liability whatsoever.
- [**MIT License**](MITLICENSE): The boring legal version if you need it.

You may use this software under **either** license at your discretion.

---

*Happy pooping! 🚽*
