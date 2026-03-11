import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Layout from "./app/Layout";
import RoutesConfig from "./app/routes";
import { getCurrentRole } from "./auth/roles";
import type { Session } from "./types/session";
import { isValidSession, readSession } from "./auth/session";
import { needsOnboarding } from "./features/misc/onboardingStatus";

export default function App() {
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(() => readSession());
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

  const isAuthenticated = isValidSession(session);
  const role = getCurrentRole(session);
  const onboardingLocked = isAuthenticated && needsOnboarding(role, session);

  const onboardingPaths = ["/seller/onboarding", "/provider/onboarding"];
  const isOnboardingRoute = onboardingPaths.some((path) =>
    location.pathname.startsWith(path)
  );

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

  if (isOnboardingRoute || onboardingLocked) {
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
