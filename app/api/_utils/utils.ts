import { keccak256 } from 'js-sha3';

export function combineHashes(hash1: string, hash2: string): string {
    return keccak256(hash2 + hash1);
}

function hashToInt(hash: string): number {
    let result = 0;
    for (let i = 0; i < hash.length; i++) {
        result += hash.charCodeAt(i);
    }
    return result;
}

function getProbabilityRange(multiplier: number): [number, number] {
    if (multiplier === 125) {
        return [65, 85];
    } else if (multiplier === 150) {
        return [45, 65];
    } else if (multiplier === 200) {
        return [20, 45];
    } else if (multiplier === 500) {
        return [1, 25];
    } else {
        return [20, 45]
    }
}

export const randomString = (length: number) => [...Array(length)].map(() => (~~(Math.random() * 36)).toString(36)).join('');

export function seededRandom(hash: string, multiplier: number, userInput: number): number {
    if (userInput !== 0 && userInput !== 1) {
        throw new Error('Invalid user input');
    }

    const hashBytes = keccak256(hash);
    const hashedSeed = hashToInt(hashBytes);
    const [minProb, maxProb] = getProbabilityRange(multiplier);

    const a = 1664525;
    const c = 1013904223;
    const m = 2 ** 32;

    const newSeed = (a * hashedSeed + c) % m;
    const randomValue = newSeed / m;

    const winProbability = (minProb + ((maxProb - minProb) * randomValue)) / 100;

    if (userInput === 0) {
        return randomValue < winProbability ? 0 : 1;
    } else {
        return randomValue >= winProbability ? 1 : 0;
    }
}