declare module 'netmask' {
  export class Netmask {
    constructor(net: string, mask?: string | number);
    bitmask: number;
    netLong: number;
    maskLong: number;
    size: number;
    base: string;
    mask: string;
    hostmask: string;
    first: string;
    last: string;
    broadcast: string | undefined;
    toString(): string;
  }
}
