const fs = require('fs');

const test = require('basictap');
const httpRequest = require('./helpers/httpRequest');
const createTestCluster = require('./helpers/createTestCluster');

const tls = {
  key: fs.readFileSync('./certs/localhost.privkey.pem'),
  cert: fs.readFileSync('./certs/localhost.cert.pem'),
  ca: [fs.readFileSync('./certs/ca.cert.pem')],
  requestCert: true
};

test('lock: and post some data (success)', async t => {
  t.plan(5);

  const cluster = await createTestCluster(3, tls);
  const node = cluster.getRandomNodeUrl();

  const lockRequest = await httpRequest(`${node.url}/_/locks`, {
    method: 'POST',
    data: ['tests']
  });

  const postRequest = await httpRequest(`${node.url}/tests`, {
    method: 'POST',
    headers: {
      'x-lock-id': lockRequest.data.id
    },
    data: {
      a: 1,
      b: 2,
      c: 3
    }
  });

  const getRequest = await httpRequest(`${node.url}/tests/${postRequest.data.id}`);

  const unlockRequest = await httpRequest(`${node.url}/_/locks/${lockRequest.data.id}`, {
    method: 'DELETE'
  });
  t.equal(unlockRequest.status, 200);

  cluster.closeAll();

  t.equal(postRequest.status, 201);

  t.deepEqual(getRequest.data, {
    id: getRequest.data.id ? getRequest.data.id : t.fail(),
    a: 1,
    b: 2,
    c: 3
  });

  t.equal(postRequest.status, 201);
  t.equal(getRequest.status, 200);
});

test('lock: delete lock with incorrect id', async t => {
  t.plan(1);
  const cluster = await createTestCluster(3, tls);
  const node = cluster.getRandomNodeUrl();

  const unlockRequest = await httpRequest(`${node.url}/_/locks/dunno`, {
    method: 'DELETE'
  });
  t.equal(unlockRequest.status, 404);

  cluster.closeAll();
});

test('lock: multiple happen in order', async t => {
  t.plan(6);

  const cluster = await createTestCluster(3, tls);
  const node = cluster.getRandomNodeUrl();

  let firstFinished = false;
  let secondFinished = false;

  const first = httpRequest(`${node.url}/_/locks`, {
    method: 'POST',
    data: ['tests']
  }).then(async lockRequest => {
    const postRequest = await httpRequest(`${node.url}/tests`, {
      method: 'POST',
      headers: {
        'x-lock-id': lockRequest.data.id
      },
      data: { a: 1 }
    });
    t.equal(postRequest.status, 201);

    firstFinished = true;

    const unlockRequest = await httpRequest(`${node.url}/_/locks/${lockRequest.data.id}`, {
      method: 'DELETE'
    });

    t.equal(unlockRequest.status, 200);
  });

  const second = httpRequest(`${node.url}/_/locks`, {
    method: 'POST',
    data: ['tests']
  }).then(async lockRequest => {
    t.ok(firstFinished, 'first lock has finished before second starts');
    const postRequest = await httpRequest(`${node.url}/tests`, {
      method: 'POST',
      headers: {
        'x-lock-id': lockRequest.data.id
      },
      data: { a: 1 }
    });

    t.equal(postRequest.status, 201);

    secondFinished = true;
    const unlockRequest = await httpRequest(`${node.url}/_/locks/${lockRequest.data.id}`, {
      method: 'DELETE'
    });
    t.equal(unlockRequest.status, 200);
  });

  await Promise.all([first, second]);

  cluster.closeAll();

  t.ok(secondFinished, 'second lock ran');
});

test('lock: and post some data (conflict + fail)', async t => {
  t.plan(2);

  const cluster = await createTestCluster(3, tls);
  const node = cluster.getRandomNodeUrl();

  const lockRequest = await httpRequest(`${node.url}/_/locks`, {
    method: 'POST',
    data: ['tests']
  });

  const postRequest = await httpRequest(`${node.url}/tests`, {
    method: 'POST',
    headers: {
      'x-lock-strategy': 'fail'
    },
    data: {
      a: 1
    }
  });

  const unlockRequest = await httpRequest(`${node.url}/_/locks/${lockRequest.data.id}`, {
    method: 'DELETE'
  });
  t.equal(unlockRequest.status, 200);

  cluster.closeAll();

  t.equal(postRequest.status, 409);
});

test('lock: and post some data (conflict + wait)', async t => {
  t.plan(5);

  const cluster = await createTestCluster(3, tls);
  const node = cluster.getRandomNodeUrl();

  const lockRequest = await httpRequest(`${node.url}/_/locks`, {
    method: 'POST',
    data: ['tests']
  });

  httpRequest(`${node.url}/tests`, {
    method: 'POST',
    headers: {
      'x-lock-strategy': 'wait'
    },
    data: {
      a: 1,
      b: 2,
      c: 3
    }
  }).then(async postRequest => {
    const getRequest = await httpRequest(`${node.url}/tests/${postRequest.data.id}`);
    cluster.closeAll();

    t.equal(postRequest.status, 201);
    t.deepEqual(getRequest.data, {
      id: getRequest.data.id ? getRequest.data.id : t.fail(),
      a: 1,
      b: 2,
      c: 3
    });

    t.equal(postRequest.status, 201);
    t.equal(getRequest.status, 200);
  });

  const unlockRequest = await httpRequest(`${node.url}/_/locks/${lockRequest.data.id}`, {
    method: 'DELETE'
  });
  t.equal(unlockRequest.status, 200);
});

test('lock: all methods lock', async t => {
  t.plan(3);

  const cluster = await createTestCluster(3, tls);
  const node = cluster.getRandomNodeUrl();

  let unlocked = false;

  const postRequest = await httpRequest(`${node.url}/tests`, {
    method: 'POST',
    data: { a: 1 }
  });

  const lockRequest = await httpRequest(`${node.url}/_/locks`, {
    method: 'POST',
    data: ['tessts']
  });

  const putRequest = httpRequest(`${node.url}/tests/${postRequest.data.id}`, {
    method: 'PUT',
    data: { a: 2 }
  });

  const patchRequest = httpRequest(`${node.url}/tests/${postRequest.data.id}`, {
    method: 'PATCH',
    data: { a: 2 }
  });

  Promise.all([putRequest, patchRequest])
    .then(async (args) => {
      const deleteRequest = await httpRequest(`${node.url}/tests/${postRequest.data.id}`, {
        method: 'DELETE'
      });
      await cluster.closeAll();
      t.deepEqual(args.map(arg => arg.status), [200, 200]);
      t.equal(deleteRequest.status, 200);
      t.ok(unlocked, 'requests happened after unlock');
    });

  await httpRequest(`${node.url}/_/locks/${lockRequest.data.id}`, {
    method: 'DELETE'
  });

  unlocked = true;
});

test('lock: and wait but node closes', async t => {
  t.plan(1);

  const cluster = await createTestCluster(1, tls);
  const node = cluster.getRandomNodeUrl();

  await httpRequest(`${node.url}/_/locks`, {
    method: 'POST',
    data: ['tests']
  });

  httpRequest(`${node.url}/tests`, {
    method: 'POST',
    headers: {
      'x-lock-strategy': 'wait'
    },
    data: { a: 1 }
  }).then(postRequest => {
    t.fail('should not have resolved successfully');
  }).catch(error => {
    t.equal(error.message, 'socket hang up');
  });

  setTimeout(() => {
    cluster.closeAll();
  }, 500);
});
