let SESSION_MIN_SALT: bigint | null = null;

export function getSessionMinSalt(): bigint {
  if (SESSION_MIN_SALT == null) {
    // Compute process start time in seconds to anchor session at server boot
    const bootSec = Math.floor(Date.now() / 1000 - (process.uptime ? process.uptime() : 0));
    SESSION_MIN_SALT = BigInt(bootSec);
  }
  return SESSION_MIN_SALT;
}

export function setSessionMinSalt(secondsSinceEpoch: number) {
  SESSION_MIN_SALT = BigInt(Math.max(0, Math.floor(secondsSinceEpoch)));
} 