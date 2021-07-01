import tcpocket from 'tcpocket';
import fs from 'fs';
import c from '../lib/constants.js';

const tls = {
  key: fs.readFileSync('./certs/localhost.privkey.pem'),
  cert: fs.readFileSync('./certs/localhost.cert.pem'),
  ca: [fs.readFileSync('./certs/ca.cert.pem')],
  requestCert: true
};

const metrics = {};
setInterval(() => {
  console.log(metrics);
}, 500);

async function main () {
  let count = 0;
  const client = tcpocket.createClient({
    host: 'localhost',
    port: 11001,
    ...tls
  });
  await client.waitUntilConnected();

  await Promise.all([
    client.send(c.POST, {
      [c.COLLECTION_ID]: 'tests',
      [c.DATA]: {
        foo: 'bar1'
      }
    }),
    client.send(c.POST, {
      [c.COLLECTION_ID]: 'tests',
      [c.DATA]: {
        foo: 'bar2'
      }
    }),
    client.send(c.POST, {
      [c.COLLECTION_ID]: 'tests',
      [c.DATA]: {
        foo: 'bar3'
      }
    })
  ]);

  async function run () {
    const promises = [];
    for (let x = 0; x < 2000; x++) {
      promises.push(
        client.send(c.POST, {
          [c.COLLECTION_ID]: 'tests',
          [c.DATA]: {
            foo: 'bar' + x
          }
        }).then((r) => {
          count = count + 1;
          const seconds = Math.floor(Date.now() / 1000);
          metrics[seconds] = metrics[seconds] || 0;
          metrics[seconds] = metrics[seconds] + 1;
        })

        // client.send(c.GET, {
        //   [c.COLLECTION_ID]: 'tests'
        // }).then((r) => {
        //   count = count + 1;
        //   const seconds = Math.floor(Date.now() / 1000);
        //   metrics[seconds] = metrics[seconds] || 0;
        //   metrics[seconds] = metrics[seconds] + 1;
        // })
      );
    }

    await Promise.all(promises);

    setTimeout(run);
  }
  run();
  // client.close();

  // setTimeout(function () {
  //   log() // logs out active handles that are keeping node running
  // }, 100)
}

main();
