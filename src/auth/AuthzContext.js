import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import apiService from '../services/api';
import { getAuth0Config } from './auth0-config';

const AuthzContext = createContext(null);

function parseRoleListish(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  const s = String(value).trim();
  if (!s) return [];
  // Common backend shape: "['Admin']"
  if (s.startsWith('[') && s.endsWith(']')) {
    const inner = s.slice(1, -1).trim();
    if (!inner) return [];
    return inner
      .split(',')
      .map((x) => x.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
  }
  return [s];
}

export function AuthzProvider({ children }) {
  const { isAuthenticated, isLoading, getAccessTokenSilently, user } = useAuth0();

  const [me, setMe] = useState(null);
  const [meLoading, setMeLoading] = useState(false);
  const [meError, setMeError] = useState(null);

  const audience = useMemo(() => {
    try {
      const cfg = getAuth0Config();
      return cfg?.authorizationParams?.audience || null;
    } catch (e) {
      return null;
    }
  }, []);

  useEffect(() => {
    apiService.setAccessTokenGetter(async () => {
      if (!isAuthenticated) return null;
      try {
        return await getAccessTokenSilently({
          authorizationParams: {
            ...(audience ? { audience } : {}),
          },
        });
      } catch (e) {
        // If we can't get an API token, don't attach anything.
        return null;
      }
    });
  }, [isAuthenticated, getAccessTokenSilently, audience]);

  useEffect(() => {
    let cancelled = false;

    async function loadMe() {
      if (!isAuthenticated) {
        setMe(null);
        setMeError(null);
        setMeLoading(false);
        return;
      }
      setMeLoading(true);
      setMeError(null);
      try {
        const data = await apiService.getMe();
        if (!cancelled) setMe(data);
      } catch (e) {
        // If backend returns 401 here, it means the API token is missing or rejected.
        if (!cancelled) {
          setMe(null);
          setMeError(e);
        }
      } finally {
        if (!cancelled) setMeLoading(false);
      }
    }

    if (!isLoading) loadMe();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading]);

  const permissions = useMemo(() => {
    // Backend can return permissions under different keys.
    const perms =
      me?.permissions ||
      me?.permission_names ||
      me?.scopes ||
      me?.access_keys ||
      [];
    if (Array.isArray(perms)) return new Set(perms.map(String));
    return new Set([]);
  }, [me]);

  const isAdmin = useMemo(() => {
    const roles = me?.roles ?? me?.role_names ?? me?.role ?? [];
    const parsed = parseRoleListish(roles);
    const fromRoles = parsed.some((r) => String(r).toLowerCase() === 'admin');
    const fromFlag = me?.is_admin === true;
    return Boolean(fromRoles || fromFlag);
  }, [me]);

  const value = useMemo(
    () => ({
      me,
      meLoading,
      meError,
      permissions,
      isAdmin,
      auth0User: user,
    }),
    [me, meLoading, meError, permissions, isAdmin, user]
  );

  return <AuthzContext.Provider value={value}>{children}</AuthzContext.Provider>;
}

export function useAuthz() {
  const ctx = useContext(AuthzContext);
  if (!ctx) throw new Error('useAuthz must be used inside AuthzProvider');
  return ctx;
}

