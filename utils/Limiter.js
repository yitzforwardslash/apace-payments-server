class RequestLimiter {
  /**
   * @param {Number} maxTrials
   * @param {Number} blockInterval in seconds
   * @param {Number} clearInterval in seconds
   */
  constructor(maxTrials, blockInterval = 5 * 60, clearInterval = 5 * 60) {
    this.trials = {};
    this.blockInterval = blockInterval * 1000;
    this.maxTrials = maxTrials;
    if (process.env.NODE_ENV !== 'testing') {
      setInterval(() => this.clearOldTrials(), clearInterval * 1000);
    }
  }

  /**
   * @param {String} uniqueIdentifier
   * @returns {Boolean}
   */
  canRetry(uniqueIdentifier) {
    if (
      !this.trials[uniqueIdentifier] ||
      this.trials[uniqueIdentifier].currentTrials < this.maxTrials
    ) {
      return true;
    }
    if (
      Date.now() - this.trials[uniqueIdentifier].lastTrial >=
      this.blockInterval
    ) {
      delete this.trials[uniqueIdentifier];
      return true;
    }
    return false;
  }

  /**
   * @param {String} uniqueIdentifier
   */
  addTrial(uniqueIdentifier) {
    if (!this.trials[uniqueIdentifier]) {
      this.trials[uniqueIdentifier] = {
        currentTrials: 1,
        lastTrial: Date.now(),
      };
    } else {
      const previousTrial = this.trials[uniqueIdentifier];
      this.trials[uniqueIdentifier] = {
        currentTrials: previousTrial.currentTrials + 1,
        lastTrial: Date.now(),
      };
    }
  }

  clearOldTrials() {
    Object.entries(this.trials)
      .filter(([_, trial]) => {
        return Date.now() - trial.lastTrial >= this.blockInterval;
      })
      .forEach(([ipAddress]) => delete this.trials[ipAddress]);
  }
}

module.exports = RequestLimiter;
