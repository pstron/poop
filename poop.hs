-- poop.hs
-- A minimal interpreter for the "poop" esolang.
-- Build: ghc poop.hs -o poop
-- Usage: ./poop <file.poop> [--debug] [--lazy=true|false]

module Main where

import System.Environment (getArgs)
import System.IO
import Data.Char (isSpace, isAsciiLower, toLower)
import Data.List (isPrefixOf, isSuffixOf, partition, find)
import qualified Data.Map as Map
import Control.Monad.State
import Control.Monad
import Data.Maybe (fromMaybe)

-- ==========================================
-- Data Structures (AST)
-- ==========================================

data Node
    = Token String              -- General identifier or text
    | Literal String            -- Po...op literals
    | Func String [Node]        -- poop <para> poops <body> qooq
    | MacroDef String [Node]    -- poop <n> is <body> qooq
    | Apply Node [Node]         -- pooping <func> poopy <arg> qooq
    deriving (Eq)

instance Show Node where
    show (Token s) = s
    show (Literal s) = s
    show (Func p body) = "poop " ++ p ++ " poops " ++ unwords (map show body) ++ " qooq"
    show (MacroDef n body) = "poop " ++ n ++ " is " ++ unwords (map show body) ++ " qooq"
    show (Apply f arg) = "pooping " ++ show f ++ " poopy " ++ unwords (map show arg) ++ " qooq"

-- Application State
data AppState = AppState {
    macros :: Map.Map String [Node], -- Macro Environment
    debugMode :: Bool,               -- Debug Flag
    lazyMode :: Bool                 -- Evaluation Strategy (True = Pure Lazy, False = Original/Eager)
}

-- ==========================================
-- Lexer / Tokenizer
-- ==========================================

removeComments :: String -> String
removeComments [] = []
removeComments ('/':'/':xs) = removeComments (dropWhile (/= '\n') xs)
removeComments ('/':'*':xs) = removeBlockComment xs
removeComments (x:xs) = x : removeComments xs

removeBlockComment :: String -> String
removeBlockComment [] = [] 
removeBlockComment ('*':'/':xs) = " " ++ removeComments xs 
removeBlockComment (_:xs) = removeBlockComment xs

unescape :: String -> String
unescape [] = []
unescape ('\\':'n':xs) = '\n' : unescape xs
unescape ('\\':'t':xs) = '\t' : unescape xs
unescape ('\\':'r':xs) = '\r' : unescape xs
unescape ('\\':'s':xs) = ' ' : unescape xs
unescape ('\\':'\\':xs) = '\\' : unescape xs
unescape ('\\':x:xs) = x : unescape xs
unescape (x:xs) = x : unescape xs

tokenize :: String -> [String]
tokenize s = 
    let cleaned = removeComments s
        rawTokens = words cleaned
    in map unescape rawTokens

isVarName :: String -> Bool
isVarName [] = False
isVarName s = all (\c -> isAsciiLower c || c == '_') s

isLiteral :: String -> Bool
isLiteral s
    | s `elem` ["poop", "pooping", "qooq", "poops", "poopy", "is"] = False
    | "Po" `isPrefixOf` s && "op" `isSuffixOf` s && length s >= 4 = True
    | otherwise = False

-- ==========================================
-- Parser
-- ==========================================

parseExprs :: [String] -> Either String ([Node], [String])
parseExprs [] = Right ([], [])
parseExprs tokens@(t:ts)
    | t == "qooq" = Right ([], tokens)
    | t == "poopy" = Right ([], tokens)
    | t == "poop" = do
        (node, rest) <- parsePoop ts
        (siblings, finalRest) <- parseExprs rest
        Right (node : siblings, finalRest)
    | t == "pooping" = do
        (node, rest) <- parsePooping ts
        (siblings, finalRest) <- parseExprs rest
        Right (node : siblings, finalRest)
    | otherwise = 
        let node = if isLiteral t then Literal t else Token t
        in do
            (siblings, rest) <- parseExprs ts
            Right (node : siblings, rest)

