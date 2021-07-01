import dns from 'dns';
import os from 'os';
import fs from 'fs';
import path from 'path';

import logslot from 'logslot';
const log = logslot('canhazdb.prepareOptions');

async function prepareOptions (rawOptions) {
  const options = {
    ...rawOptions,
    port: rawOptions.port || 8060,
    join: rawOptions.join || []
  };

  options.nodeName = rawOptions.nodeName || process.env.CANHAZDB_NODE_NAME || os.hostname();
  options.port = parseInt(options.port);

  if (rawOptions.joinFromDns) {
    const dnsLookupResults = await dns.promises.lookup(rawOptions.joinFromDns, { all: true });
    log.info('joining from dns:', { dnsLookupResults });
    options.join = dnsLookupResults.map(item => `${item.address}:${options.port}`);
  } else {
    options.join.push(`${rawOptions.host}:${options.port}`);
  }

  if (rawOptions.tlsCa || rawOptions.tlsCert || rawOptions.tlsKey) {
    if (!rawOptions.tlsCa || !rawOptions.tlsCert || !rawOptions.tlsKey) {
      throw new Error('You must specifiy either all [tls-key, tls-cert, tls-ca] or none of them');
    }

    options.tls = {
      key: fs.readFileSync(rawOptions.tlsKey),
      cert: fs.readFileSync(rawOptions.tlsCert),
      ca: [fs.readFileSync(rawOptions.tlsCa)],
      requestCert: true
    };
  }

  options.dataDirectory = rawOptions.dataDirectory ||
    path.resolve(process.cwd(), './canhazdata', options.nodeName);

  return options;
}

export default prepareOptions;
