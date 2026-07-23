let emit: ((s: any) => void) | undefined;
let resolveInstall: (() => void) | undefined;

jest.mock("@/lib/desktop/updater", () => ({
  installUpdate: jest.fn((onStatus?: (s: any) => void) => {
    emit = onStatus;
    return new Promise<void>((res) => {
      resolveInstall = res;
    });
  }),
}));

import { startUpdate, dismissUpdate, reopenUpdate, closeUpdate } from "@/lib/desktop/use-update-install";
// read module state through a tiny getter the module exposes for tests:
import { __getState } from "@/lib/desktop/use-update-install";

beforeEach(() => {
  emit = undefined;
  resolveInstall = undefined;
  closeUpdate(); // reset store between tests
});

describe("install store", () => {
  it("startUpdate opens modal and enters downloading", async () => {
    startUpdate();
    expect(__getState().visible).toBe(true);
    expect(__getState().status?.phase).toBe("downloading");
  });

  it("status emissions update the store", async () => {
    startUpdate();
    await Promise.resolve(); // let dynamic import().then microtask flush
    emit?.({ phase: "installing", downloaded: 5, total: 5 });
    expect(__getState().status?.phase).toBe("installing");
  });

  it("startUpdate is idempotent while running", async () => {
    startUpdate();
    const first = __getState().status;
    startUpdate();
    expect(__getState().status).toBe(first);
  });

  it("dismiss hides modal but keeps the run; reopen shows it", () => {
    startUpdate();
    dismissUpdate();
    expect(__getState().visible).toBe(false);
    expect(__getState().status).not.toBeNull();
    reopenUpdate();
    expect(__getState().visible).toBe(true);
  });

  it("a rejected install sets error", async () => {
    const { installUpdate } = require("@/lib/desktop/updater");
    (installUpdate as jest.Mock).mockImplementationOnce(() => Promise.reject(new Error("boom")));
    startUpdate();
    await Promise.resolve();
    await Promise.resolve();
    expect(__getState().error).toBe("boom");
  });
});
