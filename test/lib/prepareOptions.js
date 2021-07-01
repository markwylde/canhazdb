import test from 'basictap';
import prepareOptions from '../../lib/prepareOptions.js';

test('prepareOptions.js - all tls arguments must be passed', async t => {
  t.plan(1);

  prepareOptions({
    tlsKey: 'a'
  }).catch(error => {
    t.equal(error.message, 'You must specifiy either all [tls-key, tls-cert, tls-ca] or none of them');
  });
});

test('prepareOptions.js - with tls', async t => {
  t.plan(3);

  prepareOptions({
    tlsKey: './certs/localhost.privkey.pem',
    tlsCert: './certs/localhost.cert.pem',
    tlsCa: './certs/ca.cert.pem'
  }).then(result => {
    t.equal(result.tls.key.constructor.name, 'Buffer', 'tls key was read');
    t.equal(result.tls.cert.constructor.name, 'Buffer', 'tls cert was read');
    t.equal(result.tls.ca.constructor.name, 'Array', 'tls ca was read');
  });
});

test('prepareOptions.js - join from dns', async t => {
  t.plan(1);

  prepareOptions({
    joinFromDns: 'localhost'
  }).then(result => {
    t.ok(result.join.length > 0, 'at least one item in join');
  });
});
