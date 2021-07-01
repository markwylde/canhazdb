import repl from 'repl';
import c from './constants.js';

async function startRepl (context) {
  console.log('\nInteractive REPL:');
  process.on('unhandledRejection', (error) => {
    console.log(error);
    const r = repl.start('> ');

    Object.assign(r.context, { context });
    Object.assign(r.context, c);
    Object.assign(r.context, { c });
  });

  const r = repl.start('> ');

  Object.assign(r.context, { context });
  Object.assign(r.context, c);
  Object.assign(r.context, { c });
}

export default startRepl;
