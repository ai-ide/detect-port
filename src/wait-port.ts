import { debuglog } from 'util';
import detectPort from './detect-port';

interface WaitPortOptions {
  retryInterval?: number;
  retries?: number;
}

const debug = debuglog('wait-port');

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

async function waitPort(port: number, options: WaitPortOptions = {}): Promise<boolean> {
  const { retryInterval = 1000, retries = Infinity } = options;
  let count = 1;

  async function loop(): Promise<boolean> {
    debug('retries', retries, 'count', count);
    if (count > retries) {
      return false;
    }
    count++;
    const freePort = await detectPort(port);
    if (freePort === port) {
      await sleep(retryInterval);
      return loop();
    }
    return true;
  }

  return await loop();
}

export = waitPort;
