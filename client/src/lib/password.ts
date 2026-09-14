/** Readable temporary password: no ambiguous glyphs, always letters + digits (satisfies the schema). */
export function generateTemporaryPassword(length = 12): string {
    const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
    const digits = '23456789';
    const alphabet = letters + digits;
    const bytes = new Uint32Array(length);
    crypto.getRandomValues(bytes);
    const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]);
    // Guarantee at least one of each class.
    chars[0] = letters[bytes[0] % letters.length];
    chars[1] = digits[bytes[1] % digits.length];
    return chars.join('');
}
