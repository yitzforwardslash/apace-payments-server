const basicInfo = require('./basicInfo');
const components = require('./components');
const requests = require('./requests');
const servers = require('./servers');
const tags = require('./tags');

module.exports = {
  servers,
  tags,
  components,
  security: [
    {
      ApiKeyAuth: [],
    },
  ],
  ...basicInfo,
  ...requests,
};
