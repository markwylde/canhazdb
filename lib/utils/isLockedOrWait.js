async function isLockedOrWait (locks, keys, lockId, waitForUnlock) {
  const locked = locks.check(keys);

  if (!locked) {
    return false;
  }

  if (locked && locked[0] === lockId) {
    return false;
  }

  if (waitForUnlock) {
    try {
      await locks.wait(keys);
    } catch (error) {
      throw Object.assign(new Error('canhazdb cancelled all locks'), { status: 409 });
    }
    return false;
  }

  return true;
}

export default isLockedOrWait;
