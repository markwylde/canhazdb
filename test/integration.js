const fs = require('fs');

const packageJson = require('../package.json');

const test = require('basictap');
const httpRequest = require('./helpers/httpRequest');
const createTestCluster = require('./helpers/createTestCluster');
const canhazdb = require('../lib');

const mapTimes = (times, fn) => Array(times).fill().map((_, index) => fn(index));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const tls = {
  key: fs.readFileSync('./certs/localhost.privkey.pem'),
  cert: fs.readFileSync('./certs/localhost.cert.pem'),
  ca: [fs.readFileSync('./certs/ca.cert.pem')],
  requestCert: true
};

test('get: root pathname', async t => {
  t.plan(1);

  const node = await canhazdb({ host: 'localhost', port: 7071, queryPort: 8071, tls, single: true });

  const request = await httpRequest(`${node.url}/`);

  await node.close();

  t.deepEqual(request.data, {
    info: 'https://canhazdb.com',
    name: packageJson.name,
    status: 200,
    version: packageJson.version
  });
});

function rootMethodNotAllowed (method) {
  return async t => {
    t.plan(2);

    const node = await canhazdb({ host: 'localhost', port: 7071, queryPort: 8071, tls, single: true });

    const request = await httpRequest(`${node.url}/`, { method });

    await node.close();

    t.deepEqual(request.data, { error: 'method not allowed' });
    t.equal(request.status, 405);
  };
}

function validateBodyExists (method) {
  return async t => {
    t.plan(2);

    const node = await canhazdb({ host: 'localhost', port: 7071, queryPort: 8071, tls, single: true });

    const request = await httpRequest(`${node.url}/exampleCollection`, { method });

    await node.close();

    t.deepEqual(request.data, { error: 'empty request body not allowed' });
    t.equal(request.status, 400);
  };
}

function validateBodyJson (method) {
  return async t => {
    t.plan(2);

    const node = await canhazdb({ host: 'localhost', port: 7071, queryPort: 8071, tls, single: true });

    const request = await httpRequest(`${node.url}/exampleCollection`, { method, data: 'not json' });

    await node.close();

    t.deepEqual(request.data, { error: 'request body not valid json' });
    t.equal(request.status, 400);
  };
}

test('post: root pathname', rootMethodNotAllowed('post'));
test('put: root pathname', rootMethodNotAllowed('put'));
test('patch: root pathname', rootMethodNotAllowed('patch'));
test('delete: root pathname', rootMethodNotAllowed('delete'));

test('post: body exists', validateBodyExists('post'));
test('put: body exists', validateBodyExists('put'));
test('patch: body exists', validateBodyExists('patch'));

test('post: body is json', validateBodyJson('post'));
test('put: body is json', validateBodyJson('put'));
test('patch: body is json', validateBodyJson('patch'));

test('post: and get some data', async t => {
  t.plan(3);

  const cluster = await createTestCluster(3, tls);
  const node = cluster.getRandomNodeUrl();

  const postRequest = await httpRequest(`${node.url}/tests`, {
    method: 'POST',
    data: {
      a: 1,
      b: 2,
      c: 3
    }
  });

  const getRequest = await httpRequest(`${node.url}/tests/${postRequest.data.id}`);
  await cluster.closeAll();

  t.deepEqual(getRequest.data, {
    id: getRequest.data.id ? getRequest.data.id : t.fail(),
    a: 1,
    b: 2,
    c: 3
  });

  t.equal(postRequest.status, 201);
  t.equal(getRequest.status, 200);
});

test('post: and count some data', async t => {
  t.plan(2);

  const cluster = await createTestCluster(3, tls);
  const node = cluster.getRandomNodeUrl();

  await Promise.all([
    httpRequest(`${node.url}/tests`, {
      method: 'POST',
      data: { a: 1 }
    }),

    httpRequest(`${node.url}/tests`, {
      method: 'POST',
      data: { a: 2 }
    })
  ]);

  const getRequest = await httpRequest(`${node.url}/tests?count=true`);
  await cluster.closeAll();

  t.deepEqual(getRequest.data, {
    documentCount: 2
  });

  t.equal(getRequest.status, 200);
});

