import { describe, expect, it, vi } from "vitest";
import { httpCandidatesPorts } from "./remote-ports";

function setup(answer: () => Response) {
  const fetchImpl = vi.fn(async () => answer());
  const ports = httpCandidatesPorts({
    taxonomy: { url: "https://taxonomy.test", token: "t" },
    contacts: { url: "https://contacts.test/", token: "c" },
    users: { url: "https://users.test", token: "u" },
    platform: { url: "https://platform.test", token: "p" },
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });
  const sent = (i = 0) => fetchImpl.mock.calls[i] as unknown as [string, RequestInit];
  return { ports, sent };
}

const auth = (init: RequestInit) => (init.headers as Record<string, string>).authorization;

describe("candidates remote ports", () => {
  it("normalizes skills at taxonomy with its token", async () => {
    const { ports, sent } = setup(() => Response.json({ result: "matched", skillId: "s", slug: "react" }));
    await expect(ports.normalizeSkill("React", "user")).resolves.toMatchObject({ slug: "react" });
    expect(sent()[0]).toBe("https://taxonomy.test/v1/skills/normalize");
    expect(JSON.parse(sent()[1].body as string)).toEqual({ raw: "React", source: "user" });
    expect(auth(sent()[1])).toBe("Bearer t");
  });

  it("reads the email at contacts and notes facts at users", async () => {
    const { ports, sent } = setup(() => Response.json({ email: "a@example.com", ok: true }));
    await expect(ports.findContactEmail("id-1")).resolves.toBe("a@example.com");
    expect(sent(0)[0]).toBe("https://contacts.test/v1/contacts/id-1/email");
    await ports.writeSharedFacts("id-1", { city: "Kraków" }, "replace");
    expect(sent(1)[0]).toBe("https://users.test/v1/users/id-1/profile/facts");
    expect(JSON.parse(sent(1)[1].body as string)).toEqual({ mode: "replace", facts: { city: "Kraków" } });
    expect(auth(sent(1)[1])).toBe("Bearer u");
  });

  it("asks the platform about employer access and fails loudly on error", async () => {
    const { ports, sent } = setup(() => Response.json({ allowed: true }));
    await expect(ports.employerCanSeeCandidate("v", "c")).resolves.toBe(true);
    expect(sent()[0]).toBe("https://platform.test/api/internal/candidates/employer-can-see?viewerId=v&candidateId=c");
    const broken = setup(() => new Response(null, { status: 502 }));
    await expect(broken.ports.writeSharedFacts("x", {}, "fill")).rejects.toThrow("502");
  });
});
