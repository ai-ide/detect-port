'use strict';

const debug = require('util').debuglog('wait-port');
const detect = require('./detect-port');

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface WaitPortOptions {
  retryInterval?: number;
  retries?: number;
}

async function waitPort(port: number, options: WaitPortOptions = {}): Promise<boolean> {
  const { retryInterval = 1000, retries = Infinity } = options;
  let count = 1;

  async function loop(): Promise<boolean> {
    debug('retries', retries, 'count', count);
    if (count > retries) {
      const err = new Error('retries exceeded');
      err.retries = retries;
      err.count = count;
      throw err;
    }
    count++;
    const freePort = await detect(port);
    if (freePort === port) {
      await sleep(retryInterval);
      return loop();
    }
    return true;
  }

  return await loop();
}

module.exports = waitPort;
