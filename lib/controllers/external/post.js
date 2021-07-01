import c from '../../constants.js';
import { v4 as uuid } from 'uuid';
import selectRandomItemsFromArray from '../../utils/selectRandomItemsFromArray.js';

async function postController (context, socketState, request, response) {
  const nodes = selectRandomItemsFromArray(
    context.nodes,
    Math.min(context.settings.replicas, context.nodes.length)
  );

  const requestData = request.json();

  const document = {
    ...requestData[c.DATA],
    id: uuid()
  };

  await Promise.all(
    nodes.map(node => {
      return node.client.send(c.POST, {
        [c.COLLECTION_ID]: requestData[c.COLLECTION_ID],
        [c.REPLICATED_NODES]: nodes.map(node => node.name),
        [c.DATA]: document,
        [c.INTERNAL]: true
      });
    })
  );

  response.reply(c.STATUS_CREATED, {
    [c.DATA]: document
  });
}

export default postController;
