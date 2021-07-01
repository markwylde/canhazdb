import c from '../../constants.js';

async function infoController (context, socketState, request, response) {
  response.reply(c.STATUS_OK, {
    [c.DATA]: {
      nodeName: context.options.nodeName,
      nodes: context.nodes.map(node => ({
        host: node.host,
        port: node.port
      }))
    }
  });

  const requestData = request.data.json();
  if (requestData[c.DATA] && request.data[c.DATA].nodes) {
    requestData[c.DATA].nodes.forEach(node => {
      context.join(context, node.host, node.port);
    });
  }
}

export default infoController;
