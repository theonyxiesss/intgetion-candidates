import { beforeEach, describe, expect, it, vi } from "vitest";

const service = vi.hoisted(() => ({
  getOwnCandidate: vi.fn(async (): Promise<unknown> => null),
  saveCandidateProfile: vi.fn(async () => ({ completeness: 50 })),
  getCandidateForViewer: vi.fn(async () => ({ headline: "x" })),
  setProfileHidden: vi.fn(async (_id: string, hidden: boolean) => hidden),
  getSellerStorefronts: vi.fn(async () => new Map([["a", { name: "Anna" }]])),
}));

vi.mock("../modules/candidates/service", async (orig) => ({
  ...(await orig<typeof import("../modules/candidates/service")>()),
  ...service,
}));

const { createApp } = await import("./app");

const TOKEN = "test-candidates-token";
const USER = "22222222-2222-4222-8222-222222222222";
const OTHER = "33333333-3333-4333-8333-333333333333";
const handle = createApp({ serviceToken: TOKEN });

function call(path: string, init: RequestInit & { user?: string } = {}) {
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${TOKEN}`);
  if (init.user) headers.set("x-user-id", init.user);
  return handle(new Request(`http://candidates${path}`, { ...init, headers }));
}

beforeEach(() => vi.clearAllMocks());

describe("candidates service HTTP", () => {
  it("refuses a wrong token and needs the person", async () => {
    const refused = await handle(
      new Request("http://candidates/v1/me/candidate", {
        headers: { authorization: "Bearer nope", "x-user-id": USER },
      }),
    );
    expect(refused.status).toBe(401);
    expect((await call("/v1/me/candidate")).status).toBe(401);
    expect((await call("/v1/me/candidate", { user: USER })).status).toBe(404);
  });

  it("validates the profile form before saving", async () => {
    const bad = await call("/v1/me/candidate", {
      method: "PATCH",
      user: USER,
      body: JSON.stringify({ timezone: "Mars/Olympus" }),
    });
    expect(bad.status).toBe(400);
    expect(service.saveCandidateProfile).not.toHaveBeenCalled();
  });

  it("passes the viewer to the access check", async () => {
    await call(`/v1/candidates/${OTHER}`, { user: USER });
    expect(service.getCandidateForViewer).toHaveBeenCalledWith(USER, OTHER);
    expect((await call("/v1/candidates/nope", { user: USER })).status).toBe(404);
  });

  it("sets visibility and returns storefronts as an object", async () => {
    const hidden = await call("/v1/me/candidate/visibility", {
      method: "PUT",
      user: USER,
      body: JSON.stringify({ hidden: true }),
    });
    expect(await hidden.json()).toEqual({ hidden: true });
    const fronts = await call("/v1/storefronts", {
      method: "POST",
      body: JSON.stringify({ userIds: [USER] }),
    });
    expect(await fronts.json()).toEqual({ storefronts: { a: { name: "Anna" } } });
  });
});
