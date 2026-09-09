export interface JwtPayload {
  sub: string; // user id
  username: string;
  role: string;
  permissions?: string[];
}

export interface AccessToken {
  accessToken: string;
  expiresIn: string;
  tokenType: 'Bearer';
  user?: {
    id: string;
    username: string;
    role: string;
    permissions: string[];
  };
}

export interface ITokenIssuer {
  sign(payload: JwtPayload): AccessToken;
}

export const TOKEN_ISSUER = Symbol('ITokenIssuer');
