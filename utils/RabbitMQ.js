const amqplib = require('amqplib');
const RetryConnection = require('./RetryConnection');

module.exports = RetryConnection(
  () => amqplib.connect(process.env.RMQURL),
  'RabbitMQ',
  10
);
