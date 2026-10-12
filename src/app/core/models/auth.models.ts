export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  roles?: string[];
  /** Profile photo as a data URL, when one has been uploaded. */
  avatarUrl?: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}