parsePoop :: [String] -> Either String (Node, [String])
parsePoop [] = Left "Unexpected end of file after 'poop'"
parsePoop (name:ts) = 
    case ts of
        ("is":rest) -> do
            if isVarName name || name `elem` ["\n", "\r", "\t", "\\"]
                then Left $ "Illegal macro name (cannot be variable format or escape char): " ++ show name
                else do
                    (body, afterBody) <- parseExprs rest
                    case afterBody of
                        ("qooq":remTokens) -> Right (MacroDef name body, remTokens)
                        _ -> Left $ "Missing 'qooq' for macro definition: " ++ name
        ("poops":rest) -> do
            if not (isVarName name) 
                then Left $ "Invalid parameter name (must be [a-z_]+): " ++ show name
                else do
                    (body, afterBody) <- parseExprs rest
                    case afterBody of
                        ("qooq":remTokens) -> Right (Func name body, remTokens)
                        _ -> Left $ "Missing 'qooq' for function: " ++ name
        _ -> Left $ "Expected 'is' or 'poops' after 'poop " ++ name ++ "'"

parsePooping :: [String] -> Either String (Node, [String])
parsePooping ts = do
    (funcNodes, afterFunc) <- parseExprs ts
    case afterFunc of
        ("poopy":rest) -> do
            (argNodes, afterArg) <- parseExprs rest
            case afterArg of
                ("qooq":remTokens) -> 
                    let funcNode = case funcNodes of
                                    [x] -> x
                                    xs -> Token (unwords (map show xs)) 
                    in Right (Apply funcNode argNodes, remTokens)
        _ -> Left "Expected 'poopy' in 'pooping' structure"

parseProgram :: String -> Either String [Node]
parseProgram code = 
    let tokens = tokenize code
    in case parseExprs tokens of
        Right (nodes, []) -> Right nodes
        Right (_, rest) -> Left $ "Unexpected tokens at end: " ++ show (take 5 rest)
        Left err -> Left err

-- ==========================================
-- Evaluator Helpers
-- ==========================================

nodesToString :: [Node] -> String
nodesToString [] = ""
nodesToString (x:xs) = nodeStr x ++ nodesToString xs
  where
    nodeStr (Token s) = s
    nodeStr (Literal s) = if length s <= 4 then "" else drop 2 (take (length s - 2) s)
    nodeStr (Func p b) = "poop " ++ p ++ " poops " ++ nodesToString b ++ " qooq"
    nodeStr (MacroDef n b) = "poop " ++ n ++ " is " ++ nodesToString b ++ " qooq"
    nodeStr (Apply f a) = "pooping " ++ nodeStr f ++ " poopy " ++ nodesToString a ++ " qooq"

isReduced :: Map.Map String [Node] -> Node -> Bool
isReduced env (Token t) = t /= "Input" && not (Map.member t env)
isReduced _ (Literal _) = True
isReduced env (Func _ body) = all (isReduced env) body
isReduced env (MacroDef _ body) = all (isReduced env) body
isReduced _ (Apply _ _) = False

containsPrint :: Node -> Bool
containsPrint (Apply (Token "Print") _) = True
containsPrint (Apply f args) = containsPrint f || any containsPrint args
containsPrint (Func _ body) = any containsPrint body
containsPrint (MacroDef _ body) = any containsPrint body
containsPrint _ = False

substitute :: String -> [Node] -> [Node] -> [Node]
substitute param argNodes [] = []
substitute param argNodes (n:ns) = 
    let processedHead = case n of
            Token t | t == param -> argNodes
            Token t -> [Token t]
            Literal l -> [Literal l]
            Func p b -> 
                if p == param 
                then [Func p b] 
                else [Func p (substitute param argNodes b)]
            MacroDef name b -> [MacroDef name (substitute param argNodes b)]
            Apply f a -> 
                let newF = head (substitute param argNodes [f])
                    newA = substitute param argNodes a
                in [Apply newF newA]
    in processedHead ++ substitute param argNodes ns

debugLog :: String -> StateT AppState IO ()
debugLog msg = do
    st <- get
    when (debugMode st) $ liftIO $ do
        hPutStrLn stderr msg
        hFlush stderr

-- ========== Macro expansion helpers ==========

