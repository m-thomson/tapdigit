# TapDigit

TapDigit is a simple JavaScript implementation of a math expression [lexer](https://en.wikipedia.org/wiki/Lexical_analysis), [parser](https://en.wikipedia.org/wiki/Parsing), and [evaluator](https://en.wikipedia.org/wiki/Interpreter_(computing)).

`TapDigit.Lexer` splits a math expression into a sequence of tokens. This is useful for e.g. an expression editor with color syntax highlighting.

`TapDigit.Parser` parses an expression and produces the JSON-formatted syntax tree representation thereof.

`TapDigit.Evaluator` computes the result of an expression. Variables, constants, and functions supported in the expression syntax can be extended via `TapDigit.Context` object.

There is also a simple web page (open `demo/index.html`) which demonstrates how it works.

#About this fork

* TapDigit was originally created by [@AriyaHidayat](https://twitter.com/AriyaHidayat).
* This fork of TapDigit has been migrated to TypeScript/ES6.
* Available under the BSD license.
