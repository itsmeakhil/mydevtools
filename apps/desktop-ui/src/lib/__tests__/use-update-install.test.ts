import { installUpdate } from "@/lib/desktop/updater";

jest.mock("@/lib/desktop/updater", () => ({
  installUpdate: jest.fn(),
}));

import {
  startUpdate,
  dismissUpdate,
  reopenUpdate,
  closeUpdate,
  __getState,
} from "@/lib/desktop/use-update-install";

const mockInstall = installUpdate as jest.Mock;
let emit: ((s: any) => void) | undefined;

beforeEach(() => {
  emit = undefined;
  closeUpdate(); // reset the module store between tests
  mockInstall.mockReset();
  mockInstall.mockImplementation((onStatus?: (s: any) => void) => {
    emit = onStatus;
    return new Promise<void>(() => {}); // capture callback, never resolve
  });
});

describe("install store", () => {
  it("startUpdate opens modal and enters downloading", () => {
    startUpdate();
    expect(__getState().visible).toBe(true);
    expect(__getState().status?.phase).toBe("downloading");
  });

  it("status emissions update the store", async () => {
    startUpdate();
    await new Promise((r) => setTimeout(r, 0)); // let dynamic import().then flush
    emit?.({ phase: "installing", downloaded: 5, total: 5 });
    expect(__getState().status?.phase).toBe("installing");
  });

  it("startUpdate is idempotent while running", () => {
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
    mockInstall.mockImplementationOnce(() => Promise.reject(new Error("boom")));
    startUpdate();
    await new Promise((r) => setTimeout(r, 0));
    expect(__getState().error).toBe("boom");
  });
});
