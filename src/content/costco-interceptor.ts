// Runs in MAIN world at document_start — wraps fetch AND XHR to capture the
// token Costco's own app uses for ecom-api calls, then stores it for our sync.
(function () {
  function tryCapture(url: string, headers: Record<string, string>) {
    if (!url.includes('ecom-api.costco.com')) return;
    const auth = headers['costco-x-authorization'] ?? headers['Authorization'] ?? '';
    const clientId = headers['costco-x-wcs-clientid'] ?? '';
    if (auth.startsWith('Bearer ') && clientId) {
      console.log('[CST-INT] captured ecom-api auth token');
      (window as Record<string, unknown>).__costcoAuth = { token: auth.slice(7), clientId };
    }
  }

  // Wrap fetch
  const origFetch = window.fetch.bind(window);
  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : (input as Request).url;
    if (init?.headers) tryCapture(url, init.headers as Record<string, string>);
    return origFetch(input, init);
  };

  // Wrap XHR in case Costco uses it
  const origOpen = XMLHttpRequest.prototype.open;
  const origSetHeader = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.open = function (method: string, url: string, ...rest: unknown[]) {
    (this as unknown as Record<string, unknown>).__xhrUrl = url;
    (this as unknown as Record<string, unknown>).__xhrHeaders = {};
    return (origOpen as Function).call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.setRequestHeader = function (name: string, value: string) {
    const self = this as unknown as Record<string, unknown>;
    (self.__xhrHeaders as Record<string, string>)[name.toLowerCase()] = value;
    tryCapture(
      (self.__xhrUrl as string) ?? '',
      { ...(self.__xhrHeaders as Record<string, string>), [name.toLowerCase()]: value },
    );
    return (origSetHeader as Function).call(this, name, value);
  };
})();
