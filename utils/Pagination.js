/**
 * @param {Number} totalCount
 * @param {Number} pageLength
 * @returns {Number} pages
 */
module.exports.calculateTotalPages = (totalCount, pageLength) => {
  if (totalCount % pageLength === 0) {
    return totalCount / pageLength;
  }
  return Math.trunc(totalCount / pageLength + 1);
};

/**
 * @param {Array} itemsArray
 * @returns {Number}
 */
module.exports.calculatenNextCursor = (itemsArray, field = 'id') =>
  itemsArray.length ? itemsArray[itemsArray.length - 1][field] : null;
