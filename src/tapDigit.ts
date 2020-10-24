/*
  Copyright (C) 2011 Ariya Hidayat <ariya.hidayat@gmail.com>
  With modifications by Mark Thomson <hello@markthomson.ca> beginning Aug 6, 2020.

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of the <organization> nor the
      names of its contributors may be used to endorse or promote products
      derived from this software without specific prior written permission.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

type TToken = {
  type: string,
  value: any,
  start: number,
  end: number
}

type TNode = {
  Expression?: TNode
  Identifier?: string // Variable name
  Number?: string     // Number literal (as string)
  Unary?: {           // An operation on a single item (eg. -5)
    operator: string
    expr: TNode
  }
  Binary?: {          // An operation between two items
    operator: string
    left: TNode
    right: TNode
  }
  Assignment?: {     // Assign [value] to variable [name]
    name: { Identifier: string }
    value: TNode
  }
  FunctionCall?: {   // Custom functions for non-built-in operations (eg. foo(5))
    name: string
    args: TNode[]
  }
}


export const builtIns = {
  identifiers: {
    pi: 3.1415926535897932384,
    phi: 1.6180339887498948482
  },
  functions: {
    abs: Math.abs,
    acos: Math.acos,
    asin: Math.asin,
    atan: Math.atan,
    ceil: Math.ceil,
    cos: Math.cos,
    exp: Math.exp,
    ln: Math.log,
    sin: Math.sin,
    sqrt: Math.sqrt,
    tan: Math.tan,
    floor: Math.floor,
    random: Math.random,
  },
}


const LexerTokens = {
  operator: 'Operator',
  identifier: 'Identifier',
  number: 'Number'
}

export class LexerError extends Error {
  position: number
  message: string

  constructor(lexer: Lexer, message: string) {
    super()
    this.position = Math.max(lexer.marker - 1, 0)
    this.message = `${message} at character ${this.position}`
  }
}

export class Lexer {
  expression = ''
  length = 0
  index = 0
  marker = 0

  public reset(str: string): void {
    this.expression = str
    this.length = str.length
    this.index = 0
  }

  public next(): TToken | undefined {

    this.skipSpaces()
    if (this.index >= this.length) {
      return undefined
    }

    this.marker = this.index

    let token = this.scanNumber()
    if (typeof token !== 'undefined') {
      return token
    }

    token = this.scanOperator()
    if (typeof token !== 'undefined') {
      return token
    }

    token = this.scanIdentifier()
    if (typeof token !== 'undefined') {
      return token
    }

    throw new LexerError(this, 'Unknown token from character ' + this.peekNextChar())
  }

  public peek(): TToken | undefined {
    let token
    let idx = this.index
    try {
      token = this.next()
      if (token !== undefined) {
        if (token.start !== undefined) delete token?.start
        if (token.end !== undefined) delete token?.end
      }
    } catch (e) {
      token = undefined
    }
    this.index = idx

    return token
  }

  private createToken(type: string, value: any): TToken {
    return {
      type,
      value,
      start: this.marker,
      end: this.index - 1
    }
  }

  private peekNextChar(): string {
    let idx = this.index
    return ((idx < this.length) ? this.expression.charAt(idx) : '\x00')
  }

  private getNextChar(): string {
    let ch = '\x00'
    let idx = this.index
    if (idx < this.length) {
      ch = this.expression.charAt(idx)
      this.index += 1
    }
    return ch
  }

  private skipSpaces(): void {
    while (this.index < this.length) {
      let ch = this.peekNextChar()
      if (!this.isWhiteSpace(ch)) {
        break
      }
      this.getNextChar()
    }
  }

  private scanOperator(): TToken | undefined {
    let ch = this.peekNextChar()
    if ('+-*/()^%=;,'.indexOf(ch) >= 0) {
      return this.createToken(LexerTokens.operator, this.getNextChar())
    }
    return undefined
  }

  private scanIdentifier(): TToken | undefined {
    let ch = this.peekNextChar()
    if (!this.isIdentifierStart(ch)) {
      return undefined
    }
    let id = this.getNextChar()
    while (true) {
      ch = this.peekNextChar()
      if (!this.isIdentifierPart(ch)) {
        break
      }
      id += this.getNextChar()
    }

    return this.createToken(LexerTokens.identifier, id)
  }

  private scanNumber(): TToken | undefined {
    let ch = this.peekNextChar()
    if (!this.isDecimalDigit(ch) && (ch !== '.')) {
      return undefined
    }

    let number = ''
    if (ch !== '.') {
      number = this.getNextChar()
      while (true) {
        ch = this.peekNextChar()
        if (!this.isDecimalDigit(ch)) {
          break
        }
        number += this.getNextChar()
      }
    }

    if (ch === '.') {
      number += this.getNextChar()
      while (true) {
        ch = this.peekNextChar()
        if (!this.isDecimalDigit(ch)) {
          break
        }
        number += this.getNextChar()
      }
    }

    // eg. 1e4 = 10000. https://javascript.info/number#more-ways-to-write-a-number
    if (ch === 'e' || ch === 'E') {
      number += this.getNextChar()
      ch = this.peekNextChar()
      if (ch === '+' || ch === '-' || this.isDecimalDigit(ch)) {
        number += this.getNextChar()
        while (true) {
          ch = this.peekNextChar()
          if (!this.isDecimalDigit(ch)) {
            break
          }
          number += this.getNextChar()
        }
      } else {
        ch = 'character ' + ch
        if (this.index >= this.length) {
          ch = '<end>'
        }
        throw new LexerError(this, 'Unexpected ' + ch + ' after the exponent sign')
      }
    }

    if (number === '.') {
      throw new LexerError(this, 'Expecting decimal digits after the dot sign')
    }

    return this.createToken(LexerTokens.number, number)
  }

  private isDecimalDigit(ch: string): boolean {
    return (ch >= '0') && (ch <= '9')
  }

  private isWhiteSpace(ch: string): boolean {
    return (ch === '\u0009') || (ch === ' ') || (ch === '\u00A0')
  }

  private isLetter(ch: string): boolean {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')
  }

  private isIdentifierStart(ch: string): boolean {
    return (ch === '_') || this.isLetter(ch)
  }

  private isIdentifierPart(ch: string): boolean {
    return this.isIdentifierStart(ch) || this.isDecimalDigit(ch)
  }
}

