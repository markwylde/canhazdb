import logslot from 'logslot';

import c from '../../constants.js';
import orderByFields from '../../utils/orderByFields.js';

const log = logslot('canhazdb.controllers.external.get');

async function getController (context, socketState, request, response) {
  const requestData = request.json();

  const results = await Promise.all(
    context.nodes
      .filter(node => node.connected)
      .map(node => {
        return node.client.send(c.GET, {
          [c.COLLECTION_ID]: requestData[c.COLLECTION_ID],
          [c.QUERY]: requestData[c.QUERY],
          [c.FIELDS]: requestData[c.FIELDS],
          [c.ORDER]: requestData[c.ORDER],
          [c.LIMIT]: requestData[c.LIMIT],
          [c.INTERNAL]: true
        }).catch(error => {
          log.warn(error);
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

  let documents = results
    .flatMap(result => result && result.json()[c.DATA])
    .filter(item => !!item)
    .map(item => {
      delete item._replicatedNodes;
      return item;
    });

  const orders = requestData[c.ORDER] || [];
  orders.forEach(order => {
    orderByFields(order, documents);
  });

  const limit = requestData[c.LIMIT];
  if (limit) {
    documents = documents.slice(0, limit);
  }

  response.reply(c.STATUS_OK, {
    [c.DATA]: documents
  });
}

export default getController;
