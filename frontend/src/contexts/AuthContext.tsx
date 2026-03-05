import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { useLocation } from "react-router-dom";
import { apiClient } from "../api/client";
import {
  clearStoredApiSession,
  clearStoredAuthSession,
  deriveFrontendUserStatus,
  hasLegacyAuthBridgeSignal,
  persistAuthSession,
  persistAuthUser,
  readAuthToken,
  readStoredAuthUser,
  readStoredUserStatus
} from "../api/storage";
import type { AppRole, AuthSession, AuthUser, FrontendUserStatus, LoginInput, RegisterInput } from "../api/types";

type AuthMode = "none" | "api" | "legacy";
type AuthPhase = "booting" | "ready";

interface AuthState {
  phase: AuthPhase;
  mode: AuthMode;
  token: string | null;
  user: AuthUser | null;
  lastError: unknown;
}

interface AuthContextValue {
  phase: AuthPhase;
  mode: AuthMode;
  token: string | null;
  user: AuthUser | null;
  isReady: boolean;
  isAuthenticated: boolean;
  hasApiSession: boolean;
  isPendingLegacyBridge: boolean;
  userStatus: FrontendUserStatus;
  lastError: unknown;
  login: (payload: LoginInput) => Promise<AuthSession>;
  register: (payload: RegisterInput) => Promise<AuthSession>;
  logout: () => Promise<void>;
  refresh: () => Promise<AuthUser | null>;
  switchRole: (role: AppRole) => Promise<AuthUser | null>;
  devSignIn: () => Promise<AuthSession | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function createInitialState(): AuthState {
  const token = readAuthToken();
  const user = readStoredAuthUser();

  if (token) {
    return {
      phase: "booting",
      mode: "api",
      token,
      user,
      lastError: null
    };
  }

  if (hasLegacyAuthBridgeSignal()) {
    return {
      phase: "booting",
      mode: "none",
      token: null,
      user,
      lastError: null
    };
  }

  return {
    phase: "ready",
    mode: "none",
    token: null,
    user: null,
    lastError: null
  };
}

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const location = useLocation();
  const [state, setState] = useState<AuthState>(createInitialState);
  const legacyBridgeInFlightRef = useRef(false);

  const applyApiSession = useCallback((session: AuthSession) => {
    persistAuthSession(session);
    setState({
      phase: "ready",
      mode: "api",
      token: session.token,
      user: session.user,
      lastError: null
    });
  }, []);

  const fallbackToLegacyMode = useCallback((error: unknown) => {
    setState({
      phase: "ready",
      mode: "legacy",
      token: null,
      user: readStoredAuthUser(),
      lastError: error
    });
  }, []);

  const devSignIn = useCallback(async (): Promise<AuthSession | null> => {
    const bridgeEnabled = (import.meta.env.VITE_MLDZ_ENABLE_DEV_AUTH_BRIDGE as string | undefined) !== "false";
    if (!bridgeEnabled) return null;

    const credentials: LoginInput = {
      email: (import.meta.env.VITE_MLDZ_DEV_EMAIL as string | undefined) ?? "creator@mylivedealz.com",
      password: (import.meta.env.VITE_MLDZ_DEV_PASSWORD as string | undefined) ?? "Password123!"
    };

    const session = await apiClient.login(credentials);
    applyApiSession(session);
    return session;
  }, [applyApiSession]);

  const refresh = useCallback(async (): Promise<AuthUser | null> => {
    const token = readAuthToken();
    if (!token) {
      return null;
    }

    const response = await apiClient.getMe();
    persistAuthUser(response.user);
    setState((previous) => ({
      ...previous,
      phase: "ready",
      mode: "api",
      token,
      user: response.user,
      lastError: null
    }));
    return response.user;
  }, []);

  const switchRole = useCallback(async (role: AppRole): Promise<AuthUser | null> => {
    const token = readAuthToken();
    if (!token) return null;

    const response = await apiClient.switchRole(role);
    persistAuthUser(response.user);
    setState((previous) => ({
      ...previous,
      phase: "ready",
      mode: "api",
      token,
      user: response.user,
      lastError: null
    }));
    return response.user;
  }, []);