test('post: and getAll specific fields only', async t => {
  t.plan(3);

  const cluster = await createTestCluster(3, tls);
  const node = cluster.getRandomNodeUrl();

  const postRequest = await httpRequest(`${node.url}/tests`, {
    method: 'POST',
    data: {
      a: 1,
      b: 2,
      c: 3
    }
  });

  const getRequest = await httpRequest(`${node.url}/tests?fields=["b"]`);
  await cluster.closeAll();

  t.deepEqual(getRequest.data[0], {
    id: getRequest.data[0].id ? getRequest.data[0].id : t.fail(),
    b: 2
  });

  t.equal(postRequest.status, 201);
  t.equal(getRequest.status, 200);
});

test('post: and getOne specific fields only', async t => {
  t.plan(3);

  const cluster = await createTestCluster(3, tls);
  const node = cluster.getRandomNodeUrl();

  const postRequest = await httpRequest(`${node.url}/tests`, {
    method: 'POST',
    data: {
      a: 1,
      b: 2,
      c: 3
    }
  });

  const getRequest = await httpRequest(`${node.url}/tests/${postRequest.data.id}?fields=["b"]`);
  await cluster.closeAll();

  t.deepEqual(getRequest.data, {
    id: getRequest.data.id ? getRequest.data.id : t.fail(),
    b: 2
  });

  t.equal(postRequest.status, 201);
  t.equal(getRequest.status, 200);
});

test('post: some data with invalid collection name', async t => {
  t.plan(2);

  const cluster = await createTestCluster(3, tls);

  const postRequest = await httpRequest(`${cluster.nodes[1].url}/not$allowed/notfound`, {
    method: 'POST',
    data: {
      a: 1
    }
  });

  await cluster.closeAll();

  t.deepEqual(postRequest.data, {
    errors: ['collectionId can only contain a-z, A-Z, 0-9, dashs or dots']
  });

  t.equal(postRequest.status, 422);
});

test('put: some data', async t => {
  t.plan(3);

  const cluster = await createTestCluster(3, tls);

  const postRequest = await httpRequest(`${cluster.nodes[1].url}/tests`, {
    method: 'POST',
    data: {
      a: 1
    }
  });

  await httpRequest(`${cluster.nodes[1].url}/tests/${postRequest.data.id}`, {
    method: 'PUT',
    data: {
      a: 2
    }
  });

  const getRequest = await httpRequest(`${cluster.nodes[1].url}/tests/${postRequest.data.id}`);

  await cluster.closeAll();

  t.deepEqual(getRequest.data, {
    id: postRequest.data.id,
    a: 2
  });

  t.equal(postRequest.status, 201);
  t.equal(getRequest.status, 200);
});

test('patch: some data', async t => {
  t.plan(3);

  const cluster = await createTestCluster(3, tls);

  const postRequest = await httpRequest(`${cluster.nodes[1].url}/tests`, {
    method: 'POST',
    data: {
      a: 1
    }
  });

  await httpRequest(`${cluster.nodes[1].url}/tests/${postRequest.data.id}`, {
    method: 'PATCH',
    data: {
      b: "a'2"
    }
  });

  const getRequest = await httpRequest(`${cluster.nodes[1].url}/tests/${postRequest.data.id}`);

  await cluster.closeAll();

  t.deepEqual(getRequest.data, {
    id: postRequest.data.id,
    a: 1,
    b: "a'2"
  });

  t.equal(postRequest.status, 201);
  t.equal(getRequest.status, 200);
});

test('delete: record returns a 404', async t => {
  t.plan(4);

  const cluster = await createTestCluster(3, tls);

  const postRequest = await httpRequest(`${cluster.nodes[1].url}/tests`, {
    method: 'POST',
    data: {
      a: 1,
      b: 2,
      c: 3
    }
  });

  const deleteRequest = await httpRequest(`${cluster.nodes[1].url}/tests/${postRequest.data.id}`, {
    method: 'DELETE'
  });

  const getRequest = await httpRequest(`${cluster.nodes[2].url}/tests/${postRequest.data.id}`);

  await cluster.closeAll();

  t.deepEqual(getRequest.data, {});

  t.equal(postRequest.status, 201);
  t.equal(deleteRequest.status, 200);
  t.equal(getRequest.status, 404);
});

