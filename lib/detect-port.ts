'use strict';

import net from 'net';
import address from 'address';
import { debuglog } from 'util';

const debug = debuglog('detect-port');

interface DetectPortOptions {
  port: number;
  hostname?: string;
  callback?: (err: Error | null, port: number) => void;
}

/**
 * Detects an available port starting from the specified port number
 * @param {number|object|function} port - Port number to start detecting from, or options object with port and hostname, or callback
 * @param {function} [callback] - Optional callback function (port, callback)
 * @returns {Promise<number>|void} Returns a promise that resolves to the available port if no callback is provided
 */
export default function detectPort(port: number | DetectPortOptions | ((err: Error | null, port: number) => void), callback?: (err: Error | null, port: number) => void): Promise<number> | void {
  let hostname = '';

  if (typeof port === 'object' && port) {
    hostname = port.hostname || '';
    callback = port.callback;
    port = port.port;
  } else {
    if (typeof port === 'function') {
      callback = port;
      port = 0;
    }
  }

  port = parseInt(port as string) || 0;
  let maxPort = port + 10;
  if (maxPort > 65535) {
    maxPort = 65535;
  }
  debug('detect free port between [%s, %s)', port, maxPort);
  if (typeof callback === 'function') {
    return tryListen(port, maxPort, hostname, callback);
  }
  // promise
  return new Promise(resolve => {
    tryListen(port, maxPort, hostname, (_, realPort) => {
      resolve(realPort);
    });
  });
}

function tryListen(port: number, maxPort: number, hostname: string, callback: (err: Error | null, port: number) => void): void {
  function handleError() {
    port++;
    if (port >= maxPort) {
      debug('port: %s >= maxPort: %s, give up and use random port', port, maxPort);
      port = 0;
      maxPort = 0;
    }
    tryListen(port, maxPort, hostname, callback);
  }

  // use user hostname
  if (hostname) {
    listen(port, hostname, (err, realPort) => {
      if (err) {
        if (err.code === 'EADDRNOTAVAIL') {
          return callback(new Error('the ip that is not unknown on the machine'), 0);
        }
        return handleError();
      }

      callback(null, realPort);
    });
  } else {
    // 1. check null
    listen(port, '', (err, realPort) => {
      // ignore random listening
      if (port === 0) {
        return callback(err, realPort);
      }

      if (err) {
        return handleError();
      }

      // 2. check 0.0.0.0
      listen(port, '0.0.0.0', err => {
        if (err) {
          return handleError();
        }

        // 3. check localhost
        listen(port, 'localhost', err => {
          // if localhost refer to the ip that is not unkonwn on the machine, you will see the error EADDRNOTAVAIL
          // https://stackoverflow.com/questions/10809740/listen-eaddrnotavail-error-in-node-js
          if (err && err.code !== 'EADDRNOTAVAIL') {
            return handleError();
          }

          // 4. check current ip
          listen(port, address.ip(), (err, realPort) => {
            if (err) {
              return handleError();
            }

            callback(null, realPort);
          });
        });
      });
    });
  }
}

function listen(port: number, hostname: string, callback: (err: Error | null, port: number) => void): void {
  const server = new net.Server();

  server.on('error', err => {
    debug('listen %s:%s error: %s', hostname, port, err);
    server.close();
    if (err.code === 'ENOTFOUND') {
      debug('ignore dns ENOTFOUND error, get free %s:%s', hostname, port);
      return callback(null, port);
    }
    return callback(err, 0);
  });

  server.listen(port, hostname, () => {
    port = (server.address() as net.AddressInfo).port;
    server.close();
    debug('get free %s:%s', hostname, port);
    return callback(null, port);
  });
}