  const login = useCallback(
    async (payload: LoginInput): Promise<AuthSession> => {
      const session = await apiClient.login(payload);
      applyApiSession(session);
      return session;
    },
    [applyApiSession]
  );

  const register = useCallback(
    async (payload: RegisterInput): Promise<AuthSession> => {
      const session = await apiClient.register(payload);
      applyApiSession(session);
      return session;
    },
    [applyApiSession]
  );

  const logout = useCallback(async () => {
    try {
      if (state.mode === "api" && state.token) {
        await apiClient.logout();
      }
    } catch {
      // Even if logout fails remotely, clear local session state.
    } finally {
      clearStoredAuthSession();
      setState({
        phase: "ready",
        mode: "none",
        token: null,
        user: null,
        lastError: null
      });
    }
  }, [state.mode, state.token]);

  useEffect(() => {
    if (state.phase !== "booting") return;

    let cancelled = false;

    const boot = async () => {
      if (state.token) {
        try {
          const response = await apiClient.getMe();
          if (cancelled) return;

          persistAuthUser(response.user);
          setState({
            phase: "ready",
            mode: "api",
            token: state.token,
            user: response.user,
            lastError: null
          });
          return;
        } catch (error) {
          const hadLegacySignal = hasLegacyAuthBridgeSignal();
          if (hadLegacySignal) {
            clearStoredApiSession();
            if (!cancelled) {
              fallbackToLegacyMode(error);
            }
            return;
          }

          clearStoredAuthSession();

          if (!cancelled) {
            setState({
              phase: "ready",
              mode: "none",
              token: null,
              user: null,
              lastError: error
            });
          }
          return;
        }
      }

      if (hasLegacyAuthBridgeSignal()) {
        legacyBridgeInFlightRef.current = true;
        try {
          const session = await devSignIn();
          if (cancelled) return;

          if (session) {
            return;
          }

          fallbackToLegacyMode(null);
        } catch (error) {
          if (!cancelled) {
            fallbackToLegacyMode(error);
          }
        } finally {
          legacyBridgeInFlightRef.current = false;
        }
        return;
      }

      if (!cancelled) {
        setState({
          phase: "ready",
          mode: "none",
          token: null,
          user: null,
          lastError: null
        });
      }
    };

    void boot();

    return () => {
      cancelled = true;
    };
  }, [devSignIn, fallbackToLegacyMode, state.phase, state.token]);

  useEffect(() => {
    if (state.phase === "booting") return;
    if (state.mode !== "none") return;
    if (!hasLegacyAuthBridgeSignal()) return;
    if (legacyBridgeInFlightRef.current) return;

    setState((previous) => ({
      ...previous,
      phase: "booting"
    }));
  }, [location.pathname, state.mode, state.phase]);

  const isPendingLegacyBridge = state.mode === "none" && state.phase === "ready" && hasLegacyAuthBridgeSignal();

  const userStatus = useMemo<FrontendUserStatus>(() => {
    if (state.mode === "legacy") {
      return readStoredUserStatus();
    }

    if (!state.user) {
      return isPendingLegacyBridge ? readStoredUserStatus() : "GUEST";
    }

    return deriveFrontendUserStatus(state.user);
  }, [isPendingLegacyBridge, state.mode, state.user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      phase: state.phase,
      mode: state.mode,
      token: state.token,
      user: state.user,
      isReady: state.phase === "ready",
      isAuthenticated: state.mode === "api" || state.mode === "legacy",
      hasApiSession: state.mode === "api" && Boolean(state.token),
      isPendingLegacyBridge,
      userStatus,
      lastError: state.lastError,
      login,
      register,
      logout,
      refresh,
      switchRole,
      devSignIn
    }),
    [devSignIn, isPendingLegacyBridge, login, logout, refresh, register, state, switchRole, userStatus]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return context;
}
