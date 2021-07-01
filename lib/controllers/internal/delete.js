import c from '../../constants.js';
import isLockedOrWait from '../../utils/isLockedOrWait.js';

async function deleteController (context, socketState, request, response) {
  const requestData = request.json();

  const query = requestData[c.QUERY];
  const collectionId = requestData[c.COLLECTION_ID];
  const lockId = requestData[c.LOCK_ID];
  const waitForUnlock = requestData[c.LOCK_STRATEGY] !== c.LOCK_STRATEGY_FAIL;

  try {
    if (await isLockedOrWait(context.locks, [collectionId], lockId, waitForUnlock)) {
      throw Object.assign(new Error('lock prevented change'), { status: 409 });
    }

    const count = await context.driver.count(collectionId, {
      $and: [{
        '_replicatedNodes.0': context.thisNode.name
      }, query]
    });

    await context.driver.del(collectionId, query);

    // context.updateCollectionMetadata(collectionId, { documentCountAdd: 1 });

    // context.notify(`POST:/${collectionId}/${document.id}`, collectionId, document.id, request);

    response.reply(c.STATUS_OK, {
      [c.DATA]: count
    });
  } catch (error) {
    response.reply(c.STATUS_BAD_REQUEST, {
      [c.ERROR]: error.message
    });
  }
}

export default deleteController;
