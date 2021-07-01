import fs from 'fs';
import test from 'basictap';

import createDriver from '../../../lib/driver/index.js';

test('count: no records', async t => {
  t.plan(1);

  await fs.promises.rmdir('./canhazdata/tmptest', { recursive: true }).catch(_ => {});

  const driver = await createDriver({
    options: {
      dataDirectory: './canhazdata/tmptest'
    }
  });

  const result = await driver.count('tests');

  await driver.close();

  t.deepEqual(result, 0);
});

test('get: no records', async t => {
  t.plan(1);

  await fs.promises.rmdir('./canhazdata/tmptest', { recursive: true }).catch(_ => {});

  const driver = await createDriver({
    options: {
      dataDirectory: './canhazdata/tmptest'
    }
  });

  const result = await driver.get('tests');

  await driver.close();

  t.deepEqual(result, []);
});

test('post: records', async t => {
  t.plan(2);

  await fs.promises.rmdir('./canhazdata/tmptest', { recursive: true }).catch(_ => {});

  const driver = await createDriver({
    options: {
      dataDirectory: './canhazdata/tmptest'
    }
  });

  const postResult = await driver.post('tests', { a: 1 });
  const getResult = await driver.get('tests');

  await driver.close();

  t.deepEqual(postResult.a, 1);
  t.deepEqual(getResult, [postResult]);
});

test('get: records - with projection', async t => {
  t.plan(1);

  await fs.promises.rmdir('./canhazdata/tmptest', { recursive: true }).catch(_ => {});

  const driver = await createDriver({
    options: {
      dataDirectory: './canhazdata/tmptest'
    }
  });

  await Promise.all([
    driver.post('tests', { a: 1, b: 'yes' }),
    driver.post('tests', { a: 2, b: 'yes' }),
    driver.post('tests', { a: 3, b: 'yes' })
  ]);

  let result = await driver.get('tests', null, ['a']);
  result = result.sort((a, b) => a.a >= b.a ? 1 : -1);

  await driver.close();

  t.deepEqual(result, [
    { a: 1 },
    { a: 2 },
    { a: 3 }
  ]);
});

test('put: record', async t => {
  t.plan(2);

  await fs.promises.rmdir('./canhazdata/tmptest', { recursive: true }).catch(_ => {});

  const driver = await createDriver({
    options: {
      dataDirectory: './canhazdata/tmptest'
    }
  });

  await Promise.all([
    driver.post('tests', { a: 1, b: 'yes' }),
    driver.post('tests', { a: 2, b: 'yes' }),
    driver.post('tests', { a: 3, b: 'yes' })
  ]);

  const { changes } = await driver.put('tests', { b: 'no' }, {});

  let result = await driver.get('tests');
  result = result.sort((a, b) => a.a >= b.a ? 1 : -1);

  await driver.close();

  t.equal(changes, 3);
  t.deepEqual(result, [
    { b: 'no' },
    { b: 'no' },
    { b: 'no' }
  ]);
});

test('patch: record', async t => {
  t.plan(2);

  await fs.promises.rmdir('./canhazdata/tmptest', { recursive: true }).catch(_ => {});

  const driver = await createDriver({
    options: {
      dataDirectory: './canhazdata/tmptest'
    }
  });

  await Promise.all([
    driver.post('tests', { a: 1, b: 'yes' }),
    driver.post('tests', { a: 2, b: 'yes' }),
    driver.post('tests', { a: 3, b: 'yes' })
  ]);

  const { changes } = await driver.patch('tests', { b: 'no' }, {});

  let result = await driver.get('tests');
  result = result.sort((a, b) => a.a >= b.a ? 1 : -1);

  await driver.close();

  t.equal(changes, 3);
  t.deepEqual(result, [
    { a: 1, b: 'no' },
    { a: 2, b: 'no' },
    { a: 3, b: 'no' }
  ]);
});

test('del: record', async t => {
  t.plan(2);

  await fs.promises.rmdir('./canhazdata/tmptest', { recursive: true }).catch(_ => {});

  const driver = await createDriver({
    options: {
      dataDirectory: './canhazdata/tmptest'
    }
  });

  await Promise.all([
    driver.post('tests', { a: 1, b: 'yes' }),
    driver.post('tests', { a: 2, b: 'yes' }),
    driver.post('tests', { a: 3, b: 'yes' })
  ]);

  const { changes } = await driver.del('tests', { a: 2 });

  let result = await driver.get('tests');
  result = result.sort((a, b) => a.a >= b.a ? 1 : -1);

  await driver.close();

  t.equal(changes, 1);
  t.deepEqual(result, [
    { a: 1, b: 'yes' },
    { a: 3, b: 'yes' }
  ]);
});