test('find: collection has no records', async t => {
  t.plan(2);

  const cluster = await createTestCluster(3, tls);

  const getRequest = await httpRequest(`${cluster.nodes[2].url}/tests`);

  await cluster.closeAll();

  t.deepEqual(getRequest.status, 200);
  t.deepEqual(getRequest.data, []);
});

test('find: return all three records', async t => {
  t.plan(8);

  const cluster = await createTestCluster(3, tls);

  await Promise.all([
    httpRequest(`${cluster.nodes[1].url}/tests`, {
      method: 'POST',
      data: { a: 1, b: 2, c: 3 }
    }),
    httpRequest(`${cluster.nodes[1].url}/tests`, {
      method: 'POST',
      data: { d: 4, e: 5, f: 6 }
    }),
    httpRequest(`${cluster.nodes[1].url}/tests`, {
      method: 'POST',
      data: { g: 7, h: 8, i: 9 }
    })
  ]);

  const getRequest = await httpRequest(`${cluster.nodes[2].url}/tests`);

  await cluster.closeAll();

  t.equal(getRequest.data.length, 3);
  t.equal(getRequest.status, 200);

  t.ok(getRequest.data[0].id);
  t.ok(getRequest.data[1].id);
  t.ok(getRequest.data[2].id);

  getRequest.data.forEach(item => {
    delete item.id;
  });

  t.deepEqual(getRequest.data.find(item => item.a), { a: 1, b: 2, c: 3 });
  t.deepEqual(getRequest.data.find(item => item.d), { d: 4, e: 5, f: 6 });
  t.deepEqual(getRequest.data.find(item => item.g), { g: 7, h: 8, i: 9 });
});

test('find: filter by querystring', async t => {
  t.plan(4);

  const cluster = await createTestCluster(3, tls);

  await Promise.all([
    httpRequest(`${cluster.nodes[1].url}/tests`, {
      method: 'POST',
      data: { a: 1, b: 2, c: 3 }
    }),
    httpRequest(`${cluster.nodes[1].url}/tests`, {
      method: 'POST',
      data: { d: 4, e: 5, f: 6 }
    }),
    httpRequest(`${cluster.nodes[1].url}/tests`, {
      method: 'POST',
      data: { g: 7, h: 8, i: 9 }
    })
  ]);

  const getRequest = await httpRequest(`${cluster.nodes[2].url}/tests?query={"d":4}`);

  await cluster.closeAll();

  t.equal(getRequest.data.length, 1);
  t.equal(getRequest.status, 200);

  t.ok(getRequest.data[0].id);
  delete getRequest.data[0].id;

  t.deepEqual(getRequest.data[0], { d: 4, e: 5, f: 6 });
});

test('filter: find one out of three records', async t => {
  t.plan(4);

  const cluster = await createTestCluster(3, tls);

  await Promise.all([
    httpRequest(`${cluster.nodes[1].url}/tests`, {
      method: 'POST',
      data: { a: 1, b: 2, c: 3 }
    }),
    httpRequest(`${cluster.nodes[1].url}/tests`, {
      method: 'POST',
      data: { d: 4, e: 5, f: 6 }
    }),
    httpRequest(`${cluster.nodes[1].url}/tests`, {
      method: 'POST',
      data: { g: 7, h: 8, i: 9 }
    })
  ]);

  const getRequest = await httpRequest(`${cluster.nodes[2].url}/tests?query={"d":4}`);

  await cluster.closeAll();

  t.equal(getRequest.data.length, 1);
  t.equal(getRequest.status, 200);

  t.ok(getRequest.data[0].id);
  delete getRequest.data[0].id;

  t.deepEqual(getRequest.data[0], { d: 4, e: 5, f: 6 });
});

