const {PrismaClient} = require('@prisma/client');
const logger = require('../utils/Logger');
const RetryConnection = require('../utils/RetryConnection');

let config = {};

if (process.env.NODE_ENV === 'testing') {
  config.datasources = {db: {url: process.env.TESTING_DATABASE_URL}};
}

const prisma = new PrismaClient(config);
RetryConnection(() => prisma.$connect(), 'Database', 5)
module.exports = prisma
