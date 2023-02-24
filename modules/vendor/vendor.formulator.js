const moment = require('moment');
/**
 * @param {Array<Object>} data
 * @param {Array<String>} neglectedKeys
 * @returns {Object}
 */
module.exports.sumAllElements = (data) => {
  if (!data.length) {
    return {};
  }
  const summedObject = {};
  const elementKeys = Object.keys(data[0]).filter(
    (key) => data[0].hasOwnProperty(key) && typeof data[0][key] === 'number'
  );
  for (const element of data) {
    for (const key of elementKeys) {
      const summedKeyName = prependTotalWord(key);
      if (!summedObject[summedKeyName]) {
        summedObject[summedKeyName] = element[key];
      } else {
        summedObject[summedKeyName] += element[key];
      }
    }
  }
  return summedObject;
};

module.exports.fillTimeSeries = ({ data, startDate, endDate, timeUnit }) => {
  if (!data.length) {
    return {};
  }
  const sortedAndFilledData = [];
  const zeroObject = {};
  Object.keys(data[0]).forEach((key) => (zeroObject[key] = 0));
  // allowed groupings: year, month, day, hour
  const dateSeries = generateDateSeries(startDate, endDate, timeUnit);
  for (const date of dateSeries) {
    const dataElement = data.find((dataElement) =>
      moment(dataElement.date).isSame(date, timeUnit)
    );
    if (!dataElement) {
      sortedAndFilledData.push({ ...zeroObject, date });
    } else {
      sortedAndFilledData.push(dataElement);
    }
  }

  return sortedAndFilledData;
};

const generateDateSeries = (startDate, endDate, timeUnit) => {
  const dateSeries = [];
  const dateIterator = moment(new Date(startDate));
  while (!dateIterator.isSame(endDate, timeUnit)) {
    dateSeries.push(dateIterator.toISOString());
    dateIterator.add(1, timeUnit);
  }
  dateSeries.push(dateIterator.toISOString());
  return dateSeries;
};

/**
 * @param {String} word
 * @returns {String}
 */
const upperCaseFirstLetter = (word) =>
  word.replace(word[0], word[0].toUpperCase());

const prependTotalWord = (word) => `total`.concat(upperCaseFirstLetter(word));
