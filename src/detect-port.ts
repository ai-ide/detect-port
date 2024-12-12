import * as net from 'net';
import address from 'address';
import { debuglog } from 'util';

interface PortConfig {
  port?: number | string;
  hostname?: string;
  callback?: DetectPortCallback;
}

type DetectPortCallback = (err: Error | null, port: number) => void;

interface NodeError extends Error {
  code?: string;
}

const debug = debuglog('detect-port');

function tryListen(port: number, maxPort: number, hostname: string | null, callback: DetectPortCallback): void {
  function handleError(): void {
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
    listen(port, hostname, (err: NodeError | null, realPort) => {
      if (err) {
        if (err.code === 'EADDRNOTAVAIL') {
          return callback(new Error('the ip that is not unknown on the machine'), port);
        }
        return handleError();
      }
      callback(null, realPort);
    });
  } else {
    // 1. check null
    listen(port, null, (err: NodeError | null, realPort) => {
      // ignore random listening
      if (port === 0) {
        return callback(err, realPort);
      }

      if (err) {
        return handleError();
      }

      // 2. check 0.0.0.0
      listen(port, '0.0.0.0', (err: NodeError | null) => {
        if (err) {
          return handleError();
        }

        // 3. check localhost
        listen(port, 'localhost', (err: NodeError | null) => {
          if (err && err.code !== 'EADDRNOTAVAIL') {
            return handleError();
          }

          // 4. check current ip
          listen(port, address.ip(), (err: NodeError | null, realPort) => {
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

function listen(port: number, hostname: string | null, callback: DetectPortCallback): void {
  const server = new net.Server();

  server.on('error', (err: NodeError) => {
    debug('listen %s:%s error: %s', hostname, port, err);
    server.close();
    if (err.code === 'ENOTFOUND') {
      debug('ignore dns ENOTFOUND error, get free %s:%s', hostname, port);
      return callback(null, port);
    }
    return callback(err, port);
  });

  server.listen({ port, host: hostname || undefined }, () => {
    const address = server.address() as net.AddressInfo;
    port = address.port;
    server.close();
    debug('get free %s:%s', hostname, port);
    return callback(null, port);
  });
}

function detectPort(port: number | string | PortConfig, callback?: DetectPortCallback): Promise<number> | void {
  let hostname = '';

  if (typeof port === 'object' && port) {
    hostname = port.hostname || '';
    callback = port.callback;
    port = port.port || 0;
  } else {
    if (typeof port === 'function') {
      callback = port as DetectPortCallback;
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
    return tryListen(port, maxPort, hostname || null, callback);
  }

  // promise
  return new Promise(resolve => {
    tryListen(port, maxPort, hostname || null, (_, realPort) => {
      resolve(realPort);
    });
  });
}

export = detectPort;
