import logslot from 'logslot';
import tcpocket from 'tcpocket';

import controllers from './controllers/index.js';
import c from './constants.js';

const log = logslot('canhazdb.createHandler');

function createHandler (context) {
  const { port, tls } = context.options;

  const tcpServer = tcpocket.createServer({ port, ...tls }, async function (request, response) {
    // const remoteString = request.socket.remoteAddress + ':' + request.socket.remotePort;
    // logslot('canhazdb.comms').debug('received request ' + remoteString, {
    //   data: request.data
    // });

    const socketState = {
      send: response.send,
      notifiers: []
    };

    const requestData = request.data ? request.json() : {};

    const origin = requestData[c.INTERNAL] ? 'internal' : 'external';
    const controller = await controllers[origin][request.command];

    if (!controller) {
      response.reply(c.STATUS_NOT_FOUND);
      return;
    }

    return controller(context, socketState, request, response);
  });

  tcpServer.on('connection', (socket) => {
    socket.on('error', error => {
      log.warn('a client disconnected from the server', { code: error.code });
    });
  });

  return tcpServer;
}

export default createHandler;
