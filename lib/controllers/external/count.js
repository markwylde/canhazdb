import logslot from 'logslot';

import c from '../../constants.js';

const log = logslot('canhazdb.controllers.external.count');

async function countController (context, socketState, request, response) {
  const requestData = request.json();

  const results = await Promise.all(
    context.nodes
      .filter(node => node.connected)
      .map(node => {
        return node.client.send(c.COUNT, {
          [c.COLLECTION_ID]: requestData[c.COLLECTION_ID],
          [c.ORDER]: requestData[c.ORDER],
          [c.LIMIT]: requestData[c.LIMIT],
          [c.INTERNAL]: true
        }, false)
          .then(result => {
            return result.json()[c.DATA];
          })
          .catch(error => {
            log.warn('node send failed', error);
          });
      })
  );

  response.reply(c.STATUS_OK, {
    [c.DATA]: results.reduce((a, b) => a + b)
  });
}

export default countController;
