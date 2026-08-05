import {
  parseServiceAccount,
  decodeFields,
  decodeValue,
  encodeFields,
  encodeValue,
  escapeFieldPath,
  buildUpdateMask,
  buildStructuredQuery,
  mapFirestoreError,
  sanitizeFirestoreError,
  FirestoreApiError,
  type FirestoreValue,
} from "../firestore-api";

const VALID_SA = {
  type: "service_account",
  project_id: "my-proj",
  client_email: "svc@my-proj.iam.gserviceaccount.com",
  private_key:
    "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBg\n-----END PRIVATE KEY-----\n",
};

describe("parseServiceAccount", () => {
  test("parses a valid service account", () => {
    const res = parseServiceAccount(JSON.stringify(VALID_SA));
    expect(res).toEqual({
      projectId: "my-proj",
      clientEmail: "svc@my-proj.iam.gserviceaccount.com",
      privateKey: VALID_SA.private_key,
    });
  });

  test("rejects unparseable JSON", () => {
    expect(parseServiceAccount("{nope")).toEqual({
      errorKey: "validation.serviceAccountInvalidJson",
    });
  });

  test("rejects non-service-account type", () => {
    const res = parseServiceAccount(
      JSON.stringify({ ...VALID_SA, type: "authorized_user" }),
    );
    expect(res).toEqual({
      errorKey: "validation.serviceAccountNotServiceAccount",
    });
  });

  test("rejects missing project_id or client_email", () => {
    expect(
      parseServiceAccount(JSON.stringify({ ...VALID_SA, project_id: "" })),
    ).toEqual({ errorKey: "validation.serviceAccountNotServiceAccount" });
    const { client_email: _drop, ...rest } = VALID_SA;
    expect(parseServiceAccount(JSON.stringify(rest))).toEqual({
      errorKey: "validation.serviceAccountNotServiceAccount",
    });
  });

  test("normalizes a double-escaped private key", () => {
    const doubleEscaped = {
      ...VALID_SA,
      private_key:
        "-----BEGIN PRIVATE KEY-----\\nMIIEvAIBADANBg\\n-----END PRIVATE KEY-----\\n",
    };
    const res = parseServiceAccount(JSON.stringify(doubleEscaped));
    expect("privateKey" in res && res.privateKey).toBe(VALID_SA.private_key);
  });

  test("rejects a non-PKCS#8 key", () => {
    const res = parseServiceAccount(
      JSON.stringify({
        ...VALID_SA,
        private_key: "-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----\n",
      }),
    );
    expect(res).toEqual({ errorKey: "validation.serviceAccountBadKey" });
  });
});

// A document containing every Firestore value type.
const ALL_TYPES_FIELDS: Record<string, FirestoreValue> = {
  s: { stringValue: "hello" },
  n: { nullValue: null },
  b: { booleanValue: true },
  i: { integerValue: "42" },
  bigI: { integerValue: "9007199254740993" },
  d: { doubleValue: 1.5 },
  nan: { doubleValue: "NaN" },
  inf: { doubleValue: "Infinity" },
  ts: { timestampValue: "2026-01-02T03:04:05.678Z" },
  ref: { referenceValue: "projects/p/databases/(default)/documents/users/u1" },
  bytes: { bytesValue: "aGVsbG8=" },
  geo: { geoPointValue: { latitude: 1.5, longitude: -2.5 } },
  arr: {
    arrayValue: {
      values: [{ integerValue: "1" }, { stringValue: "two" }],
    },
  },
  map: {
    mapValue: {
      fields: { inner: { doubleValue: 2 } },
    },
  },
};