expandOnceNodes :: [Node] -> StateT AppState IO ([Node], Bool)
expandOnceNodes [] = return ([], False)
expandOnceNodes (n:ns) = do
    st <- get
    let env = macros st
    case n of
        Token t -> case Map.lookup t env of
            Just body -> do
                (restExpanded, restChanged) <- expandOnceNodes ns
                return (body ++ restExpanded, True)
            Nothing -> do
                (restExpanded, restChanged) <- expandOnceNodes ns
                return (Token t : restExpanded, restChanged)
        Literal l -> do
            (restExpanded, restChanged) <- expandOnceNodes ns
            return (Literal l : restExpanded, restChanged)
        Func p b -> do
            (newB, changedB) <- expandOnceNodes b
            (restExpanded, restChanged) <- expandOnceNodes ns
            return (Func p newB : restExpanded, changedB || restChanged)
        MacroDef name b -> do
            (newB, changedB) <- expandOnceNodes b
            (restExpanded, restChanged) <- expandOnceNodes ns
            return (MacroDef name newB : restExpanded, changedB || restChanged)
        Apply f a -> do
            (fExpandedList, fChanged) <- expandOnceNodes [f]
            let newF = case fExpandedList of
                          [x] -> x
                          xs -> Token (unwords (map show xs))
            (newArgs, argsChanged) <- expandOnceNodes a
            (restExpanded, restChanged) <- expandOnceNodes ns
            return (Apply newF newArgs : restExpanded, fChanged || argsChanged || restChanged)

expandMacrosDeep :: [Node] -> StateT AppState IO ([Node], Bool)
expandMacrosDeep nodes = loop nodes False
  where
    loop cur accChanged = do
        (next, changed) <- expandOnceNodes cur
        if changed
            then loop next True
            else return (next, accChanged)

-- ==========================================
-- One step of reduction
-- ==========================================

