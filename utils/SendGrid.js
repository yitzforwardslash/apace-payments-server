const sendGrid = require('@sendgrid/mail');
sendGrid.setApiKey(process.env.SENDGRID_KEY);

module.exports = sendGrid;
