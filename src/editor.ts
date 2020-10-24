import {Lexer} from "./tapDigit"

// noinspection JSUnusedGlobalSymbols
export function Editor(element: HTMLElement) {

  let lexer = new Lexer()
  let cursor: HTMLElement
  let blinkTimer: number | undefined
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
    let start: number
    let end: number
    let x: number
    let y: number
    let cls: string | null

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
        while (text.length < token.start!) {
          text += ' '
          html += '<span class="blank"> </span>'
        }
        let str = expr.substring(token.start!, token.end! + 1)
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
    let cls: string | null
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

  function setHandler(el: Document | HTMLElement, eventName: string, handler: { (...args: any[]): any }): void {
    el.addEventListener(eventName, handler, false)
  }

  function resetHandler(el: Document | HTMLElement, eventName: string, handler: { (...args: any[]): any }): void {
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
    let anchor = 0
    let i
    let x = event.clientX
    let y = event.clientY
    deselect()

    for (i = 0; i < editor.childNodes.length; i += 1) {
      let el = editor.childNodes[i] as HTMLElement
      let x1 = el.offsetLeft
      let x2 = x1 + el.offsetWidth
      let y1 = el.offsetTop
      let y2 = y1 + el.offsetHeight
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
          let el = editor.childNodes[i]
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

  function setupDOM(element: HTMLElement): void {
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
