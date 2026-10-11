import { fileURLToPath } from 'node:url';

import { writeCi } from './write.ts';

await writeCi(fileURLToPath(new URL('../../', import.meta.url)), undefined, process.argv.includes('--check'));
