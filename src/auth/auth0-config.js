export function getAuth0Config() {
  const rawDomain = process.env.REACT_APP_AUTH0_DOMAIN;
  const rawClientId = process.env.REACT_APP_AUTH0_CLIENT_ID;
  const rawAudience = process.env.REACT_APP_AUTH0_AUDIENCE;

  if (!rawDomain || !rawClientId) {
    throw new Error(
      'Missing Auth0 env vars. Set REACT_APP_AUTH0_DOMAIN and REACT_APP_AUTH0_CLIENT_ID (and optionally REACT_APP_AUTH0_AUDIENCE).'
    );
  }

  // Auth0 React SDK expects `domain` like: "dev-xxx.us.auth0.com" (no scheme, no trailing slash)
  const domain = String(rawDomain)
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/g, '');

  const clientId = String(rawClientId).trim();

  const audience = rawAudience != null && String(rawAudience).trim() !== '' ? String(rawAudience).trim() : null;

  return {
    domain,
    clientId,
    authorizationParams: {
      redirect_uri: window.location.origin,
      ...(audience ? { audience } : {}),
    },
    cacheLocation: 'localstorage',
    useRefreshTokens: true,
  };
}

