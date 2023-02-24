module.exports = (phone) => {
  let formatted = phone.replace(/\(|\)|\)|\s|\-/g, '');
  if (formatted.startsWith('1')) {
    formatted = `+${formatted}`;
  }
  if (!formatted.startsWith('+1')) {
    formatted = `+1${formatted}`;
  }
  return formatted;
};
