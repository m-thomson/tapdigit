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
    expression: TNode
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
const Token = {
  Operator: 'Operator',
  Identifier: 'Identifier',
  Number: 'Number'
}

export class Lexer {
  expression = ''
  length = 0
  index = 0
  marker = 0
  T = Token

  private peekNextChar(): string {
    let idx = this.index
    return ((idx < this.length) ? this.expression.charAt(idx) : '\x00')
  }

  private getNextChar(): string {
    let ch = '\x00',
      idx = this.index
    if (idx < this.length) {
      ch = this.expression.charAt(idx)
      this.index += 1
    }
    return ch
  }

  private isWhiteSpace(ch:string): boolean {
    return (ch === '\u0009') || (ch === ' ') || (ch === '\u00A0')
  }

  private isLetter(ch:string): boolean {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')
  }

  private isDecimalDigit(ch:string): boolean {
    return (ch >= '0') && (ch <= '9')
  }

  private createToken(type:string, value:any): TToken {
    return {
      type,
      value,
      start: this.marker,
      end: this.index - 1
    }
  }

  private skipSpaces(): void {
    let ch

    while (this.index < this.length) {
      ch = this.peekNextChar()
      if (!this.isWhiteSpace(ch)) {
        break
      }
      this.getNextChar()
    }
  }

  private scanOperator(): TToken | undefined {
    let ch = this.peekNextChar()
    if ('+-*/()^%=;,'.indexOf(ch) >= 0) {
      return this.createToken(this.T.Operator, this.getNextChar())
    }
    return undefined
  }

  private isIdentifierStart(ch:string): boolean {
    return (ch === '_') || this.isLetter(ch)
  }

  private isIdentifierPart(ch:string): boolean {
    return this.isIdentifierStart(ch) || this.isDecimalDigit(ch)
  }

  private scanIdentifier(): TToken | undefined {
    let ch, id

    ch = this.peekNextChar()
    if (!this.isIdentifierStart(ch)) {
      return undefined
    }

    id = this.getNextChar()
    while (true) {
      ch = this.peekNextChar()
      if (!this.isIdentifierPart(ch)) {
        break
      }
      id += this.getNextChar()
    }

    return this.createToken(this.T.Identifier, id)
  }

  private scanNumber(): TToken | undefined {
    let ch, number

    ch = this.peekNextChar()
    if (!this.isDecimalDigit(ch) && (ch !== '.')) {
      return undefined
    }

    number = ''
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
        throw new SyntaxError('Unexpected ' + ch + ' after the exponent sign')
      }
    }

    if (number === '.') {
      throw new SyntaxError('Expecting decimal digits after the dot sign')
    }

    return this.createToken(this.T.Number, number)
  }

  public reset(str:string): void {
    this.expression = str
    this.length = str.length
    this.index = 0
  }

  public next(): TToken|undefined {
    let token

    this.skipSpaces()
    if (this.index >= this.length) {
      return undefined
    }

    this.marker = this.index

    token = this.scanNumber()
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

    throw new SyntaxError('Unknown token from character ' + this.peekNextChar())
  }

  public peek(): TToken | undefined {
    let token
    let idx = this.index
    try {
      token = this.next()
      if (token) {
        delete token.start
        delete token.end
      }
    } catch (e) {
      token = undefined
    }
    this.index = idx

    return token
  }
}

export class Parser {

  private lexer = new Lexer()
  private T = Token

