#!/usr/bin/env node
import process from 'process';
import fs from 'fs';
import path from 'path';
import os from 'os';

import logslot from 'logslot';
import chalk from 'chalk';
import minimist from 'minimist';

import canhazdb from './index.js';
import startRepl from './startRepl.js';

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

const argv = minimist(process.argv.slice(2));
const log = logslot('canhazdb.cli');

function showHelp () {
  console.log(`
The scalable, sharded, clustered database engine.
https://canhazdb.com

The following commands and arguments are available when starting Bitabase
Arguments:
  --host             optional     The host to bind the server on (default: localhost)
  --port             optional     The port to bind the server on (default: 7060)

  --join             optional     Join another canhazdb node
  --join-from-dns    optional     Lookup other canhazdb nodes to join from a dns lookup

  --tls-ca           optional     The certificate authority to use for the certs
  --tls-cert         optional     The public certificate for the server
  --tls-key          optional     The private key for the server

  --node-name        optional     Unique name for the node in the cluster (default: $HOSTNAME)
  --data-dir         optional     The port to bind the https query server on (default: ./canhazdata)

  --repl             optional     Start a repl, allowing you to script in the terminal

  `.trim() + '\n');
}

log.info(`${chalk.green(chalk.bold(`📦 ${packageJson.name}`))} ${chalk.green(`- v${packageJson.version}`)}`);

if (argv.join) {
  argv.join = Array.isArray(argv.join) ? argv.join : [argv.join];
}

process.on('SIGINT', () => {
  log.info('Interrupted');
  process.exit(0);
});

async function main () {
  if (argv.help) {
    showHelp();
    process.exit(1);
  }

  const nodeName = argv['node-name'] || process.env.CANHAZDB_NODE_NAME || os.hostname();
  const node = await canhazdb({
    dataDirectory: argv['data-dir'] || path.resolve(process.cwd(), './canhazdata', nodeName),
    nodeName: argv['node-name'],
    host: argv.host || 'localhost',
    port: argv.port || 7060,
    tlsCa: argv['tls-ca'],
    tlsCert: argv['tls-cert'],
    tlsKey: argv['tls-key'],
    join: argv.join,
    joinFromDns: argv['join-from-dns']
  }).catch(error => {
    log.error(error);
    process.exit(1);
  });

  log.info(`${chalk.cyan('internal server')}: ${node.options.host}:${node.options.port}`);

  if (argv.repl) {
    startRepl(node);
  }
}

main();
