import logslot from 'logslot';
import tcpocket from 'tcpocket';
import lockbase from 'lockbase';

import prepareOptions from './prepareOptions.js';
import createHandler from './createHandler.js';
import waitUntil from './utils/waitUntil.js';

import c from './constants.js';

const log = logslot('canhazdb.server');

async function persistNode (context, node) {
  const existingRecords = await context.driver.get('system.nodes', {
    name: node.name
  });

  if (existingRecords.length === 0) {
    await context.driver.post('system.nodes', {
      name: node.name,
      host: node.host,
      port: node.port
    });
  }

  node.persisted = true;
}

function join (context, host, port) {
  port = parseInt(port);

  const servername = context.options.joinFromDns;

  const existingNode = context.nodes.find(node => node.host === host && node.port === port);
  if (existingNode) {
    return;
  }

  log.info('joining node', { host, port });

  const node = {
    connected: false,
    host,
    port,
    client: tcpocket.createClient({
      host,
      port,
      servername,
      ...context.options.tls
    })
  };

  function handleError (error) {
    node.connected = false;

    if (node.closing || context.closed) {
      return;
    }

    log.warn('node closed without cause, will reconnect');
    log.debug('node closed', error);
    join(context, host, port);
  }

  // node.client.on('message', data => {
  //   logslot('canhazdb.comms').debug('node message received', { data });
  // });

  node.client.on('connect', () => {
    node.connected = true;
  });

  node.client.on('close', () => {
    handleError(Object.assign(new Error('client closed'), { code: 'CLOSED' }));
  });

  node.client.on('error', handleError);

  context.nodes = context.nodes.filter(i => {
    return !(i.host === host && i.port === port);
  });

  node.close = () => {
    node.closing = true;
    return node.client.close();
  };

  context.nodes.push(node);
  context.nodes.sort();
}

async function canhazdb (rawOptions) {
  const options = await prepareOptions(rawOptions);
  log.debug('parsed options', options);

  const context = {
    closed: false,
    clients: [],
    settings: {
      replicas: 3
    },
    nodes: [],
    join,
    options
  };

  context.driver = await (await import('./driver/index.js')).default(context);

  context.locks = lockbase();

  const tcpServer = createHandler(context);
  tcpServer.open();

  context.options.join.forEach(item => {
    const [host, port] = item.split(':');
    join(context, host, port);
  });

  const persistedNodes = await context.driver.get('system.nodes');
  persistedNodes.forEach(node => {
    join(context, node.host, node.port);
  });

  async function syncNodesInfo () {
    if (context.closed) {
      return;
    }

    await Promise.all(
      context.nodes.map(async node => {
        const result = await node.client.send(c.INFO, {
          [c.DATA]: {
            nodes: context.nodes.map(node => ({
              host: node.host,
              port: node.port
            }))
          },
          [c.INTERNAL]: true
        }).catch(error => {
          log.warn('syncNodesInfo: client disconnected', { error: error.code });
          return null;
        });

        if (!result || result.command !== c.STATUS_OK) {
          return;
        }

        const resultData = result.json();

        node.info = resultData;
        node.name = resultData[c.DATA].nodeName;

        persistNode(context, node);
      })
    );

    context.syncNodesInfoTimer = setTimeout(syncNodesInfo, 250);
  }
  syncNodesInfo();

  await waitUntil(() => {
    const nodesWithName = context.nodes.filter(node => node.persisted);
    return context.nodes.length === nodesWithName.length;
  });

  context.close = async function () {
    context.closed = true;

    // scope.locks.cancel();
    clearTimeout(context.syncNodesInfoTimer);

    await Promise.all(context.nodes.map(node => {
      return node.close();
    }));

    await context.driver.close();
    await new Promise(resolve => tcpServer.close(resolve));
  };

  context.clientConfig = {
    host: context.options.host,
    port: context.options.port,
    ...context.options.tls
  };

  context.thisNode = context.nodes.find(node => node.name === context.options.nodeName);

  return context;
}

export default canhazdb;
