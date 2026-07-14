import { sortKeysDeep } from '../json-utils/sort';

describe('sortKeysDeep', () => {
    it('sorts object keys recursively, preserves array order', () => {
        const input = {
            b: { z: 1, a: [{ d: 1, c: 2 }, 3] },
            a: null,
        };
        expect(JSON.stringify(sortKeysDeep(input))).toBe(
            '{"a":null,"b":{"a":[{"c":2,"d":1},3],"z":1}}'
        );
    });

    it('passes through primitives', () => {
        expect(sortKeysDeep(42)).toBe(42);
        expect(sortKeysDeep('x')).toBe('x');
        expect(sortKeysDeep(null)).toBeNull();
    });
});
