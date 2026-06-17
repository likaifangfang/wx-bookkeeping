// store/index.js
// 极简全局状态管理：状态 + 订阅

const state = {
  user: null,
  currentLedger: null,
  ledgers: [],
  categories: { expense: [], income: [] },
  _categoriesLedgerId: null,
  initError: null
}

const listeners = {}

function subscribe(key, fn) {
  if (!listeners[key]) listeners[key] = []
  listeners[key].push(fn)
  return () => unsubscribe(key, fn)
}

function unsubscribe(key, fn) {
  if (!listeners[key]) return
  listeners[key] = listeners[key].filter(f => f !== fn)
}

function emit(key, value) {
  if (!listeners[key]) return
  listeners[key].forEach(fn => {
    try { fn(value) } catch (e) { console.error('[store] listener 错误', e) }
  })
}

function setState(key, value) {
  state[key] = value
  emit(key, value)
}

function getState(key) {
  return key ? state[key] : state
}

module.exports = {
  state,
  subscribe,
  unsubscribe,
  setState,
  getState
}
