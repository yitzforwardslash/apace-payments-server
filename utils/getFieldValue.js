const moment = require('moment');

module.exports.getFieldValue = (obj, field) => {
  let value = '';
  switch (typeof obj[field]) {
    case 'boolean':
      value = obj[field] ? 'yes' : 'no';
      break;
    case 'object':
      if (Array.isArray(obj[field])) {
        value = obj[field].join(',');
      } else if (obj[field] instanceof Date) {
        value = moment(obj[field]).format('MM/DD/YYYY hh:mm A');
      } else {
        value = obj[field] || '';
      }
      break;
    default:
      value = obj[field] || '';
  }
  if (value.replace) {
    value = value.replace(/\,/g, '');
  }
  return value;
};