  private matchOp(token:TToken|undefined, op:any): boolean {
    return (typeof token !== 'undefined') &&
      token.type === this.T.Operator &&
      token.value === op
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
      if (!this.matchOp(peekToken, ',')) {
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

    if (!this.matchOp(token, '(')) {
      throw new SyntaxError('Expecting ( in a function call "' + name + '"')
    }

    let peekToken = this.lexer.peek()
    if (!this.matchOp(peekToken, ')')) {
      args = this.parseArgumentList()
    }

    token = this.lexer.next()
    if (!this.matchOp(token, ')')) {
      throw new SyntaxError('Expecting ) in a function call "' + name + '"')
    }

    return {
      FunctionCall: {name, args}
    }
  }

  // Primary ::= Identifier | Number | '(' Assignment ')' | FunctionCall
  private parsePrimary(): TNode {
    let peekToken = this.lexer.peek()

    if (peekToken === undefined) {
      throw new SyntaxError('Unexpected termination of expression')
    }

    if (peekToken.type === this.T.Identifier) {
      let token = this.lexer.next() as TToken
      if (this.matchOp(this.lexer.peek(), '(')) {
        return this.parseFunctionCall(token.value)
      } else {
        return {Identifier: token.value}
      }
    }

    if (peekToken.type === this.T.Number) {
      let token = this.lexer.next() as TToken
      return {Number: token.value}
    }

    if (this.matchOp(peekToken, '(')) {
      this.lexer.next()
      let expr = this.parseAssignment()
      let token = this.lexer.next() as TToken
      if (!this.matchOp(token, ')')) {
        throw new SyntaxError('Expecting )')
      }
      return {Expression: expr}
    }

    throw new SyntaxError('Parse error, can not process token ' + peekToken.value)
  }

  // Unary ::= Primary | '-' Unary
  private parseUnary(): TNode {
    let peekToken = this.lexer.peek()
    if (this.matchOp(peekToken, '-') || this.matchOp(peekToken, '+')) {
      let token = this.lexer.next() as TToken
      let expr = this.parseUnary()
      return {
        Unary: {
          operator: token.value,
          expression: expr
        }
      }
    }

    return this.parsePrimary()
  }

  // Multiplicative ::= Unary | Multiplicative '*' Unary | Multiplicative '/' Unary
  private parseMultiplicative(): TNode {
    let expr = this.parseUnary()
    let peekToken = this.lexer.peek()
    while (this.matchOp(peekToken, '*') || this.matchOp(peekToken, '/')) {
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
    while (this.matchOp(peekToken, '+') || this.matchOp(peekToken, '-')) {
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
      if (this.matchOp(peekToken, '=')) {
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

  public parse(expression:string): Required<Pick<TNode, 'Expression'>> {
    this.lexer.reset(expression)
    let expr = this.parseExpression()
    let token = this.lexer.next()

    if (typeof token !== 'undefined') {
      throw new SyntaxError('Unexpected token ' + token.value)
    }

    return {
      Expression: expr
    }
  }
}

function Context() {
  let Constants = {
    pi: 3.1415926535897932384,
    phi: 1.6180339887498948482
  }

  let Functions = {
    abs: Math.abs,
    acos: Math.acos,
    asin: Math.asin,
    atan: Math.atan,
    ceil: Math.ceil,
    cos: Math.cos,
    exp: Math.exp,
    floor: Math.floor,
    ln: Math.log,
    random: Math.random,
    sin: Math.sin,
    sqrt: Math.sqrt,
    tan: Math.tan
  }

  return {
    Constants,
    Functions,
    Variables: {}
  }
}

export function Evaluator(ctx?: any) {

  let parser = new Parser()
  let context = (arguments.length < 1) ? Context() : ctx

  function exec(node: TNode): number {
    let expr

    if (node.Expression !== undefined) {
      return exec(node.Expression)
    }

    if (node.Number !== undefined) {
      return parseFloat(node.Number)
    }

    if (node.Binary !== undefined) {
      let subNode = node.Binary
      let left = exec(subNode.left)
      let right = exec(subNode.right)
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
          throw new SyntaxError('Unknown operator ' + subNode.operator)
      }
    }

    if (node.Unary !== undefined) {
      let subNode = node.Unary
      expr = exec(subNode.expression)
      switch (subNode.operator) {
        case '+':
          return expr
        case '-':
          return -expr
        default:
          throw new SyntaxError('Unknown operator ' + subNode.operator)
      }
    }

    if (node.Identifier !== undefined) {
      if (context.Constants.hasOwnProperty(node.Identifier)) {
        return context.Constants[node.Identifier]
      }
      if (context.Variables.hasOwnProperty(node.Identifier)) {
        return context.Variables[node.Identifier]
      }
      throw new SyntaxError('Unknown identifier')
    }

    if (node.Assignment !== undefined) {
      let right = exec(node.Assignment.value)
      context.Variables[node.Assignment.name.Identifier] = right
      return right
    }

    if (node.FunctionCall !== undefined) {
      expr = node.FunctionCall
      if (context.Functions.hasOwnProperty(expr.name)) {
        let args = []
        for (let i = 0; i < expr.args.length; i += 1) {
          args.push(exec(expr.args[i]))
        }
        return context.Functions[expr.name].apply(null, args)
      }
      throw new SyntaxError('Unknown function ' + expr.name)
    }

    throw new SyntaxError('Unknown syntax node')
  }

  function evaluate(expr: string): number {
    let tree = parser.parse(expr)
    return exec(tree.Expression)
  }

  return {evaluate}
}

// noinspection JSUnusedGlobalSymbols
export function Editor(element:HTMLElement) {

  let lexer = new Lexer()
  let cursor: HTMLElement
  let blinkTimer: number|undefined
  let editor: HTMLDivElement & Node
  let input: HTMLInputElement
  let hasFocus: boolean

  function hideCursor(): void {
    if (blinkTimer) {
      window.clearInterval(blinkTimer)
    }
    blinkTimer = undefined
    cursor.style.visibility = 'hidden'
  }

  function blinkCursor(): void {
    let visible = true
    if (blinkTimer) {
      window.clearInterval(blinkTimer)
    }
    blinkTimer = window.setInterval(function () {
      cursor.style.visibility = visible ? '' : 'hidden'
      visible = !visible
    }, 423)
  }

  // Get cursor position from the proxy input and adjust the editor
  function updateCursor(): void {
    let start:number
    let end:number
    let x:number
    let y:number
    let cls: string|null

    if (!cursor) {
      return
    }

    if (cursor.getAttribute('id') !== 'cursor') {
      return
    }

    start = input.selectionStart || 0
    end = input.selectionEnd || 0
    if (start > end) {
      end = input.selectionStart || 0
      start = input.selectionEnd || 0
    }

    if (editor.childNodes.length <= start) {
      return
    }

    let el = editor.childNodes[start] as HTMLElement
    if (el) {
      x = el.offsetLeft
      y = el.offsetTop
      cursor.style.left = x + 'px'
      cursor.style.top = y + 'px'
      cursor.style.opacity = '1'
    }

    // If there is a selection, add the CSS class 'selected'
    // to all nodes inside the selection range.
    cursor.style.opacity = (start === end) ? '1' : '0'
    for (let i = 0; i < editor.childNodes.length; i += 1) {
      el = editor.childNodes[i] as HTMLElement
      cls = el.getAttribute('class')
      if (cls !== null) {
        cls = cls.replace(' selected', '')
        if (i >= start && i < end) {
          cls += ' selected'
        }
        el.setAttribute('class', cls)
      }
    }
  }

  // Get a new text from the proxy input and update the syntax highlight
  function updateEditor(): void {
    let tokens = []
    let text = ''
    let html = ''
    let expr = input.value
    try {
      lexer.reset(expr)
      while (true) {
        let token = lexer.next()
        if (typeof token === 'undefined') {
          break
        }
        tokens.push(token)
      }

      for (let i = 0; i < tokens.length; i += 1) {
        let token = tokens[i]
        while (text.length < token.start) {
          text += ' '
          html += '<span class="blank"> </span>'
        }
        let str = expr.substring(token.start, token.end + 1)
        for (let j = 0; j < str.length; j += 1) {
          html += `<span class="${token.type}">`
          html += str.charAt(j)
          text += str.charAt(j)
          html += '</span>'
        }
      }
      while (text.length < expr.length) {
        text += ' '
        html += '<span class="blank"> </span>'
      }
    } catch (e) {
      // plain spans for the editor
      html = ''
      for (let i = 0; i < expr.length; i += 1) {
        html += '<span class="error">' + expr.charAt(i) + '</span>'
      }
    } finally {
      html += '<span class="cursor" id="cursor">\u00A0</span>'
      if (html !== editor.innerHTML) {
        editor.innerHTML = html
        cursor = document.getElementById('cursor') as HTMLElement
        blinkCursor()
        updateCursor()
      }
    }
  }

  function focus(): void {
    window.setTimeout(function () {
      input.focus()
      blinkCursor()
      updateCursor()
    }, 0)
  }

  function blur(): void {
    input.blur()
  }

  function deselect(): void {
    let cls: string|null
    let el = editor.firstChild as HTMLElement
    input.selectionEnd = input.selectionStart
    while (el) {
      cls = el.getAttribute('class')
      if (cls && cls.match('selected')) {
        cls = cls.replace('selected', '')
        el.setAttribute('class', cls)
      }
      el = el.nextSibling as HTMLElement
    }
  }

  function setHandler(el:Document|HTMLElement, eventName:string, handler:{(...args:any[]):any}): void {
    el.addEventListener(eventName, handler, false)
  }

  function resetHandler(el:Document|HTMLElement, eventName:string, handler: {(...args: any[]):any}): void {
    el.removeEventListener(eventName, handler, false)
  }

  function onInputKeyDown(): void {
    updateCursor()
  }

  function onInputKeyUp(): void {
    updateEditor()
  }

  function onInputBlur(): void {
    hasFocus = false
    hideCursor()
  }

  function onInputFocus(): void {
    hasFocus = true
  }

  function onEditorMouseDown(event: MouseEvent): void {
    let x, y, el, x1, y1, x2, y2
    let anchor = 0 // ?

    deselect()

    x = event.clientX
    y = event.clientY
    let i
    for (i = 0; i < editor.childNodes.length; i += 1) {
      el = editor.childNodes[i] as HTMLElement
      x1 = el.offsetLeft
      x2 = x1 + el.offsetWidth
      y1 = el.offsetTop
      y2 = y1 + el.offsetHeight
      if (x1 <= x && x < x2 && y1 <= y && y < y2) {
        input.selectionStart = i
        input.selectionEnd = i
        anchor = i
        blinkCursor()
        break
      }
    }

    // no match, then assume it is at the end
    if (i >= editor.childNodes.length) {
      input.selectionStart = input.value.length
      input.selectionEnd = input.selectionStart
      anchor = input.value.length
    }

    function onDocumentMouseMove(event: MouseEvent) {
      if (event.target && (event.target as Element).parentNode === editor) {
        for (let i = 0; i < editor.childNodes.length; i += 1) {
          el = editor.childNodes[i]
          if (el === event.target && el !== cursor) {
            input.selectionStart = Math.min(i, anchor)
            input.selectionEnd = Math.max(i, anchor)
            blinkCursor()
            updateCursor()
            break
          }
        }
      }
      if (event.preventDefault) {
        event.preventDefault()
      }
      event.returnValue = false
    }

    function onDocumentMouseUp(event: MouseEvent) {
      if (event.preventDefault) {
        event.preventDefault()
      }
      event.returnValue = false
      window.setTimeout(function () {
        resetHandler(document, 'mousemove', onDocumentMouseMove)
        resetHandler(document, 'mouseup', onDocumentMouseUp)
      }, 100)
    }

    focus()
    setHandler(document, 'mousemove', onDocumentMouseMove)
    setHandler(document, 'mouseup', onDocumentMouseUp)
    if (event.preventDefault) {
      event.preventDefault()
    }
    event.returnValue = false
  }

  function setupDOM(element:HTMLElement): void {
    let container, wrapper

    // Proxy input where we capture user keyboard interaction
    input = document.createElement('input')
    input.style.position = 'absolute'
    input.style.width = '100px'
    input.value = 'x = 40 + (6 / 3.0)'
    input.style.position = 'absolute'

    // Container for the above proxy, it also hides the proxy element
    container = document.createElement('div')
    container.appendChild(input)
    container.style.overflow = 'hidden'
    container.style.width = '1px'
    container.style.height = '0px'
    container.style.position = 'relative'

    // The "fake" editor
    editor = document.createElement('div')
    editor.setAttribute('class', 'editor')
    // @ts-ignore TODO: no-such css property "wrap"
    editor.style.wrap = 'on'
    editor.textContent = ' '

    // Top-level wrapper for container
    wrapper = document.createElement('div')
    wrapper.appendChild(container)
    wrapper.appendChild(editor)
    element.appendChild(wrapper)

    // Wire all event handlers
    setHandler(input, 'keydown', onInputKeyDown)
    setHandler(input, 'keyup', onInputKeyUp)
    setHandler(input, 'blur', onInputBlur)
    setHandler(input, 'focus', onInputFocus)
    setHandler(editor, 'mousedown', onEditorMouseDown)
  }

  hasFocus = false
  setupDOM(element)
  updateEditor()

  // noinspection JSUnusedGlobalSymbols
  return {focus, blur, deselect}
}

