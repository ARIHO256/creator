import { api } from "./api";
import type { AuthUserSession } from "./authSession";

type LoginBody = {
  email?: string;
  phone?: string;
  password: string;
};

type RegisterBody = {
  email?: string;
  phone?: string;
  password: string;
  name: string;
  handle?: string;
  role?: "CREATOR";
  roles?: Array<"CREATOR">;
};

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string | number;
  role: string;
  roles: string[];
};

type RegisterQueuedResponse = {
  registrationQueued: true;
  requestId: string;
  status: string;
  readyToLogin: boolean;
  failed?: boolean;
  pollAfterMs?: number;
  errorMessage?: string;
};

export const authApi = {
  login(body: LoginBody) {
    return api.post<LoginResponse>("/auth/login", body);
  },
  register(body: RegisterBody) {
    return api.post<LoginResponse | RegisterQueuedResponse>("/auth/register", body);
  },
  registerStatus(requestId: string) {
    return api.get<RegisterQueuedResponse>(`/auth/register/${requestId}/status`);
  },
  me() {
    return api.get<AuthUserSession>("/auth/me");
  },
  logout(refreshToken?: string) {
    return api.post<{ loggedOut: boolean }>("/auth/logout", refreshToken ? { refreshToken } : {});
  }
};