export class ParserError extends Error {
  position:number
  message:string
  constructor(parser:Parser, message:string) {
    super()
    this.position = Math.max(parser.lexer.marker - 1, 0)
    this.message = `${message} at character ${this.position}`
  }
}

export class Parser {

  public lexer = new Lexer()
  public warnings:string[] = []

  constructor(
    readonly validFuncs:{ [name: string]: { (...args: any[]): number } },
    readonly validIdentifiers?: { [name: string]: any }) {
  }

  public parse(expression: string): Required<Pick<TNode, 'Expression'>>|{Expression:undefined} {
    if (expression.trim() === "")
      return { Expression:undefined }
    this.lexer.reset(expression)
    this.warnings = []
    let expr = this.parseExpression()
    let token = this.lexer.next()

    if (token !== undefined) {
      throw new ParserError(this, `Unexpected token "${token.value}"`)
    }

    return {
      Expression: expr
    }
  }

  // ArgumentList := Expression | Expression ',' ArgumentList
  private parseArgumentList(): TNode[] {
    let args = []

    while (true) {
      let expr = this.parseExpression()
      if (typeof expr === 'undefined') {
        // TODO maybe throw exception?
        break
      }
      args.push(expr)
      let peekToken = this.lexer.peek()
      if (!this.isOpToken(peekToken, ',')) {
        break
      }
      this.lexer.next()
    }

    return args
  }

  // FunctionCall ::= Identifier '(' ')' || Identifier '(' ArgumentList ')'
  private parseFunctionCall(name:string): TNode {
    let args = [] as TNode[]
    let token = this.lexer.next()

    if (!this.isOpToken(token, '(')) {
      throw new ParserError(this, 'Expecting "(" in a function call "' + name + '"')
    }

    let peekToken = this.lexer.peek()
    if (!this.isOpToken(peekToken, ')')) {
      args = this.parseArgumentList()
    }

    token = this.lexer.next()
    if (!this.isOpToken(token, ')')) {
      throw new ParserError(this, `Missing ")" in function "${name}"`)
    }

    if (!this.validFuncs[name]) {
      this.warnings.push(`Unknown function "${name}()"`)
    }
    else if (args.length !== this.validFuncs[name].length) {
      this.warnings.push(`Function ${name}() expects ${this.validFuncs[name].length} arg(s), found ${args.length}`)
    }

    return {
      FunctionCall: {name, args}
    }
  }

  // Primary ::= Identifier | Number | '(' Assignment ')' | FunctionCall
  private parsePrimary(): TNode {
    let peekToken = this.lexer.peek()

    if (peekToken === undefined) {
      throw new ParserError(this, 'Unexpected end of expression')
    }

    if (peekToken.type === LexerTokens.identifier) {
      let token = this.lexer.next() as TToken
      if (this.isOpToken(this.lexer.peek(), '(')) {
        return this.parseFunctionCall(token.value)
      } else {
        if (this.validIdentifiers && !this.validIdentifiers[token.value]) {
          this.warnings.push(`Unknown identifier "${token.value}"`)
        }
        return {Identifier: token.value}
      }
    }

    if (peekToken.type === LexerTokens.number) {
      let token = this.lexer.next() as TToken
      return {Number: token.value}
    }

    if (this.isOpToken(peekToken, '(')) {
      this.lexer.next()
      let expr = this.parseAssignment()
      let token = this.lexer.next() as TToken
      if (!this.isOpToken(token, ')')) {
        throw new ParserError(this, 'Expecting ")"')
      }
      return {Expression: expr}
    }

    throw new ParserError(this, `Unknown token "${peekToken.value}"`)
  }

