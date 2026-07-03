import { computeBcrypt } from '@/lib/hash-digest';

export type BcryptWorkerRequest = {
  id: number;
  password: string;
  rounds: number;
};

export type BcryptWorkerResponse =
  | { id: number; hash: string }
  | { id: number; error: string };

self.onmessage = async (event: MessageEvent<BcryptWorkerRequest>) => {
  const { id, password, rounds } = event.data;
  let response: BcryptWorkerResponse;
  try {
    response = { id, hash: await computeBcrypt(password, rounds) };
  } catch (error) {
    response = { id, error: error instanceof Error ? error.message : String(error) };
  }
  self.postMessage(response);
};
