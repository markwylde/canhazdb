import createTestServers from '../test/helpers/createTestServers.js';

async function main () {
  const servers = await createTestServers(1);
  console.log('server started', servers[0].clientConfig);
}

main();
