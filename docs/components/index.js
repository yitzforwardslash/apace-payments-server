const schemas = require('./schemas');

module.exports = {
  schemas,
  securitySchemes: {
    ApaceSecret: {
      type: 'apiKey',
      in: 'header',
      name: 'apace-secret',
    },
    ApacePublicId: {
        type: 'apiKey',
        in: 'header',
        name: 'apace-public-id'
    }
  },
};