step :: [Node] -> StateT AppState IO ([Node], Bool)
step [] = return ([], False)
step nodes = reduceFirst nodes
  where
    reduceFirst :: [Node] -> StateT AppState IO ([Node], Bool)
    reduceFirst [] = return ([], False)

    -- PRIORITY 1: Input
    reduceFirst (Token "Input" : rest) = do
        debugLog "[INPUT] Reading..."
        (expansion, _) <- expandInput
        return (expansion ++ rest, True)

    -- PRIORITY 2: Macro Definition
    reduceFirst (MacroDef name body : rest) = do
        st <- get
        let env = macros st
        if Map.member name env
            then error $ "Macro redefinition error: " ++ name
            else do
                debugLog $ "[DEF] Macro: " ++ name
                put (st { macros = Map.insert name body env })
                return (rest, True)

    -- PRIORITY 3: Expand macros (Standard identifier resolution)
    reduceFirst (Token name : rest) = do
        st <- get
        let env = macros st
        case Map.lookup name env of
            Just body -> do
                debugLog $ "[EXPAND] Macro: " ++ name
                return (body ++ rest, True)
            Nothing -> do
                (newRest, changed) <- reduceFirst rest
                return (Token name : newRest, changed)

    -- PRIORITY 4: Function Application (The Split Strategy)
    reduceFirst (Apply func args : rest) = do
        -- 4a. Reduce the function head first
        (newFunc, funcChanged) <- reduceFirst [func]
        if funcChanged
            then do
                let func' = case newFunc of [f] -> f; _ -> Token "ERROR"
                return (Apply func' args : rest, True)
            else do
                st <- get
                let isLazy = lazyMode st
                
                case func of
                    -- CASE: Standard Function
                    Func param body -> do
                        if isLazy
                            then do
                                -- [STRATEGY: LAZY]
                                debugLog $ "[APPLY-LAZY] Substitution on: " ++ param
                                let substituted = substitute param args body
                                return (substituted ++ rest, True)
                            else do
                                -- [STRATEGY: ORIGINAL]
                                (expandedBody, bodyExpanded) <- expandMacrosDeep body
                                if bodyExpanded
                                    then return (Apply (Func param expandedBody) args : rest, True)
                                    else do
                                        if any containsPrint body
                                            then do
                                                debugLog "[APPLY-ORIG] Func has Print. Lazy Subst."
                                                let substituted = substitute param args body
                                                return (substituted ++ rest, True)
                                            else do
                                                -- Eagerly reduce arguments first
                                                (newArgs, argsChanged) <- reduceFirst args
                                                if argsChanged
                                                    then return (Apply (Func param body) newArgs : rest, True)
                                                    else do
                                                        debugLog "[APPLY-ORIG] Beta-reduction (Eager)."
                                                        let substituted = substitute param args body
                                                        return (substituted ++ rest, True)

                    -- CASE: Token (Built-ins or Macros)
                    Token t -> do
                        if t == "Print" 
                            then if all (isReduced (macros st)) args
                                then do
                                    let output = nodesToString args
                                    liftIO $ putStr output 
                                    liftIO $ hFlush stdout
                                    debugLog $ "[PRINT] Output: " ++ output
                                    return (args ++ rest, True)
                                else do
                                    (newArgs, changed) <- reduceFirst args
                                    if changed
                                        then return (Apply (Token "Print") newArgs : rest, True)
                                        else do
                                            (newRest, restChanged) <- reduceFirst rest
                                            return (Apply (Token "Print") args : newRest, restChanged)
                            else case Map.lookup t (macros st) of
                                Just body -> do
                                    debugLog $ "[EXPAND] Macro in Apply: " ++ t
                                    let newFunc = case body of [x] -> x; _ -> Token "ERROR_MACRO_SINGLE"
                                    return (Apply newFunc args : rest, True)
                                Nothing -> do
                                    (newArgs, changed) <- reduceFirst args
                                    if changed
                                        then return (Apply (Token t) newArgs : rest, True)
                                        else do
                                            (newRest, restChanged) <- reduceFirst rest
                                            return (Apply (Token t) args : newRest, restChanged)
                    
                    -- CASE: Nested Application ((f x) y)
                    Apply innerF innerArgs -> do
                        ([newInner], changed) <- reduceFirst [Apply innerF innerArgs]
                        if changed
                            then return (Apply newInner args : rest, True)
                            else do
                                -- If inner application is stuck, try reducing args?
                                (newArgs, argsChanged) <- reduceFirst args
                                if argsChanged
                                    then return (Apply (Apply innerF innerArgs) newArgs : rest, True)
                                    else do
                                        (newRest, restChanged) <- reduceFirst rest
                                        return (Apply (Apply innerF innerArgs) args : newRest, restChanged)
                    
                    -- Fallback
                    _ -> do
                        (newArgs, changed) <- reduceFirst args
                        if changed
                            then return (Apply func newArgs : rest, True)
                            else do
                                (newRest, restChanged) <- reduceFirst rest
                                return (Apply func args : newRest, restChanged)
    
    -- PRIORITY LOW: Function Definitions (Macro expansion only)
    reduceFirst (Func p body : rest) = do
        (newBody, changed) <- expandMacrosDeep body
        if changed
            then return (Func p newBody : rest, True)
            else do
                (newRest, restChanged) <- reduceFirst rest
                return (Func p body : newRest, restChanged)
    
    reduceFirst (Literal l : rest) = do
        (newRest, changed) <- reduceFirst rest
        return (Literal l : newRest, changed)

expandInput :: StateT AppState IO ([Node], Bool)
expandInput = do
    liftIO $ hPutStr stderr "Input> "
    liftIO $ hFlush stderr
    line <- liftIO getLine
    case parseProgram line of
        Left err -> error $ "Input parsing error: " ++ err
        Right nodes -> return (nodes, True)

runEval :: [Node] -> StateT AppState IO [Node]
runEval nodes = do
    st <- get
    when (debugMode st) $ liftIO $ do
        hPutStrLn stderr "----------------------------------------"
        hPutStrLn stderr $ "AST: " ++ nodesToString nodes
    
    (newNodes, changed) <- step nodes
    if changed
        then runEval newNodes
        else return newNodes

-- ==========================================
-- Main
-- ==========================================

main :: IO ()
main = do
    args <- getArgs
    let (flags, files) = partition ("-" `isPrefixOf`) args
    
    -- Parse Flags
    let isDebug = "--debug" `elem` flags
    
    let lazyFlag = find ("--lazy=" `isPrefixOf`) flags
    let isLazy = case lazyFlag of
            Just val -> map toLower (drop 7 val) == "true"
            Nothing  -> True

    case files of
        [fileName] -> do
            content <- readFile fileName
            case parseProgram content of
                Left err -> putStrLn $ "Error parsing: " ++ err
                Right ast -> do
                    when isDebug $ hPutStrLn stderr $ "Starting Poop Interpreter. Mode: " ++ (if isLazy then "Lazy (Call-by-Name)" else "Original (Eager/Mixed)")
                    let initialState = AppState { 
                        macros = Map.empty, 
                        debugMode = isDebug,
                        lazyMode = isLazy
                    }
                    void $ runStateT (runEval ast) initialState
        _ -> do
            putStrLn "Usage: ./poop <file.poop> [options]"
            putStrLn "Options:"
            putStrLn "  --debug          Enable verbose AST logging"
            putStrLn "  --lazy=true      Use Lazy Evaluation (Call-by-Name) [Default]"
            putStrLn "  --lazy=false     Use Original Evaluation (Mixed Eager)"
