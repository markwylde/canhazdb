import fs from 'fs';
import { v4 as uuid } from 'uuid';
import canhazdb from '../../lib/index.js';

try {
  fs.rmSync('./canhazdata', { recursive: true });
} catch (error) {}
fs.mkdirSync('./canhazdata');

const tls = {
  key: fs.readFileSync('./certs/localhost.privkey.pem'),
  cert: fs.readFileSync('./certs/localhost.cert.pem'),
  ca: [fs.readFileSync('./certs/ca.cert.pem')],
  requestCert: true
};

let lastUsedPort = 11000;
const getNewPort = () => {
  lastUsedPort = lastUsedPort + 1;
  return lastUsedPort;
};

async function createTestServers (count) {
  const join = [];

  const servers = await Promise.all(
    Array(count)
      .fill(null)
      .map(async (_, index) => {
        const port = getNewPort();
        const nodeName = uuid();

        const server = canhazdb({
          dataDirectory: './canhazdata/' + nodeName,
          nodeName: nodeName,
          host: 'localhost',
          port: port,
          join,
          tls
        });

        join.push('localhost:' + port);

        return server;
      })
  );

  servers.close = function () {
    return Promise.all(servers.map(server => server.close()));
  };

  return servers;
}

export default createTestServers;