describe("codec: decode", () => {
  test("decodes every value type to plain JSON", () => {
    expect(decodeFields(ALL_TYPES_FIELDS)).toEqual({
      s: "hello",
      n: null,
      b: true,
      i: 42,
      bigI: "9007199254740993",
      d: 1.5,
      nan: "NaN",
      inf: "Infinity",
      ts: "2026-01-02T03:04:05.678Z",
      ref: "projects/p/databases/(default)/documents/users/u1",
      bytes: "aGVsbG8=",
      geo: { latitude: 1.5, longitude: -2.5 },
      arr: [1, "two"],
      map: { inner: 2 },
    });
  });

  test("decodes an empty arrayValue and mapValue", () => {
    expect(decodeValue({ arrayValue: {} })).toEqual([]);
    expect(decodeValue({ mapValue: {} })).toEqual({});
  });
});

describe("codec: encode round-trip", () => {
  test("unchanged fields re-encode to the original values verbatim", () => {
    const plain = decodeFields(ALL_TYPES_FIELDS);
    expect(encodeFields(plain, ALL_TYPES_FIELDS)).toEqual(ALL_TYPES_FIELDS);
  });

  test("sticky type: edited timestamp string stays a timestampValue", () => {
    expect(
      encodeValue("2027-05-05T00:00:00Z", { timestampValue: "2026-01-01T00:00:00Z" }),
    ).toEqual({ timestampValue: "2027-05-05T00:00:00Z" });
  });

  test("sticky type: edited reference and bytes stay typed", () => {
    expect(
      encodeValue("projects/p/databases/(default)/documents/users/u2", {
        referenceValue: "projects/p/databases/(default)/documents/users/u1",
      }),
    ).toEqual({
      referenceValue: "projects/p/databases/(default)/documents/users/u2",
    });
    expect(encodeValue("d29ybGQ=", { bytesValue: "aGVsbG8=" })).toEqual({
      bytesValue: "d29ybGQ=",
    });
  });

  test("sticky type: double edited to an integer number stays a double", () => {
    expect(encodeValue(3, { doubleValue: 2 })).toEqual({ doubleValue: 3 });
  });

  test("sticky type: integer edited to another integer stays an integer", () => {
    expect(encodeValue(7, { integerValue: "42" })).toEqual({ integerValue: "7" });
  });

  test("sticky type: geopoint edited via {latitude, longitude} stays a geopoint", () => {
    expect(
      encodeValue({ latitude: 9, longitude: 8 }, { geoPointValue: { latitude: 1, longitude: 2 } }),
    ).toEqual({ geoPointValue: { latitude: 9, longitude: 8 } });
  });

  test("inference for new fields", () => {
    expect(encodeValue(null)).toEqual({ nullValue: null });
    expect(encodeValue(false)).toEqual({ booleanValue: false });
    expect(encodeValue(5)).toEqual({ integerValue: "5" });
    expect(encodeValue(5.5)).toEqual({ doubleValue: 5.5 });
    expect(encodeValue("hi")).toEqual({ stringValue: "hi" });
    expect(encodeValue([1, "a"])).toEqual({
      arrayValue: { values: [{ integerValue: "1" }, { stringValue: "a" }] },
    });
    expect(encodeValue({ k: true })).toEqual({
      mapValue: { fields: { k: { booleanValue: true } } },
    });
  });

  test("array elements keep sticky types positionally", () => {
    const original: FirestoreValue = {
      arrayValue: { values: [{ doubleValue: 1 }, { timestampValue: "2026-01-01T00:00:00Z" }] },
    };
    expect(encodeValue([2, "2027-01-01T00:00:00Z"], original)).toEqual({
      arrayValue: { values: [{ doubleValue: 2 }, { timestampValue: "2027-01-01T00:00:00Z" }] },
    });
  });

  test("map entries keep sticky types by key", () => {
    const original: FirestoreValue = {
      mapValue: { fields: { d: { doubleValue: 1 } } },
    };
    expect(encodeValue({ d: 4, extra: "x" }, original)).toEqual({
      mapValue: {
        fields: { d: { doubleValue: 4 }, extra: { stringValue: "x" } },
      },
    });
  });
});

