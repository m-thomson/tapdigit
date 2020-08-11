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

import {Evaluator, Parser, Lexer} from "../tapDigit.js"

let lexerTableId: number|undefined
let parserTreeId: number|undefined
let evalId: number|undefined
let evaluator = Evaluator()
let parser = Parser()
let lexer = new Lexer()

// noinspection JSUnusedGlobalSymbols
export function updateLexerTable(): void {
  if (lexerTableId) {
    window.clearTimeout(lexerTableId)
  }
  lexerTableId = window.setTimeout(function () {
    let expr = (document.getElementById('code') as HTMLInputElement).value
    let tokenTableEl = document.getElementById('tokens') as HTMLElement
    try {
      let tokens = []
      lexer.reset(expr)
      while (true) {
        let token = lexer.next()
        if (typeof token === 'undefined') break
        tokens.push(token)
      }
      let str = '<table style="width:200px">\n'
      for (let i = 0; i < tokens.length; i += 1) {
        let token = tokens[i]
        str += `<tr><td>${token.type}</td>`
        str += `<td style="text-align: center">${token.value}</td></tr>`
      }
      tokenTableEl.innerHTML = str
    } catch (e) {
      tokenTableEl.innerText = 'error'
    }
    lexerTableId = undefined
  }, 345)
}

// noinspection JSUnusedGlobalSymbols
export function updateParserTree(): void {
  if (parserTreeId) {
    window.clearTimeout(parserTreeId)
  }
  parserTreeId = window.setTimeout(function () {
    let expr = (document.getElementById('code') as HTMLInputElement).value
    let syntaxPreEl = document.getElementById('syntax') as HTMLElement
    try {
      function stringify(object: {[x:string]:any}, key: string, depth: number) {
        let indent = '', str = '', value = object[key]

        while (indent.length < depth * 2) {
          indent += ' '
        }

        let _typeof: string = (value === null) ? 'null' : typeof value
        switch (_typeof) {
          case 'string':
            str = value
            break
          case 'number':
          case 'boolean':
          case 'null':
            str = String(value)
            break
          case 'object':
            for (let i in value) {
              if (value.hasOwnProperty(i)) {
                str += ('<br>' + stringify(value, i, depth + 1))
              }
            }
            break
        }
        return `${indent} ${key}: ${str}`
      }

      let syntax = parser.parse(expr)
      syntaxPreEl.innerHTML = stringify(syntax, 'Expression', 0)
    } catch (e) {
      syntaxPreEl.innerText = e.message
    }
    parserTreeId = undefined
  }, 345)
}


// noinspection JSUnusedGlobalSymbols
export function updateEvalResult(): void {
  if (evalId) {
    window.clearTimeout(evalId)
  }
  evalId = window.setTimeout(function () {
    let expr = (document.getElementById('code') as HTMLInputElement).value
    let el = document.getElementById('result') as HTMLElement
    try {
      el.textContent = evaluator.evaluate(expr).toString()
    } catch (e) {
      el.textContent = 'Error: ' + e.toString()
    }
    evalId = undefined
  }, 345)
}
