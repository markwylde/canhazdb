import test from 'basictap';
import createTestServers from '../helpers/createTestServers.js';

import c from '../../lib/constants.js';
import tcpocket from 'tcpocket';

function createExampleDocuments (client, count, extraData) {
  const counts = Array(count).fill('').map((_, index) => index);

  return Promise.all(
    counts.map(count => {
      return client.send(c.POST, {
        [c.COLLECTION_ID]: 'tests',
        [c.DATA]: {
          ...extraData,
          foo: 'bar' + (count + 1)
        }
      });
    })
  );
}

test('invalid command', async t => {
  t.plan(1);

  const servers = await createTestServers(1);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();

  await createExampleDocuments(client, 1);

  const getResponse = await client.send(255);

  t.equal(getResponse.command, c.STATUS_NOT_FOUND, 'has status');

  await client.close();
  await servers.close();
});

test('info', async t => {
  t.plan(5);

  const servers = await createTestServers(1);
  const client = tcpocket.createClient(servers[0].clientConfig);

  await client.waitUntilConnected();
  const result = await client.send(c.INFO, {
    [c.INTERNAL]: true
  });

  t.equal(result.command, c.STATUS_OK, 'response had 200 status');
  t.equal(result.json()[c.DATA].nodeName.length, 36, 'nodeName has correct length');
  t.equal(result.json()[c.DATA].nodes.length, 1, 'one node was returned');
  t.equal(result.json()[c.DATA].nodes[0].host, servers[0].options.host, 'first node had correct host');
  t.equal(result.json()[c.DATA].nodes[0].port, servers[0].options.port, 'first node had correct port');

  await Promise.all([
    client.close(),
    servers.close()
  ]);
});

test('post', async t => {
  t.plan(11);

  const servers = await createTestServers(1);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();

  const postResponses = await createExampleDocuments(client, 3);

  t.equal(postResponses[0].command, c.STATUS_CREATED, 'has status');
  t.ok(postResponses[0].json()[c.DATA].id, 'has id');
  t.equal(postResponses[0].json()[c.DATA].foo, 'bar1', 'has foo property');

  const getResponse = await client.send(c.GET, {
    [c.COLLECTION_ID]: 'tests'
  });

  t.equal(getResponse.command, c.STATUS_OK, 'has status');
  t.equal(getResponse.json()[c.DATA].length, 3, 'returned 1 document');

  const sortedDocuments = getResponse.json()[c.DATA]
    .sort((a, b) => a.foo > b.foo ? 1 : -1);

  t.ok(sortedDocuments[0].id, 'has id property');
  t.equal(sortedDocuments[0].foo, 'bar1', 'has foo property');
  t.ok(sortedDocuments[1].id, 'has id property');
  t.equal(sortedDocuments[1].foo, 'bar2', 'has foo property');
  t.ok(sortedDocuments[2].id, 'has id property');
  t.equal(sortedDocuments[2].foo, 'bar3', 'has foo property');

  await client.close();
  await servers.close();
});

test('put', async t => {
  t.plan(3);

  const servers = await createTestServers(1);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();

  await createExampleDocuments(client, 3);

  const putResponses = await client.send(c.PUT, {
    [c.COLLECTION_ID]: 'tests',
    [c.DATA]: { foo: 'barz' }
  });

  const getResponse = await client.send(c.GET, {
    [c.COLLECTION_ID]: 'tests'
  });

  t.equal(getResponse.command, c.STATUS_OK, 'has status');

  const foos = getResponse.json()[c.DATA]
    .map(item => item.foo);
  t.deepEqual(foos, ['barz', 'barz', 'barz'], 'returned 1 document');

  t.equal(putResponses.json()[c.DATA], 3, 'altered the correct number of documents');
  await client.close();
  await servers.close();
});

test('patch', async t => {
  t.plan(3);

  const servers = await createTestServers(1);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();

  await createExampleDocuments(client, 3, { b: 1 });

  const putResponses = await client.send(c.PATCH, {
    [c.COLLECTION_ID]: 'tests',
    [c.DATA]: { foo: 'barz' }
  });

  const getResponse = await client.send(c.GET, {
    [c.COLLECTION_ID]: 'tests'
  });

  t.equal(getResponse.command, c.STATUS_OK, 'has status');

  const finalResponse = getResponse.json()[c.DATA]
    .map(item => {
      const { id, ...withoutId } = item;
      return withoutId;
    });
  t.deepEqual(finalResponse, [
    { foo: 'barz', b: 1 },
    { foo: 'barz', b: 1 },
    { foo: 'barz', b: 1 }
  ], 'returned 1 document');

  t.equal(putResponses.json()[c.DATA], 3, 'altered the correct number of documents');
  await client.close();
  await servers.close();
});

test('delete', async t => {
  t.plan(2);

  const servers = await createTestServers(1);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();

  await createExampleDocuments(client, 3);

  const deleteResponse = await client.send(c.DELETE, {
    [c.COLLECTION_ID]: 'tests',
    [c.QUERY]: { foo: 'bar2' }
  });

  t.equal(deleteResponse.command, c.STATUS_OK, 'has status');
  t.equal(deleteResponse.json()[c.DATA], 1, 'returned 1 change');

  await client.close();
  await servers.close();
});

test('get - with order (ascending)', async t => {
  t.plan(5);

  const servers = await createTestServers(1);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();

  await createExampleDocuments(client, 3);

  const getResponse = await client.send(c.GET, {
    [c.COLLECTION_ID]: 'tests',
    [c.ORDER]: ['asc(foo)']
  });

  t.equal(getResponse.command, c.STATUS_OK, 'has status');
  t.equal(getResponse.json()[c.DATA].length, 3, 'returned 1 document');

  t.equal(getResponse.json()[c.DATA][0].foo, 'bar1', 'has foo property');
  t.equal(getResponse.json()[c.DATA][1].foo, 'bar2', 'has foo property');
  t.equal(getResponse.json()[c.DATA][2].foo, 'bar3', 'has foo property');

  await client.close();
  await servers.close();
});

test('get - with order (descending)', async t => {
  t.plan(5);

  const servers = await createTestServers(1);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();

  await createExampleDocuments(client, 3);

  const getResponse = await client.send(c.GET, {
    [c.COLLECTION_ID]: 'tests',
    [c.ORDER]: ['desc(foo)']
  });

  t.equal(getResponse.command, c.STATUS_OK, 'has status');
  t.equal(getResponse.json()[c.DATA].length, 3, 'returned 1 document');

  t.equal(getResponse.json()[c.DATA][0].foo, 'bar3', 'has foo property');
  t.equal(getResponse.json()[c.DATA][1].foo, 'bar2', 'has foo property');
  t.equal(getResponse.json()[c.DATA][2].foo, 'bar1', 'has foo property');

  await client.close();
  await servers.close();
});

test('get - with limit', async t => {
  t.plan(2);

  const servers = await createTestServers(1);
  const client = tcpocket.createClient(servers[0].clientConfig);
  await client.waitUntilConnected();

  await createExampleDocuments(client, 5);

  const getResponse = await client.send(c.GET, {
    [c.COLLECTION_ID]: 'tests',
    [c.LIMIT]: 3
  });

  t.equal(getResponse.command, c.STATUS_OK, 'has status');
  t.equal(getResponse.json()[c.DATA].length, 3, 'returned 1 document');

  await client.close();
  await servers.close();
});
