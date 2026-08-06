import {
  getAccessToken,
  evictToken,
  firestoreFetch,
  listCollectionIds,
  listDocuments,
  patchDocument,
  FirestoreApiError,
  type ServiceAccount,
  type FirestoreConfig,
} from "../firestore-api";
import { signJwt } from "@/lib/auth/jwt-bearer";

jest.mock("@/lib/auth/jwt-bearer", () => ({
  signJwt: jest.fn(async () => "signed-assertion"),
}));

const sa = (email: string): ServiceAccount => ({
  projectId: "my-proj",
  clientEmail: email,
  privateKey: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n",
});

const CONFIG: FirestoreConfig = {
  serviceAccountJson: JSON.stringify({
    type: "service_account",
    project_id: "my-proj",
    client_email: "cfg@my-proj.iam.gserviceaccount.com",
    private_key: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n",
  }),
  databaseId: "(default)",
};

const jsonResponse = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

const tokenResponse = (token = "tok-1") =>
  jsonResponse(200, { access_token: token, expires_in: 3600 });

let fetchMock: jest.Mock;
beforeEach(() => {
  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
  jest.clearAllMocks();
  // The module-level token cache is keyed by clientEmail|projectId and
  // survives between tests — evict CONFIG's entry so every test starts
  // with a token exchange.
  evictToken({
    projectId: "my-proj",
    clientEmail: "cfg@my-proj.iam.gserviceaccount.com",
    privateKey: "",
  });
});

describe("getAccessToken", () => {
  test("exchanges a signed JWT at the token endpoint", async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse("tok-A"));
    const token = await getAccessToken(sa("a@x.iam"), 1_000_000);
    expect(token).toBe("tok-A");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://oauth2.googleapis.com/token");
    expect(String(init.body)).toContain("grant_type=urn");
    expect(String(init.body)).toContain("assertion=signed-assertion");
  });

  test("backdates iat by 60 seconds", async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse());
    await getAccessToken(sa("b@x.iam"), 2_000_000);
    const opts = (signJwt as jest.Mock).mock.calls[0][0];
    expect(opts.claims.iat).toBe(Math.floor(2_000_000 / 1000) - 60);
    expect(opts.claims.extra.scope).toBe("https://www.googleapis.com/auth/datastore");
  });

  test("caches the token until the 5-minute margin, then refreshes", async () => {
    fetchMock.mockResolvedValue(tokenResponse("tok-C"));
    const acct = sa("c@x.iam");
    await getAccessToken(acct, 0);
    await getAccessToken(acct, 3_000_000); // 50 min in, > 5 min left
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await getAccessToken(acct, 3_400_000); // < 5 min left
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("evictToken forces a refresh", async () => {
    fetchMock.mockResolvedValue(tokenResponse());
    const acct = sa("d@x.iam");
    await getAccessToken(acct, 0);
    evictToken(acct);
    await getAccessToken(acct, 1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("maps invalid_grant iat wording to clockSkew and never caches failures", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, {
        error: "invalid_grant",
        error_description: "Invalid JWT: iat must be in the past",
      }),
    );
    const acct = sa("e@x.iam");
    await expect(getAccessToken(acct, 0)).rejects.toMatchObject({ kind: "clockSkew" });
    fetchMock.mockResolvedValueOnce(tokenResponse());
    await expect(getAccessToken(acct, 1)).resolves.toBe("tok-1");
  });

  test("maps disabled/deleted account wording to serviceAccountRejected", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, {
        error: "invalid_grant",
        error_description: "Client is disabled",
      }),
    );
    await expect(getAccessToken(sa("f@x.iam"), 0)).rejects.toMatchObject({
      kind: "serviceAccountRejected",
    });
  });

  test("maps other failures to auth and network errors to network", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, { error: "invalid_client", error_description: "nope" }),
    );
    await expect(getAccessToken(sa("g@x.iam"), 0)).rejects.toMatchObject({ kind: "auth" });
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(getAccessToken(sa("h@x.iam"), 0)).rejects.toMatchObject({
      kind: "network",
    });
  });
});

describe("firestoreFetch", () => {
  test("sends a bearer request and returns the JSON body", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse("tok-F"))
      .mockResolvedValueOnce(jsonResponse(200, { hello: 1 }));
    const out = await firestoreFetch(CONFIG, "GET", "projects/my-proj/databases/(default)");
    expect(out).toEqual({ hello: 1 });
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe(
      "https://firestore.googleapis.com/v1/projects/my-proj/databases/(default)",
    );
    expect(init.headers.Authorization).toBe("Bearer tok-F");
  });

  test("on 401 evicts the token and retries exactly once", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse("stale"))
      .mockResolvedValueOnce(jsonResponse(401, { error: { status: "UNAUTHENTICATED", message: "expired" } }))
      .mockResolvedValueOnce(tokenResponse("fresh"))
      .mockResolvedValueOnce(jsonResponse(200, { ok: 1 }));
    const out = await firestoreFetch(CONFIG, "GET", "x");
    expect(out).toEqual({ ok: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[3][1].headers.Authorization).toBe("Bearer fresh");
  });

  test("throws a mapped FirestoreApiError on non-OK responses", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(
        jsonResponse(403, { error: { status: "PERMISSION_DENIED", message: "denied" } }),
      );
    await expect(firestoreFetch(CONFIG, "GET", "x")).rejects.toMatchObject({
      kind: "permissionDenied",
    });
  });

  test("rejects an invalid service account without any network call", async () => {
    await expect(
      firestoreFetch({ serviceAccountJson: "{bad", databaseId: "(default)" }, "GET", "x"),
    ).rejects.toBeInstanceOf(FirestoreApiError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("API methods", () => {
  test("listCollectionIds loops page tokens and supports a parent doc path", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(
        jsonResponse(200, { collectionIds: ["a", "b"], nextPageToken: "p2" }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { collectionIds: ["c"] }));
    const ids = await listCollectionIds(CONFIG, "users/u1");
    expect(ids).toEqual(["a", "b", "c"]);
    const firstUrl = fetchMock.mock.calls[1][0] as string;
    expect(firstUrl).toContain(
      "projects/my-proj/databases/(default)/documents/users/u1:listCollectionIds",
    );
    const secondBody = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(secondBody.pageToken).toBe("p2");
  });

  test("listDocuments passes pageSize/pageToken and returns nextPageToken", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(
        jsonResponse(200, {
          documents: [{ name: "projects/p/databases/(default)/documents/users/u1" }],
          nextPageToken: "next",
        }),
      );
    const out = await listDocuments(CONFIG, "users", 25, "tok");
    expect(out.documents).toHaveLength(1);
    expect(out.nextPageToken).toBe("next");
    const url = fetchMock.mock.calls[1][0] as string;
    expect(url).toContain("/documents/users?");
    expect(url).toContain("pageSize=25");
    expect(url).toContain("pageToken=tok");
  });

  test("patchDocument repeats updateMask.fieldPaths query params", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(jsonResponse(200, { name: "n" }));
    await patchDocument(CONFIG, "users/u1", { a: { integerValue: "1" } }, ["a", "`b c`"]);
    const [url, init] = fetchMock.mock.calls[1];
    expect(init.method).toBe("PATCH");
    const params = new URL(url as string).searchParams.getAll("updateMask.fieldPaths");
    expect(params).toEqual(["a", "`b c`"]);
  });
});
