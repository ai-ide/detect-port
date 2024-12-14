'use strict';

import mm from 'mm';
import net from 'net';
import { waitPort } from '../index';

describe('test/wait-port.test.ts', () => {
  describe('wait for port', () => {
    const servers: net.Server[] = [];
    after(() => {
      servers.forEach(server => server.close());
    });

    afterEach(mm.restore);

    it('should be work', done => {
      const port = 9090;
      const server = new net.Server();
      server.listen(port, '0.0.0.0');
      servers.push(server);
      setTimeout(() => {
        waitPort(port).then().finally(done);
      });
    });

    it('should be work when retries exceeded', done => {
      const port = 9093;
      waitPort(port, {
        retries: 3,
        retryInterval: 100,
      }).then().finally(done);
    });
  });
});
