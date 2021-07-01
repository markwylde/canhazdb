import logslot from 'logslot';
import { v4 as uuid } from 'uuid';

import c from '../../constants.js';

const log = logslot('canhazdb.controllers.external.lock');

async function lockController (context, socketState, request, response) {
  const requestData = request.json();

  const id = uuid();

  const results = await Promise.all(
    context.nodes
      .filter(node => node.connected)
      .map(node => {
        return node.client.send(c.LOCK, {
          [c.LOCK_ID]: id,
          [c.LOCK_KEYS]: requestData[c.LOCK_KEYS]
        })
          .catch(error => {
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

  response.reply(c.STATUS_OK, {
    [c.LOCK_ID]: id
  });
}

export default lockController;
