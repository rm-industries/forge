import { writeCi } from '../../../templates/default/scripts/ci/write.ts';

/** Generate in staging; materialization owns conflict handling and rollback. */
export async function writeProjectCi(projectRoot: string, outputRoot: string, signal?: AbortSignal) {
  await writeCi(projectRoot, outputRoot, false, signal);
}
