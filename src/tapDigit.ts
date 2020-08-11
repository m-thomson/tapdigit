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

export function Lexer() {
  let expression = '',
    length = 0,
    index = 0,
    marker = 0,
    T = Token

  function peekNextChar(): string {
    let idx = index
    return ((idx < length) ? expression.charAt(idx) : '\x00')
  }

  function getNextChar(): string {
    let ch = '\x00',
      idx = index
    if (idx < length) {
      ch = expression.charAt(idx)
      index += 1
    }
    return ch
  }

  function isWhiteSpace(ch:string): boolean {
    return (ch === '\u0009') || (ch === ' ') || (ch === '\u00A0')
  }

  function isLetter(ch:string): boolean {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')
  }

  function isDecimalDigit(ch:string): boolean {
    return (ch >= '0') && (ch <= '9')
  }

  function createToken(type:string, value:any): TToken {
    return {
      type,
      value,
      start: marker,
      end: index - 1
    }
  }

  function skipSpaces(): void {
    let ch

    while (index < length) {
      ch = peekNextChar()
      if (!isWhiteSpace(ch)) {
        break
      }
      getNextChar()
    }
  }

  function scanOperator(): TToken | undefined {
    let ch = peekNextChar()
    if ('+-*/()^%=;,'.indexOf(ch) >= 0) {
      return createToken(T.Operator, getNextChar())
    }
    return undefined
  }

  function isIdentifierStart(ch:string): boolean {
    return (ch === '_') || isLetter(ch)
  }

  function isIdentifierPart(ch:string): boolean {
    return isIdentifierStart(ch) || isDecimalDigit(ch)
  }

  function scanIdentifier(): TToken | undefined {
    let ch, id

    ch = peekNextChar()
    if (!isIdentifierStart(ch)) {
      return undefined
    }

    id = getNextChar()
    while (true) {
      ch = peekNextChar()
      if (!isIdentifierPart(ch)) {
        break
      }
      id += getNextChar()
    }

    return createToken(T.Identifier, id)
  }

  function scanNumber(): TToken | undefined {
    let ch, number

    ch = peekNextChar()
    if (!isDecimalDigit(ch) && (ch !== '.')) {
      return undefined
    }

    number = ''
    if (ch !== '.') {
      number = getNextChar()
      while (true) {
        ch = peekNextChar()
        if (!isDecimalDigit(ch)) {
          break
        }
        number += getNextChar()
      }
    }

    if (ch === '.') {
      number += getNextChar()
      while (true) {
        ch = peekNextChar()
        if (!isDecimalDigit(ch)) {
          break
        }
        number += getNextChar()
      }
    }

    if (ch === 'e' || ch === 'E') {
      number += getNextChar()
      ch = peekNextChar()
      if (ch === '+' || ch === '-' || isDecimalDigit(ch)) {
        number += getNextChar()
        while (true) {
          ch = peekNextChar()
          if (!isDecimalDigit(ch)) {
            break
          }
          number += getNextChar()
        }
      } else {
        ch = 'character ' + ch
        if (index >= length) {
          ch = '<end>'
        }
        throw new SyntaxError('Unexpected ' + ch + ' after the exponent sign')
      }
    }

    if (number === '.') {
      throw new SyntaxError('Expecting decimal digits after the dot sign')
    }

    return createToken(T.Number, number)
  }

  function reset(str:string): void {
    expression = str
    length = str.length
    index = 0
  }

  function next(): TToken|undefined {
    let token

    skipSpaces()
    if (index >= length) {
      return undefined
    }

    marker = index

    token = scanNumber()
    if (typeof token !== 'undefined') {
      return token
    }

    token = scanOperator()
    if (typeof token !== 'undefined') {
      return token
    }

    token = scanIdentifier()
    if (typeof token !== 'undefined') {
      return token
    }

    throw new SyntaxError('Unknown token from character ' + peekNextChar())
  }

  function peek(): TToken | undefined {
    let token
    let idx = index
    try {
      token = next()
      if (token) {
        delete token.start
        delete token.end
      }
    } catch (e) {
      token = undefined
    }
    index = idx

    return token
  }

  return {reset, next, peek}
}

