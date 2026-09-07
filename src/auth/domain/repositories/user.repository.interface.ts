import { User } from '../entities/user.entity';

export interface IUserRepository {
  findByUsername(username: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

export const USER_REPOSITORY = Symbol('IUserRepository');
