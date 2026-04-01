import React, { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useAuthz } from './AuthzContext';

export function RequireAuth({ children }) {
  const { isAuthenticated, isLoading, loginWithRedirect, error } = useAuth0();
  const location = useLocation();
  const redirectingRef = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) return;
    if (error) return;
    // If Auth0 redirected back with an error, don't auto-loop into another redirect.
    // Show the error state instead.
    const params = new URLSearchParams(location.search || '');
    if (params.get('error')) return;
    // If we're on the OAuth callback (code/state present), let the SDK finish processing.
    if (params.get('code') && params.get('state')) return;
    if (redirectingRef.current) return;
    redirectingRef.current = true;

    loginWithRedirect({
      appState: { returnTo: location.pathname + location.search + location.hash },
    }).catch(() => {
      // Allow retry if redirect fails for some reason
      redirectingRef.current = false;
    });
  }, [isAuthenticated, isLoading, loginWithRedirect, error, location.hash, location.pathname, location.search]);

  if (isLoading) return null;
  if (!isAuthenticated) {
    const params = new URLSearchParams(location.search || '');
    // While Auth0 is returning to the app (code/state present), show a stable "signing in" state.
    if (params.get('code') && params.get('state')) {
      return (
        <div className="container mt-4">
          <div className="alert alert-info" role="alert">
            Completing sign-in…
          </div>
        </div>
      );
    }
    if (error) {
      return (
        <div className="container mt-4">
          <div className="alert alert-danger" role="alert">
            <div className="fw-bold">Authentication error</div>
            <div className="mt-2 small">{error.message || String(error)}</div>
          </div>
        </div>
      );
    }
    const err = params.get('error');
    const desc = params.get('error_description');
    if (err) {
      return (
        <div className="container mt-4">
          <div className="alert alert-danger" role="alert">
            <div className="fw-bold">Authentication error: {err}</div>
            {desc ? <div className="mt-2 small">{decodeURIComponent(desc)}</div> : null}
          </div>
        </div>
      );
    }
    return null;
  }

  return children;
}

export function RequirePermission({ permission, children, fallback = null }) {
  const { permissions, meLoading, isAdmin } = useAuthz();

  if (meLoading) return null;
  if (!permission) return children;
  if (isAdmin) return children;
  if (permissions.has(permission)) return children;

  return fallback ?? <Navigate to="/unauthorized" replace />;
}

export function RequireAdmin({ children, fallback = null }) {
  const { isAdmin, meLoading } = useAuthz();
  if (meLoading) return null;
  if (isAdmin) return children;
  return fallback ?? <Navigate to="/unauthorized" replace />;
}