describe("escapeFieldPath", () => {
  test("passes plain identifiers through", () => {
    expect(escapeFieldPath("userName_2")).toBe("userName_2");
    expect(escapeFieldPath("_private")).toBe("_private");
  });

  test("backtick-wraps non-identifier segments", () => {
    expect(escapeFieldPath("weird.key")).toBe("`weird.key`");
    expect(escapeFieldPath("key with space")).toBe("`key with space`");
    expect(escapeFieldPath("2starts-with-digit")).toBe("`2starts-with-digit`");
  });

  test("escapes backticks and backslashes inside wrapped segments", () => {
    expect(escapeFieldPath("back`tick")).toBe("`back\\`tick`");
    expect(escapeFieldPath("back\\slash")).toBe("`back\\\\slash`");
  });
});

describe("buildUpdateMask", () => {
  test("unions new and original top-level keys so deleted fields are removed", () => {
    const mask = buildUpdateMask(
      { kept: 1, added: 2 },
      { kept: { integerValue: "1" }, removed: { stringValue: "x" } },
    );
    expect(mask.sort()).toEqual(["added", "kept", "removed"]);
  });

  test("escapes non-identifier keys", () => {
    const mask = buildUpdateMask({ "weird.key": 1 }, {});
    expect(mask).toEqual(["`weird.key`"]);
  });
});

