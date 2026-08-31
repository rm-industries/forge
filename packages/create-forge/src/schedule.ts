import { createHash } from 'node:crypto';

export const deriveScheduleMinutes = (packageName: string) => {
  const digest = createHash('sha256').update(packageName).digest();
  const security = 1 + (digest.readUInt8(0) % 59);
  const automation = 1 + ((security - 1 + 17 + (digest.readUInt8(1) % 29)) % 59);
  return { security, automation };
};
