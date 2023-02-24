const logger = require('./Logger');
const afterNSeconds = (n) =>
  new Promise((resolve, reject) => {
    setTimeout(resolve, n * 1000);
  });

module.exports = (connectionPromise, connectionName, maxTrials) =>
  new Promise(async (resolve, reject) => {
    for (let trials = 0; trials <= maxTrials; trials++) {
      try {
        if (trials > 0) {
          logger.warn(
            `Failed to connect to ${connectionName}, trying to connect again in ${trials} seconds.`
          );
          await afterNSeconds(trials);
        }
        const connection = await connectionPromise();
        logger.info(
          `Connected to ${connectionName} successfully after ${
            trials + 1
          } trials.`
        );
        return resolve(connection);
      } catch {}
    }
    reject(`Can not connect to ${connectionName} after ${maxTrials} trials.`);
  });