  // Unary ::= Primary | '-' Unary
  private parseUnary(): TNode {
    let peekToken = this.lexer.peek()
    if (this.isOpToken(peekToken, '-') || this.isOpToken(peekToken, '+')) {
      let token = this.lexer.next() as TToken
      let expr = this.parseUnary()
      return {
        Unary: {
          operator: token.value,
          expr: expr
        }
      }
    }

    return this.parsePrimary()
  }

  // Multiplicative ::= Unary | Multiplicative '*' Unary | Multiplicative '/' Unary
  private parseMultiplicative(): TNode {
    let expr = this.parseUnary()
    let peekToken = this.lexer.peek()
    while (this.isOpToken(peekToken, '*') || this.isOpToken(peekToken, '/')) {
      let token = this.lexer.next() as TToken
      expr = {
        'Binary': {
          operator: token.value,
          left: expr,
          right: this.parseUnary()
        }
      }
      peekToken = this.lexer.peek()
    }
    return expr
  }

  // Additive ::= Multiplicative | Additive '+' Multiplicative | Additive '-' Multiplicative
  private parseAdditive(): TNode {
    let expr = this.parseMultiplicative()
    let peekToken = this.lexer.peek()
    while (this.isOpToken(peekToken, '+') || this.isOpToken(peekToken, '-')) {
      let token = this.lexer.next() as TToken
      expr = {
        'Binary': {
          operator: token.value,
          left: expr,
          right: this.parseMultiplicative()
        }
      }
      peekToken = this.lexer.peek()
    }
    return expr
  }

  // Assignment ::= Identifier '=' Assignment | Additive
  private parseAssignment(): TNode {
    let expr = this.parseAdditive()
    if (expr !== undefined && expr.Identifier) {
      let peekToken = this.lexer.peek()
      if (this.isOpToken(peekToken, '=')) {
        this.lexer.next()
        return {
          Assignment: {
            name: { Identifier: expr.Identifier },
            value: this.parseAssignment()
          }
        }
      }
      return expr
    }
    return expr
  }

  // Expression ::= Assignment
  private parseExpression(): TNode {
    return this.parseAssignment()
  }

  /**
   * Returns true if argument is an operator token with the given value
   */
  private isOpToken(token: TToken | undefined, value: any): boolean {
    return token !== undefined &&
      token.type === LexerTokens.operator &&
      token.value === value
  }
}

export class EvaluatorError extends Error {
  position: number
  message: string
  constructor(evaluator: Evaluator, message: string) {
    super()
    this.position = Math.max(evaluator.parser.lexer.marker - 1, 0)
    this.message = `${message} at position ${this.position}`
  }
}

export class Evaluator {

  parser:Parser

  constructor(
    readonly functions: { [name: string]: { (...args: any[]): number } },
    readonly identifiers: { [name: string]: number })
  {
    this.parser = new Parser(functions, identifiers)
  }

  public evaluate(expr: string): number|null {
    let tree = this.parser.parse(expr)
    if (tree.Expression === undefined) return null
    return this.exec(tree.Expression)
  }

  private exec(node: TNode): number {
    let expr

    if (node.Expression !== undefined) {
      return this.exec(node.Expression)
    }

    if (node.Number !== undefined) {
      return parseFloat(node.Number)
    }

    if (node.Binary !== undefined) {
      let subNode = node.Binary
      let left = this.exec(subNode.left)
      let right = this.exec(subNode.right)
      switch (subNode.operator) {
        case '+':
          return left + right
        case '-':
          return left - right
        case '*':
          return left * right
        case '/':
          return left / right
        default:
          throw new EvaluatorError(this, 'Unknown operator ' + subNode.operator)
      }
    }

    if (node.Unary !== undefined) {
      let subNode = node.Unary
      expr = this.exec(subNode.expr)
      switch (subNode.operator) {
        case '+':
          return expr
        case '-':
          return -expr
        default:
          throw new EvaluatorError(this, 'Unknown operator ' + subNode.operator)
      }
    }

    if (node.Identifier !== undefined) {
      if (this.identifiers.hasOwnProperty(node.Identifier)) {
        return this.identifiers[node.Identifier]
      }
      throw new EvaluatorError(this, `Unknown identifier "${node.Identifier}"`)
    }

    if (node.Assignment !== undefined) {
      let right = this.exec(node.Assignment.value)
      this.identifiers[node.Assignment.name.Identifier] = right
      return right
    }

    if (node.FunctionCall !== undefined) {
      expr = node.FunctionCall
      if (this.functions.hasOwnProperty(expr.name)) {
        let args = []
        for (let i = 0; i < expr.args.length; i += 1) {
          args.push(this.exec(expr.args[i]))
        }
        if (typeof this.functions[expr.name] === 'function')
          return this.functions[expr.name](...args)
        throw new EvaluatorError(this, `The function "${expr.name}" does not have a valid callback`)
      }
      throw new EvaluatorError(this, 'Unknown function ' + expr.name)
    }

    throw new EvaluatorError(this, 'Unknown syntax node')
  }
}
