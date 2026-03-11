import { useEffect, useState } from "react";
import type { Session } from "../types/session";
import type { UserRole } from "../types/roles";

const SESSION_EVENT = "session-changed";

type SessionListener = () => void;

const VALID_ROLES: UserRole[] = ["seller", "provider"];

let inMemorySession: Session | null = null;

export const isValidSession = (session: Session | null | undefined): session is Session => {
  if (!session || typeof session !== "object") return false;
  const hasIdentity = [session.userId, session.email, session.phone].some(
    (value) => typeof value === "string" && value.trim().length > 0
  );
  if (!hasIdentity) return false;

  const role = session.role;
  if (typeof role !== "string" || !VALID_ROLES.includes(role as UserRole)) return false;

  if (session.roles != null) {
    if (!Array.isArray(session.roles) || session.roles.length === 0) return false;
    if (session.roles.some((entry) => typeof entry !== "string" || !VALID_ROLES.includes(entry as UserRole))) {
      return false;
    }
  }

  return true;
};

export const readSession = (): Session | null => {
  if (!isValidSession(inMemorySession)) {
    inMemorySession = null;
  }
  return inMemorySession;
};

export const writeSession = (session: Session | null) => {
  inMemorySession = session && isValidSession(session) ? session : null;
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new Event(SESSION_EVENT));
    } catch {
      // ignore dispatch errors
    }
  }
};

export const updateSession = (partial: Partial<Session>) => {
  const current = readSession() || ({} as Session);
  writeSession({ ...current, ...partial });
};

export const useSession = () => {
  const [session, setSession] = useState<Session | null>(() => readSession());

  useEffect(() => {
    const sync: SessionListener = () => setSession(readSession());
    if (typeof window === "undefined") return;
    window.addEventListener(SESSION_EVENT, sync);
    return () => {
      window.removeEventListener(SESSION_EVENT, sync);
    };
  }, []);

  return session;
};

export const clearSession = () => writeSession(null);
