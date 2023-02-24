const info = (...params) => {
  if (process.env.NODE_ENV !== 'testing') {
    console.log(...params)
  }
}

const error = (...params) => {
  if (process.env.NODE_ENV !== 'testing') {
    console.error(`At ${new Date().toLocaleDateString()}`)
    console.error(...params)
  }
}

const warn = (...params) => {
  if (process.env.NODE_ENV !== 'testing') {
    console.warn(...params)
  }
}

module.exports = {
  info,
  error,
  warn,
}
