// Runs in MAIN world at document_start — wraps fetch to capture the token
// Costco's own app uses for ecom-api calls, then stores it for our sync.
(function () {
  const orig = window.fetch.bind(window);
  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : (input as Request).url;
    if (url.includes('ecom-api.costco.com') && init?.headers) {
      const h = init.headers as Record<string, string>;
      const auth = h['costco-x-authorization'] ?? h['Authorization'] ?? '';
      const clientId = h['costco-x-wcs-clientid'] ?? '';
      if (auth.startsWith('Bearer ') && clientId) {
        (window as Record<string, unknown>).__costcoAuth = { token: auth.slice(7), clientId };
      }
    }
    return orig(input, init);
  };
})();
