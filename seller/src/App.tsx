import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Layout from "./app/Layout";
import RoutesConfig from "./app/routes";
import type { Session } from "./types/session";
import { hasSessionToken, readSession } from "./auth/session";
import { getCurrentRole } from "./auth/roles";
import { sellerBackendApi } from "./lib/backendApi";

export default function App() {
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(() => readSession());
  const [workspaceReady, setWorkspaceReady] = useState<boolean>(() => !hasSessionToken(readSession()));
  const isLandingRoute = location.pathname === "/landing";

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSession(readSession());
  }, [location.key]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (event: StorageEvent) => {
      if (!event || event.key === null || event.key === "session") {
        setSession(readSession());
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!hasSessionToken(session)) {
      setWorkspaceReady(true);
      return () => {
        cancelled = true;
      };
    }

    setWorkspaceReady(false);
    void sellerBackendApi
      .ensureWorkspaceRole(getCurrentRole(session))
      .catch(() => null)
      .finally(() => {
        if (!cancelled) {
          setSession(readSession());
          setWorkspaceReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session?.accessToken, session?.token, session?.role]);

  const isAuthenticated =
    session && typeof session === "object" && Object.keys(session).length > 0;

  const onboardingPaths = ["/seller/onboarding", "/provider/onboarding"];
  const isOnboardingRoute = onboardingPaths.some((path) =>
    location.pathname.startsWith(path)
  );

  if (isAuthenticated && !workspaceReady) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <>
        <RoutesConfig session={null} />
      </>
    );
  }

  if (isLandingRoute) {
    return (
      <>
        <RoutesConfig session={session} />
      </>
    );
  }

  if (isOnboardingRoute) {
    return (
      <>
        <RoutesConfig session={session} />
      </>
    );
  }

  return (
    <>
      <Layout>
        <RoutesConfig session={session} />
      </Layout>
    </>
  );
}
