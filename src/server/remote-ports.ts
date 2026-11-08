import type { CandidatesPorts } from "../ports";

export type Endpoint = { url: string; token: string };

export type RemoteConfig = {
  taxonomy: Endpoint;
  contacts: Endpoint;
  users: Endpoint;
  platform: Endpoint;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

/** Ports answered by the taxonomy, contacts and users services, and the platform. */
export function httpCandidatesPorts(config: RemoteConfig): CandidatesPorts {
  const doFetch = config.fetchImpl ?? fetch;
  const timeoutMs = config.timeoutMs ?? 5000;

  async function call(to: Endpoint, path: string, init: RequestInit = {}) {
    const response = await doFetch(`${to.url.replace(/\/+$/, "")}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${to.token}`,
        "content-type": "application/json",
        ...init.headers,
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`${path} answered ${response.status}`);
    return response;
  }

  return {
    async normalizeSkill(raw, source) {
      const response = await call(config.taxonomy, "/v1/skills/normalize", {
        method: "POST",
        body: JSON.stringify({ raw, source }),
      });
      return response.json();
    },
    async findContactEmail(candidateId) {
      const response = await call(
        config.contacts,
        `/v1/contacts/${encodeURIComponent(candidateId)}/email`,
      );
      return ((await response.json()) as { email: string | null }).email;
    },
    async writeSharedFacts(userId, facts, mode) {
      await call(config.users, `/v1/users/${encodeURIComponent(userId)}/profile/facts`, {
        method: "POST",
        body: JSON.stringify({ mode, facts }),
      });
    },
    async employerCanSeeCandidate(viewerId, candidateId) {
      const query = new URLSearchParams({ viewerId, candidateId });
      const response = await call(
        config.platform,
        `/api/internal/candidates/employer-can-see?${query}`,
      );
      return ((await response.json()) as { allowed: boolean }).allowed;
    },
  };
}
