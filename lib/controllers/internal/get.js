import c from '../../constants.js';

// Logic: Only return the document if we are
// the first replica that's available
function isFirstConnectedReplica (connectedNodes, nodeName) {
  return document => {
    const availableReplicatedNodes = document._replicatedNodes.filter(nodeName => {
      return !!connectedNodes.find(cnode => cnode.name === nodeName);
    });

    if (availableReplicatedNodes[0] === nodeName) {
      return true;
    }

    return false;
  };
}

async function internalGetController (context, socketState, request, response) {
  const requestData = request.json();

  const collectionId = requestData[c.COLLECTION_ID];
  const query = requestData[c.QUERY];
  const fields = requestData[c.FIELDS];
  const order = requestData[c.ORDER];
  const limit = requestData[c.LIMIT];

  if (fields) {
    fields.push('_replicatedNodes');
  }

  try {
    const documents = await context.driver.get(collectionId, query, fields, order, limit);

    const connectedNodes = context.nodes.filter(node => node.connected);

    const filteredDocuments = documents.filter(
      isFirstConnectedReplica(connectedNodes, context.thisNode.name)
    );

    response.reply(c.STATUS_OK, {
      [c.DATA]: filteredDocuments
    });
  } catch (error) {
    response.reply(c.STATUS_BAD_REQUEST, {
      [c.ERROR]: error.message
    });
  }
}

export default internalGetController;