describe("buildStructuredQuery", () => {
  test("builds filter + orderBy + limit", () => {
    expect(
      buildStructuredQuery({
        collectionId: "users",
        filterField: "age",
        filterOp: ">=",
        filterValue: "21",
        orderByField: "age",
        orderByDir: "desc",
        limit: 50,
      }),
    ).toEqual({
      from: [{ collectionId: "users" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "age" },
          op: "GREATER_THAN_OR_EQUAL",
          value: { integerValue: "21" },
        },
      },
      orderBy: [{ field: { fieldPath: "age" }, direction: "DESCENDING" }],
      limit: 50,
    });
  });

  test("null value becomes a unary IS_NULL filter", () => {
    expect(
      buildStructuredQuery({
        collectionId: "users",
        filterField: "deletedAt",
        filterOp: "==",
        filterValue: "null",
        orderByField: "",
        orderByDir: "asc",
        limit: 25,
      }),
    ).toEqual({
      from: [{ collectionId: "users" }],
      where: {
        unaryFilter: { field: { fieldPath: "deletedAt" }, op: "IS_NULL" },
      },
      limit: 25,
    });
  });

  test("infers value literals: bool, double, quoted string", () => {
    const q = (v: string) =>
      buildStructuredQuery({
        collectionId: "c",
        filterField: "f",
        filterOp: "==",
        filterValue: v,
        orderByField: "",
        orderByDir: "asc",
        limit: 10,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any;
    expect(q("true").where.fieldFilter.value).toEqual({ booleanValue: true });
    expect(q("1.5").where.fieldFilter.value).toEqual({ doubleValue: 1.5 });
    expect(q('"42"').where.fieldFilter.value).toEqual({ stringValue: "42" });
    expect(q("plain").where.fieldFilter.value).toEqual({ stringValue: "plain" });
  });

  test("'in' op splits comma-separated values into an arrayValue", () => {
    const q = buildStructuredQuery({
      collectionId: "c",
      filterField: "status",
      filterOp: "in",
      filterValue: "a, b, 3",
      orderByField: "",
      orderByDir: "asc",
      limit: 10,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;
    expect(q.where.fieldFilter).toEqual({
      field: { fieldPath: "status" },
      op: "IN",
      value: {
        arrayValue: {
          values: [{ stringValue: "a" }, { stringValue: "b" }, { integerValue: "3" }],
        },
      },
    });
  });

  test("no filter and no orderBy yields only from + limit", () => {
    expect(
      buildStructuredQuery({
        collectionId: "c",
        filterField: "",
        filterOp: "==",
        filterValue: "",
        orderByField: "",
        orderByDir: "asc",
        limit: 25,
      }),
    ).toEqual({ from: [{ collectionId: "c" }], limit: 25 });
  });

  test("dotted field paths escape each segment", () => {
    const q = buildStructuredQuery({
      collectionId: "c",
      filterField: "address.zip code",
      filterOp: "==",
      filterValue: "x",
      orderByField: "",
      orderByDir: "asc",
      limit: 10,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;
    expect(q.where.fieldFilter.field.fieldPath).toBe("address.`zip code`");
  });
});

describe("mapFirestoreError", () => {
  const body = (status: string, message: string, details?: unknown[]) => ({
    error: { code: 0, status, message, details },
  });

  test("SERVICE_DISABLED yields serviceDisabled with activationUrl", () => {
    const err = mapFirestoreError(
      403,
      body("PERMISSION_DENIED", "Firestore API has not been used", [
        {
          "@type": "type.googleapis.com/google.rpc.ErrorInfo",
          reason: "SERVICE_DISABLED",
          metadata: {
            activationUrl:
              "https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=my-proj",
          },
        },
      ]),
    );
    expect(err.kind).toBe("serviceDisabled");
    expect(err.activationUrl).toContain("console.developers.google.com");
  });

  test("plain PERMISSION_DENIED yields permissionDenied", () => {
    expect(mapFirestoreError(403, body("PERMISSION_DENIED", "denied")).kind).toBe(
      "permissionDenied",
    );
  });

  test("index-required FAILED_PRECONDITION extracts the console URL", () => {
    const err = mapFirestoreError(
      400,
      body(
        "FAILED_PRECONDITION",
        "The query requires an index. You can create it here: https://console.firebase.google.com/v1/r/project/my-proj/firestore/indexes?create_composite=abc",
      ),
    );
    expect(err.kind).toBe("indexRequired");
    expect(err.indexUrl).toBe(
      "https://console.firebase.google.com/v1/r/project/my-proj/firestore/indexes?create_composite=abc",
    );
  });

  test("Datastore Mode FAILED_PRECONDITION yields datastoreMode", () => {
    expect(
      mapFirestoreError(
        400,
        body(
          "FAILED_PRECONDITION",
          "This project contains a Cloud Datastore or Cloud Firestore in Datastore Mode database",
        ),
      ).kind,
    ).toBe("datastoreMode");
  });

  test("NOT_FOUND, RESOURCE_EXHAUSTED, UNAUTHENTICATED map to their kinds", () => {
    expect(mapFirestoreError(404, body("NOT_FOUND", "no db")).kind).toBe("notFound");
    expect(mapFirestoreError(429, body("RESOURCE_EXHAUSTED", "quota")).kind).toBe("quota");
    expect(mapFirestoreError(401, body("UNAUTHENTICATED", "bad token")).kind).toBe("auth");
  });

  test("unknown errors keep a sanitized message", () => {
    const err = mapFirestoreError(
      500,
      body("INTERNAL", "boom from svc@my-proj.iam.gserviceaccount.com"),
    );
    expect(err.kind).toBe("unknown");
    expect(err).toBeInstanceOf(FirestoreApiError);
    expect(err.message).not.toContain("svc@my-proj");
  });

  test("unparseable body still yields an unknown-kind error", () => {
    expect(mapFirestoreError(502, undefined).kind).toBe("unknown");
  });
});

describe("sanitizeFirestoreError", () => {
  test("strips PEM blocks", () => {
    const out = sanitizeFirestoreError(
      "failed: -----BEGIN PRIVATE KEY-----\nSECRETSECRET\n-----END PRIVATE KEY----- rest",
    );
    expect(out).not.toContain("SECRETSECRET");
    expect(out).toContain("rest");
  });

  test("strips JWTs and access tokens", () => {
    const jwt =
      "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ4In0.c2lnbmF0dXJl";
    const out = sanitizeFirestoreError(`bad token ${jwt} and ya29.a0Af-secret123`);
    expect(out).not.toContain("eyJhbGciOiJSUzI1NiIs");
    expect(out).not.toContain("ya29.a0Af-secret123");
  });

  test("scrubs emails via the shared sanitizer", () => {
    expect(sanitizeFirestoreError("who: svc@proj.iam.gserviceaccount.com")).not.toContain(
      "svc@proj",
    );
  });
});