export function Parser() {

  let lexer = Lexer()
  let T = Token

  function matchOp(token:TToken|undefined, op:any): boolean {
    return (typeof token !== 'undefined') &&
      token.type === T.Operator &&
      token.value === op
  }

  // ArgumentList := Expression | Expression ',' ArgumentList
  function parseArgumentList(): TNode[] {
    let args = []

    while (true) {
      let expr = parseExpression()
      if (typeof expr === 'undefined') {
        // TODO maybe throw exception?
        break
      }
      args.push(expr)
      let peekToken = lexer.peek()
      if (!matchOp(peekToken, ',')) {
        break
      }
      lexer.next()
    }

    return args
  }

  // FunctionCall ::= Identifier '(' ')' || Identifier '(' ArgumentList ')'
  function parseFunctionCall(name:string): TNode {
    let args = [] as TNode[]
    let token = lexer.next()

    if (!matchOp(token, '(')) {
      throw new SyntaxError('Expecting ( in a function call "' + name + '"')
    }

    let peekToken = lexer.peek()
    if (!matchOp(peekToken, ')')) {
      args = parseArgumentList()
    }

    token = lexer.next()
    if (!matchOp(token, ')')) {
      throw new SyntaxError('Expecting ) in a function call "' + name + '"')
    }

    return {
      FunctionCall: {name, args}
    }
  }

  // Primary ::= Identifier | Number | '(' Assignment ')' | FunctionCall
  function parsePrimary(): TNode {
    let peekToken = lexer.peek()

    if (peekToken === undefined) {
      throw new SyntaxError('Unexpected termination of expression')
    }

    if (peekToken.type === T.Identifier) {
      let token = lexer.next() as TToken
      if (matchOp(lexer.peek(), '(')) {
        return parseFunctionCall(token.value)
      } else {
        return {Identifier: token.value}
      }
    }

    if (peekToken.type === T.Number) {
      let token = lexer.next() as TToken
      return {Number: token.value}
    }

    if (matchOp(peekToken, '(')) {
      lexer.next()
      let expr = parseAssignment()
      let token = lexer.next() as TToken
      if (!matchOp(token, ')')) {
        throw new SyntaxError('Expecting )')
      }
      return {Expression: expr}
    }

    throw new SyntaxError('Parse error, can not process token ' + peekToken.value)
  }

  // Unary ::= Primary |
  //           '-' Unary
  function parseUnary(): TNode {
    let peekToken = lexer.peek()
    if (matchOp(peekToken, '-') || matchOp(peekToken, '+')) {
      let token = lexer.next() as TToken
      let expr = parseUnary()
      return {
        Unary: {
          operator: token.value,
          expression: expr
        }
      }
    }

    return parsePrimary()
  }

  // Multiplicative ::= Unary |
  //                    Multiplicative '*' Unary |
  //                    Multiplicative '/' Unary
  function parseMultiplicative(): TNode {
    let expr = parseUnary()
    let peekToken = lexer.peek()
    while (matchOp(peekToken, '*') || matchOp(peekToken, '/')) {
      let token = lexer.next() as TToken
      expr = {
        'Binary': {
          operator: token.value,
          left: expr,
          right: parseUnary()
        }
      }
      peekToken = lexer.peek()
    }
    return expr
  }

  // Additive ::= Multiplicative |
  //              Additive '+' Multiplicative |
  //              Additive '-' Multiplicative
  function parseAdditive(): TNode {
    let expr = parseMultiplicative()
    let peekToken = lexer.peek()
    while (matchOp(peekToken, '+') || matchOp(peekToken, '-')) {
      let token = lexer.next() as TToken
      expr = {
        'Binary': {
          operator: token.value,
          left: expr,
          right: parseMultiplicative()
        }
      }
      peekToken = lexer.peek()
    }
    return expr
  }

  // Assignment ::= Identifier '=' Assignment |
  //                Additive
  function parseAssignment(): TNode {
    let expr = parseAdditive()

    if (expr !== undefined && expr.Identifier) {
      let peekToken = lexer.peek()
      if (matchOp(peekToken, '=')) {
        lexer.next()
        return {
          Assignment: {
            name: { Identifier: expr.Identifier },
            value: parseAssignment()
          }
        }
      }
      return expr
    }

    return expr
  }

  // Expression ::= Assignment
  function parseExpression(): TNode {
    return parseAssignment()
  }

  function parse(expression:string): Required<Pick<TNode, 'Expression'>> {
    lexer.reset(expression)
    let expr = parseExpression()
    let token = lexer.next()

    if (typeof token !== 'undefined') {
      throw new SyntaxError('Unexpected token ' + token.value)
    }

    return {
      Expression: expr
    }
  }

  return {
    parse: parse
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

  let parser = Parser()
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

  let lexer = Lexer()
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

