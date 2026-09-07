export interface IPasswordHasher {
  hash(plainText: string): Promise<string>;
  compare(plainText: string, hash: string): Promise<boolean>;
}

export const PASSWORD_HASHER = Symbol('IPasswordHasher');
