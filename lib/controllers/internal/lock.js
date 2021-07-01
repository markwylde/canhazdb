import c from '../../constants.js';

async function lockController (context, socketState, request, response) {
  const requestData = request.json();

  const keys = requestData[c.LOCK_KEYS];
  const id = requestData[c.LOCK_ID];

  await context.locks.add(keys, id);

  response.reply(c.STATUS_OK, {
    [c.LOCK_ID]: id
  });
}

export default lockController;