test('filter: delete two out of three records', async t => {
  t.plan(5);

  const cluster = await createTestCluster(3, tls);

  const posts = Array(10).fill('').map((_, index) => {
    return httpRequest(`${cluster.nodes[1].url}/tests`, {
      method: 'POST',
      data: { index }
    });
  });

  await Promise.all(posts);

  const deletions = await httpRequest(`${cluster.nodes[2].url}/tests?query={"index":{"$gt":5}}`, { method: 'DELETE' });

  const getRequest = await httpRequest(`${cluster.nodes[2].url}/tests`);

  await cluster.closeAll();

  t.equal(deletions.status, 200);
  t.equal(deletions.data.changes, 4);

  t.equal(getRequest.status, 200);
  t.equal(getRequest.data.length, 6);

  t.ok(getRequest.data[0].id);
  delete getRequest.data[0].id;
});

test('filter: put two out of three records', async t => {
  t.plan(5);

  const cluster = await createTestCluster(3, tls);

  const posts = Array(10).fill('').map((_, index) => {
    return httpRequest(`${cluster.nodes[1].url}/tests`, {
      method: 'POST',
      data: { index }
    });
  });

  await Promise.all(posts);

  const putResponse = await httpRequest(`${cluster.nodes[2].url}/tests?query={"index":{"$gt":5}}`, {
    method: 'PUT',
    data: {
      a: 1
    }
  });

  const getRequest = await httpRequest(`${cluster.nodes[2].url}/tests`);

  await cluster.closeAll();

  t.equal(putResponse.status, 200);
  t.equal(putResponse.data.changes, 4);

  t.equal(getRequest.status, 200);
  t.equal(getRequest.data.length, 10);

  t.equal(getRequest.data.filter(item => item.a === 1).length, 4);
});

test('limit: find three records', async t => {
  t.plan(2);

  const cluster = await createTestCluster(3, tls);

  const posts = Array(10).fill('').map((_, index) => {
    return httpRequest(`${cluster.nodes[1].url}/tests`, {
      method: 'POST',
      data: { index }
    });
  });

  await Promise.all(posts);

  const getRequest = await httpRequest(`${cluster.nodes[2].url}/tests?limit=3`);

  await cluster.closeAll();

  t.equal(getRequest.data.length, 3);
  t.equal(getRequest.status, 200);
});

test('order: ascending order three records', async t => {
  t.plan(5);

  const cluster = await createTestCluster(3, tls);

  const posts = Array(10).fill('').map((_, index) => {
    return httpRequest(`${cluster.nodes[1].url}/tests`, {
      method: 'POST',
      data: { index }
    });
  });

  await Promise.all(posts);

  const getRequest = await httpRequest(`${cluster.nodes[2].url}/tests?order=["asc(index)"]`);

  await cluster.closeAll();

  t.equal(getRequest.data.length, 10);
  t.equal(getRequest.status, 200);

  t.deepEqual(getRequest.data[0].index, 0);
  t.deepEqual(getRequest.data[1].index, 1);
  t.deepEqual(getRequest.data[5].index, 5);
});

test('order: descending order three records', async t => {
  t.plan(5);

  const cluster = await createTestCluster(3, tls);

  const posts = Array(10).fill('').map((_, index) => {
    return httpRequest(`${cluster.nodes[1].url}/tests`, {
      method: 'POST',
      data: { index }
    });
  });

  await Promise.all(posts);

  const getRequest = await httpRequest(`${cluster.nodes[2].url}/tests?order=["desc(index)"]`);

  await cluster.closeAll();

  t.equal(getRequest.data.length, 10);
  t.equal(getRequest.status, 200);

  t.deepEqual(getRequest.data[0].index, 9);
  t.deepEqual(getRequest.data[1].index, 8);
  t.deepEqual(getRequest.data[5].index, 4);
});

test('order: multiple descending order three records', async t => {
  t.plan(5);

  const cluster = await createTestCluster(3, tls);

  const posts = Array(10).fill('').map((_, index) => {
    return httpRequest(`${cluster.nodes[1].url}/tests`, {
      method: 'POST',
      data: { index, otherIndex: index }
    });
  });

  await Promise.all(posts);

  const getRequest = await httpRequest(`${cluster.nodes[2].url}/tests?order=["desc(index)","desc(otherIndex)"]`);

  await cluster.closeAll();

  t.equal(getRequest.data.length, 10);
  t.equal(getRequest.status, 200);

  t.deepEqual(getRequest.data[0].index, 9);
  t.deepEqual(getRequest.data[1].index, 8);
  t.deepEqual(getRequest.data[5].index, 4);
});

