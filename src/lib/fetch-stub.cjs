const _fetch = window.fetch.bind(window);
_fetch.fetch = _fetch;
_fetch.Headers = window.Headers;
_fetch.Request = window.Request;
_fetch.Response = window.Response;
_fetch.default = _fetch;
module.exports = _fetch;
