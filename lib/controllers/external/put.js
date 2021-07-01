import logslot from 'logslot';

import c from '../../constants.js';

const log = logslot('canhazdb.controllers.external.put');

async function putController (context, socketState, request, response) {
  const requestData = request.json();

  const results = await Promise.all(
    context.nodes
      .filter(node => node.connected)
      .map(node => {
        return node.client.send(c.PUT, {
          [c.COLLECTION_ID]: requestData[c.COLLECTION_ID],
          [c.QUERY]: requestData[c.QUERY],
          [c.DATA]: requestData[c.DATA],
          [c.INTERNAL]: true
        }).catch(error => {
          log.warn('node send failed', error);
        });
      })
  );

  const errors = results.filter(result => {
    return result && result.command !== c.STATUS_OK;
  });

  if (errors.length > 0) {
    response.reply(errors[0].command, errors[0].data);
    return;
  }

  response.reply(c.STATUS_OK,
    results
      .filter(result => !!result)
      .map(result => result.json())
      .reduce((a, b) => a + b)
  );
}

export default putController;