test('autojoin: join learned nodes automatically', async t => {
  t.plan(4);

  const cluster = await createTestCluster(3, tls);
  const node = cluster.getRandomNodeUrl();

  const node4 = await canhazdb({ host: 'localhost', port: 7071, queryPort: 8071, tls, join: [`${node.host}:${node.port}`] });

  await sleep(2500);

  await cluster.closeAll();
  await node4.close();

  const getAllPorts = node => node.nodes.map(node => node.port).sort();
  t.deepEqual(getAllPorts(node4), [cluster.nodes[0].port, cluster.nodes[1].port, cluster.nodes[2].port]);

  t.deepEqual(getAllPorts(cluster.nodes[0]), [cluster.nodes[0].port, cluster.nodes[1].port, cluster.nodes[2].port]);
  t.deepEqual(getAllPorts(cluster.nodes[1]), [cluster.nodes[0].port, cluster.nodes[1].port, cluster.nodes[2].port]);
  t.deepEqual(getAllPorts(cluster.nodes[2]), [cluster.nodes[0].port, cluster.nodes[1].port, cluster.nodes[2].port]);
});

test('disaster: one node goes offline', async t => {
  t.plan(2);

  const cluster = await createTestCluster(3, tls);

  await cluster.nodes[1].close();
  const getRequest = await httpRequest(`${cluster.nodes[2].url}/tests`);

  await cluster.closeAll();

  t.equal(getRequest.status, 503);
  t.deepEqual(getRequest.data, {
    errors: [
      'a node in the cluster is unhealthy, therefore the database is down'
    ]
  });
});

test('disaster: one node goes offline then online', async t => {
  t.plan(4);

  const cluster = await createTestCluster(3);

  await cluster.nodes[1].close();

  const getRequestAfterClose = await httpRequest(`${cluster.nodes[2].url}/tests`);

  t.equal(getRequestAfterClose.status, 503);
  t.deepEqual(getRequestAfterClose.data, {
    errors: [
      'a node in the cluster is unhealthy, therefore the database is down'
    ]
  });

  await cluster.nodes[1].open();

  await sleep(1000);

  const getRequestAfterReopen = await httpRequest(`${cluster.nodes[2].url}/tests`);

  await cluster.closeAll();

  t.equal(getRequestAfterReopen.status, 200);
  t.deepEqual(getRequestAfterReopen.data, []);
});

test('disaster: recover and still works', async t => {
  t.plan(6);

  const cluster = await createTestCluster(10);

  await Promise.all([
    cluster.nodes[1].close(),
    cluster.nodes[3].close(),
    cluster.nodes[7].close()
  ]);

  const getRequestAfterClose = await httpRequest(`${cluster.nodes[2].url}/tests`);

  t.equal(getRequestAfterClose.status, 503);
  t.deepEqual(getRequestAfterClose.data, {
    errors: [
      'a node in the cluster is unhealthy, therefore the database is down'
    ]
  });

  await Promise.all([
    cluster.nodes[1].open(),
    cluster.nodes[3].open(),
    cluster.nodes[7].open()
  ]);

  await sleep(1000);

  const getRequestAfterReopen = await httpRequest(`${cluster.nodes[2].url}/tests`);

  t.equal(getRequestAfterReopen.status, 200);
  t.deepEqual(getRequestAfterReopen.data, []);

  await Promise.all(mapTimes(100, index => {
    return httpRequest(`${cluster.nodes[index % 10].url}/tests`, {
      method: 'POST',
      data: { a: index }
    });
  }));

  const getRequests = await Promise.all(mapTimes(10, index => {
    return httpRequest(`${cluster.nodes[index].url}/tests`).then(response => response.data);
  }));

  t.deepEqual(getRequests.flatMap(data => data.length), [100, 100, 100, 100, 100, 100, 100, 100, 100, 100]);

  await cluster.closeAll();

  t.ok('finished');
});
