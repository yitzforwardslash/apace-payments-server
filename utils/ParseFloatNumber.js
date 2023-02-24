module.exports = (amount) =>
  Math.floor((Number.parseFloat(amount) + Number.EPSILON) * 100) / 100;
