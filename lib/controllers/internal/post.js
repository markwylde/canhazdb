import c from '../../constants.js';
import isLockedOrWait from '../../utils/isLockedOrWait.js';

async function postController (context, socketState, request, response) {
  const requestData = request.json();

  const data = requestData[c.DATA];
  const collectionId = requestData[c.COLLECTION_ID];
  const replicatedNodes = requestData[c.REPLICATED_NODES];
  const lockId = requestData[c.LOCK_ID];
  const waitForUnlock = requestData[c.LOCK_STRATEGY] !== c.LOCK_STRATEGY_FAIL;

  if (await isLockedOrWait(context.locks, [collectionId], lockId, waitForUnlock)) {
    throw Object.assign(new Error('lock prevented change'), { status: 409 });
  }

  data._replicatedNodes = replicatedNodes.sort();
  const document = await context.driver.post(collectionId, data);

  // context.updateCollectionMetadata(collectionId, { documentCountAdd: 1 });

  // context.notify(`POST:/${collectionId}/${document.id}`, collectionId, document.id, request);

  response.reply(c.STATUS_CREATED, {
    [c.DATA]: document
  });
}

export default postController;
