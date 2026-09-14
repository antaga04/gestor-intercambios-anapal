import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

// Used to keep login timing constant when the user does not exist.
const DUMMY_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8Zt7t0bZ3bVYq3QIqzHw9wR2nO3rZa';

export function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string | undefined | null): Promise<boolean> {
    return bcrypt.compare(password, hash ?? DUMMY_HASH);
}
