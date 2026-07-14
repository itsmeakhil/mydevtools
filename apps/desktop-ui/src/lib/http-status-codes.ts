export type HttpStatusClass = '1xx' | '2xx' | '3xx' | '4xx' | '5xx'

export type HttpStatusCodeEntry = {
  code: number
  phrase: string
  description: string
  class: HttpStatusClass
  /** Optional RFC / spec pointer (e.g., RFC 9110) */
  spec?: string
}

function cls(code: number): HttpStatusClass {
  if (code >= 100 && code <= 199) return '1xx'
  if (code >= 200 && code <= 299) return '2xx'
  if (code >= 300 && code <= 399) return '3xx'
  if (code >= 400 && code <= 499) return '4xx'
  return '5xx'
}

export const HTTP_STATUS_CODES: HttpStatusCodeEntry[] = [
  // 1xx — Informational
  { code: 100, phrase: 'Continue', description: 'Server received the request headers; client should continue the request body.', class: cls(100), spec: 'RFC 9110' },
  { code: 101, phrase: 'Switching Protocols', description: 'Server is switching protocols as requested by the client (e.g., upgrading to WebSocket).', class: cls(101), spec: 'RFC 9110' },
  { code: 102, phrase: 'Processing', description: 'Server has accepted the request but has not completed it yet.', class: cls(102), spec: 'RFC 2518' },
  { code: 103, phrase: 'Early Hints', description: 'Provides hints about resources the client may preload while the server prepares a final response.', class: cls(103), spec: 'RFC 8297' },

  // 2xx — Success
  { code: 200, phrase: 'OK', description: 'Request succeeded. Response depends on method (GET returns representation, etc.).', class: cls(200), spec: 'RFC 9110' },
  { code: 201, phrase: 'Created', description: 'Request succeeded and a new resource was created.', class: cls(201), spec: 'RFC 9110' },
  { code: 202, phrase: 'Accepted', description: 'Request accepted for processing, but processing is not complete.', class: cls(202), spec: 'RFC 9110' },
  { code: 203, phrase: 'Non-Authoritative Information', description: 'Returned metadata may not be from the origin server (e.g., transformed by a proxy).', class: cls(203), spec: 'RFC 9110' },
  { code: 204, phrase: 'No Content', description: 'Request succeeded; no response body.', class: cls(204), spec: 'RFC 9110' },
  { code: 205, phrase: 'Reset Content', description: 'Request succeeded; client should reset the document view (e.g., clear a form).', class: cls(205), spec: 'RFC 9110' },
  { code: 206, phrase: 'Partial Content', description: 'Server is delivering only part of the resource due to a Range header.', class: cls(206), spec: 'RFC 9110' },
  { code: 207, phrase: 'Multi-Status', description: 'Provides status for multiple independent operations (WebDAV).', class: cls(207), spec: 'RFC 4918' },
  { code: 208, phrase: 'Already Reported', description: 'Members of a DAV binding have already been enumerated (WebDAV).', class: cls(208), spec: 'RFC 5842' },
  { code: 226, phrase: 'IM Used', description: 'Response is a representation resulting from one or more instance-manipulations.', class: cls(226), spec: 'RFC 3229' },

  // 3xx — Redirection
  { code: 300, phrase: 'Multiple Choices', description: 'Multiple representations exist; client may choose one (e.g., content negotiation).', class: cls(300), spec: 'RFC 9110' },
  { code: 301, phrase: 'Moved Permanently', description: 'Resource has a permanent new URI; future requests should use it.', class: cls(301), spec: 'RFC 9110' },
  { code: 302, phrase: 'Found', description: 'Resource temporarily at a different URI; client should use Location to redirect.', class: cls(302), spec: 'RFC 9110' },
  { code: 303, phrase: 'See Other', description: 'Direct client to retrieve the resource at another URI using GET.', class: cls(303), spec: 'RFC 9110' },
  { code: 304, phrase: 'Not Modified', description: 'Cached version is still valid (conditional request).', class: cls(304), spec: 'RFC 9110' },
  { code: 307, phrase: 'Temporary Redirect', description: 'Temporary redirect; method and body must not change.', class: cls(307), spec: 'RFC 9110' },
  { code: 308, phrase: 'Permanent Redirect', description: 'Permanent redirect; method and body must not change.', class: cls(308), spec: 'RFC 9110' },

  // 4xx — Client errors
  { code: 400, phrase: 'Bad Request', description: 'Server cannot process the request due to client error (malformed syntax, invalid message framing, etc.).', class: cls(400), spec: 'RFC 9110' },
  { code: 401, phrase: 'Unauthorized', description: 'Authentication is required and has failed or has not yet been provided.', class: cls(401), spec: 'RFC 9110' },
  { code: 402, phrase: 'Payment Required', description: 'Reserved for future use; sometimes used for paywalls.', class: cls(402), spec: 'RFC 9110' },
  { code: 403, phrase: 'Forbidden', description: 'Server understood request but refuses to authorize it.', class: cls(403), spec: 'RFC 9110' },
  { code: 404, phrase: 'Not Found', description: 'Requested resource could not be found.', class: cls(404), spec: 'RFC 9110' },
  { code: 405, phrase: 'Method Not Allowed', description: 'Method is not allowed for the resource; response should include Allow header.', class: cls(405), spec: 'RFC 9110' },
  { code: 406, phrase: 'Not Acceptable', description: 'No representation matches Accept headers sent by the client.', class: cls(406), spec: 'RFC 9110' },
  { code: 407, phrase: 'Proxy Authentication Required', description: 'Client must authenticate with the proxy.', class: cls(407), spec: 'RFC 9110' },
  { code: 408, phrase: 'Request Timeout', description: 'Server timed out waiting for the request.', class: cls(408), spec: 'RFC 9110' },
  { code: 409, phrase: 'Conflict', description: 'Request conflicts with the current state of the resource.', class: cls(409), spec: 'RFC 9110' },
  { code: 410, phrase: 'Gone', description: 'Resource is no longer available and will not be available again.', class: cls(410), spec: 'RFC 9110' },
  { code: 411, phrase: 'Length Required', description: 'Server requires a valid Content-Length header.', class: cls(411), spec: 'RFC 9110' },
  { code: 412, phrase: 'Precondition Failed', description: 'Preconditions in the request headers evaluated to false.', class: cls(412), spec: 'RFC 9110' },
  { code: 413, phrase: 'Content Too Large', description: 'Request payload is larger than the server is willing or able to process.', class: cls(413), spec: 'RFC 9110' },
  { code: 414, phrase: 'URI Too Long', description: 'URI is longer than the server is willing to interpret.', class: cls(414), spec: 'RFC 9110' },
  { code: 415, phrase: 'Unsupported Media Type', description: 'Content type is not supported for this resource.', class: cls(415), spec: 'RFC 9110' },
  { code: 416, phrase: 'Range Not Satisfiable', description: 'Requested range cannot be fulfilled for the resource.', class: cls(416), spec: 'RFC 9110' },
  { code: 417, phrase: 'Expectation Failed', description: 'Expectation in the Expect header could not be met.', class: cls(417), spec: 'RFC 9110' },
  { code: 418, phrase: "I'm a teapot", description: 'April Fools joke status code (Hyper Text Coffee Pot Control Protocol).', class: cls(418), spec: 'RFC 2324' },
  { code: 421, phrase: 'Misdirected Request', description: 'Request was directed at a server that is not able to produce a response.', class: cls(421), spec: 'RFC 9110' },
  { code: 422, phrase: 'Unprocessable Content', description: 'Server understands the content type and syntax but was unable to process contained instructions.', class: cls(422), spec: 'RFC 9110' },
  { code: 423, phrase: 'Locked', description: 'Resource is locked (WebDAV).', class: cls(423), spec: 'RFC 4918' },
  { code: 424, phrase: 'Failed Dependency', description: 'Request failed because it depended on another request that failed (WebDAV).', class: cls(424), spec: 'RFC 4918' },
  { code: 425, phrase: 'Too Early', description: 'Server is unwilling to risk processing a request that might be replayed.', class: cls(425), spec: 'RFC 8470' },
  { code: 426, phrase: 'Upgrade Required', description: 'Client should switch to a different protocol (e.g., TLS/1.3, WebSocket).', class: cls(426), spec: 'RFC 9110' },
  { code: 428, phrase: 'Precondition Required', description: 'Origin server requires the request to be conditional.', class: cls(428), spec: 'RFC 6585' },
  { code: 429, phrase: 'Too Many Requests', description: 'Rate limit exceeded; client should slow down.', class: cls(429), spec: 'RFC 6585' },
  { code: 431, phrase: 'Request Header Fields Too Large', description: 'Request header fields are too large.', class: cls(431), spec: 'RFC 6585' },
  { code: 451, phrase: 'Unavailable For Legal Reasons', description: 'Resource is unavailable due to legal demands.', class: cls(451), spec: 'RFC 7725' },

  // 5xx — Server errors
  { code: 500, phrase: 'Internal Server Error', description: 'Generic server error.', class: cls(500), spec: 'RFC 9110' },
  { code: 501, phrase: 'Not Implemented', description: 'Server does not support the functionality required to fulfill the request.', class: cls(501), spec: 'RFC 9110' },
  { code: 502, phrase: 'Bad Gateway', description: 'Server received an invalid response from an upstream server.', class: cls(502), spec: 'RFC 9110' },
  { code: 503, phrase: 'Service Unavailable', description: 'Server is temporarily unable to handle the request (overloaded or down for maintenance).', class: cls(503), spec: 'RFC 9110' },
  { code: 504, phrase: 'Gateway Timeout', description: 'Server did not receive a timely response from an upstream server.', class: cls(504), spec: 'RFC 9110' },
  { code: 505, phrase: 'HTTP Version Not Supported', description: 'Server does not support the HTTP version used in the request.', class: cls(505), spec: 'RFC 9110' },
  { code: 506, phrase: 'Variant Also Negotiates', description: 'Server has an internal configuration error (content negotiation).', class: cls(506), spec: 'RFC 2295' },
  { code: 507, phrase: 'Insufficient Storage', description: 'Server is unable to store the representation needed to complete the request (WebDAV).', class: cls(507), spec: 'RFC 4918' },
  { code: 508, phrase: 'Loop Detected', description: 'Server detected an infinite loop while processing the request (WebDAV).', class: cls(508), spec: 'RFC 5842' },
  { code: 510, phrase: 'Not Extended', description: 'Further extensions to the request are required for the server to fulfill it.', class: cls(510), spec: 'RFC 2774' },
  { code: 511, phrase: 'Network Authentication Required', description: 'Client needs to authenticate to gain network access (e.g., captive portal).', class: cls(511), spec: 'RFC 6585' },
].sort((a, b) => a.code - b.code)

