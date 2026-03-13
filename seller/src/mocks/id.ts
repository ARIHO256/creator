const HASH_SEED = 5381;

export const stableHash = (input: string) => {
  let hash = HASH_SEED;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
};

export const stableId = (prefix: string, seed: string) => {
  const hash = stableHash(seed);
  return `${prefix}_${hash}`;
};

export const makeId = (prefix = "id") => {
  const rand = Math.random().toString(36).slice(2, 8);
  const time = Date.now().toString(36);
  return `${prefix}_${time}_${rand}`;
};
