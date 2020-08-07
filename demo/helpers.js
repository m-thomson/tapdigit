/*
  Copyright (C) 2011 Ariya Hidayat <ariya.hidayat@gmail.com>
  Copyright (C) 2010 Ariya Hidayat <ariya.hidayat@gmail.com>

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

import {TapDigit} from "../tapDigit.js";

let lexerTableId, parserTreeId, evalId, evaluator;

export function updateLexerTable() {
  if (lexerTableId) {
    window.clearTimeout(lexerTableId);
  }

  lexerTableId = window.setTimeout(function () {
    let lexer, token;
    let code = document.getElementById('code').value;
    try {
      if (typeof lexer === 'undefined') {
        lexer = TapDigit.Lexer();
      }
      let tokens = [];
      lexer.reset(code);
      while (true) {
        token = lexer.next();
        if (typeof token === 'undefined') break;
        tokens.push(token);
      }
      let str = '<table style="width:200px">\n';
      for (let i = 0; i < tokens.length; i += 1) {
        token = tokens[i];
        str += `<tr><td>${token.type}</td>`
        str += `<td style="text-align: center">${token.value}</td></tr>`;
      }
      document.getElementById('tokens').innerHTML = str;
    } catch (e) {
      document.getElementById('tokens').innerText = 'error';
    }
    lexerTableId = undefined;
  }, 345);
}

export function updateParserTree() {
  if (parserTreeId) {
    window.clearTimeout(parserTreeId);
  }

  parserTreeId = window.setTimeout(function () {
    let parser, syntax;
    let code = document.getElementById('code').value;
    try {
      if (typeof parser === 'undefined') {
        parser = TapDigit.Parser();
      }
      syntax = parser.parse(code);

      function stringify(object, key, depth) {
        let indent = '',
          str = '',
          value = object[key];

        while (indent.length < depth * 2) {
          indent += ' ';
        }

        switch (typeof value) {
          case 'string':
            str = value;
            break;
          case 'number':
          case 'boolean':
          case 'null':
            str = String(value);
            break;
          case 'object':
            for (let i in value) {
              if (value.hasOwnProperty(i)) {
                str += ('<br>' + stringify(value, i, depth + 1));
              }
            }
            break;
        }
        return indent + ' ' + key + ': ' + str;
      }

      document.getElementById('syntax').innerHTML = stringify(syntax, 'Expression', 0);
    } catch (e) {
      document.getElementById('syntax').innerText = e.message;
    }
    parserTreeId = undefined;
  }, 345);
}


export function updateEvalResult() {
  if (evalId) {
    window.clearTimeout(evalId);
  }

  evalId = window.setTimeout(function () {
    let el = document.getElementById('result')
    let expr = document.getElementById('code').value;
    try {
      if (typeof evaluator === 'undefined') {
        evaluator = TapDigit.Evaluator();
      }
      el.textContent = evaluator.evaluate(expr).toString();
    } catch (e) {
      el.textContent = 'Error: ' + e.toString();
    }
    evalId = undefined;
  }, 345);
}
