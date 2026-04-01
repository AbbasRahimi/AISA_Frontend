import React from 'react';
import { Auth0Provider } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { getAuth0Config } from './auth0-config';

export default function Auth0ProviderWithNavigate({ children }) {
  const navigate = useNavigate();
  const config = getAuth0Config();

  const onRedirectCallback = (appState) => {
    const target = appState?.returnTo || window.location.pathname;
    // If user was bounced to /unauthorized before logging in, don't keep them there after login.
    const safeTarget = String(target || '/').startsWith('/unauthorized') ? '/' : target;
    navigate(safeTarget);
  };

  return (
    <Auth0Provider {...config} onRedirectCallback={onRedirectCallback}>
      {children}
    </Auth0Provider>
  );
}

