export class InvalidCredentialsException extends Error {
  constructor() {
    super('Usuario o contraseña incorrectos');
    this.name = 'InvalidCredentialsException';
  }
}

export class UserInactiveException extends Error {
  constructor(username: string) {
    super(`El usuario ${username} está inactivo`);
    this.name = 'UserInactiveException';
  }
}
