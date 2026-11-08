import { z, ZodError } from "zod";
import {
  HttpError,
  httpErrorResponse,
  notFound,
  reportError,
  validationError,
} from "@intgetion/kit";
import * as candidates from "../modules/candidates/service";
import { isUuid, requireCaller, requireServiceToken } from "./auth";

export type AppConfig = { serviceToken: string };

const hiddenBody = z.object({ hidden: z.boolean() }).strict();
const briefsBody = z.object({ enabled: z.boolean() }).strict();
const storefrontBody = z.object({ userIds: z.array(z.string().uuid()).max(200) }).strict();
const completenessBody = z
  .object({ contactEmail: z.string().email().max(254).nullable() })
  .strict();

const MAX_BODY = 64 * 1024;

async function parseBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const text = await request.text();
  if (text.length > MAX_BODY) {
    throw new HttpError(413, "PAYLOAD_TOO_LARGE", "Body too large");
  }
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw validationError({ body: "invalid json" });
  }
  return schema.parse(json);
}

function uuidParam(value: string | undefined): string {
  if (!value || !isUuid(value)) throw notFound();
  return value;
}

type Route = {
  method: string;
  pattern: RegExp;
  run: (request: Request, params: string[]) => Promise<unknown>;
};

const routes: Route[] = [
  {
    method: "GET",
    pattern: /^\/v1\/me\/candidate$/,
    run: async (request) => {
      const profile = await candidates.getOwnCandidate(requireCaller(request).userId);
      if (!profile) throw notFound();
      return profile;
    },
  },
  {
    method: "PATCH",
    pattern: /^\/v1\/me\/candidate$/,
    run: async (request) => {
      const { userId } = requireCaller(request);
      const input = await parseBody(request, candidates.updateCandidateInput);
      return candidates.saveCandidateProfile(userId, input);
    },
  },
  {
    method: "POST",
    pattern: /^\/v1\/me\/candidate\/patch$/,
    run: async (request) => {
      const { userId } = requireCaller(request);
      const patch = await parseBody(request, candidates.candidatePatchInput);
      return candidates.patchCandidateProfile(userId, patch);
    },
  },
  {
    method: "PUT",
    pattern: /^\/v1\/me\/candidate\/visibility$/,
    run: async (request) => {
      const { userId } = requireCaller(request);
      const { hidden } = await parseBody(request, hiddenBody);
      return { hidden: await candidates.setProfileHidden(userId, hidden) };
    },
  },
  {
    method: "GET",
    pattern: /^\/v1\/me\/candidate\/agent-briefs$/,
    run: async (request) => ({
      enabled: await candidates.ownAgentBriefsEnabled(requireCaller(request).userId),
    }),
  },
  {
    method: "PUT",
    pattern: /^\/v1\/me\/candidate\/agent-briefs$/,
    run: async (request) => {
      const { userId } = requireCaller(request);
      const { enabled } = await parseBody(request, briefsBody);
      return { enabled: await candidates.setOwnAgentBriefsEnabled(userId, enabled) };
    },
  },
  {
    method: "GET",
    pattern: /^\/v1\/candidates\/([^/]+)$/,
    run: async (request, [id]) =>
      candidates.getCandidateForViewer(requireCaller(request).userId, uuidParam(id)),
  },
  {
    method: "GET",
    pattern: /^\/v1\/candidates\/([^/]+)\/exists$/,
    run: async (_request, [id]) => ({
      exists: await candidates.hasCandidateProfile(uuidParam(id)),
    }),
  },
  {
    method: "POST",
    pattern: /^\/v1\/candidates\/([^/]+)\/completeness$/,
    run: async (request, [id]) => {
      const candidateId = uuidParam(id);
      const { contactEmail } = await parseBody(request, completenessBody);
      const profile = await candidates.getOwnCandidate(candidateId);
      if (!profile) throw notFound();
      const result = candidates.scoreStoredProfile(profile, contactEmail);
      await candidates.storeCompleteness(candidateId, result.score);
      return result;
    },
  },
  {
    method: "POST",
    pattern: /^\/v1\/storefronts$/,
    run: async (request) => {
      const { userIds } = await parseBody(request, storefrontBody);
      const found = await candidates.getSellerStorefronts(userIds);
      return { storefronts: Object.fromEntries(found) };
    },
  },
];

export function toResponse(error: unknown): Response {
  if (error instanceof HttpError) return httpErrorResponse(error);
  if (error instanceof ZodError) {
    return httpErrorResponse(validationError(error.issues));
  }
  reportError(error, "candidates-service");
  return Response.json(
    { error: { code: "INTERNAL", message: "Internal error" } },
    { status: 500 },
  );
}

export function createApp(config: AppConfig) {
  return async function handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (request.method === "GET" && url.pathname === "/health") {
        return Response.json({ ok: true });
      }
      requireServiceToken(request, config.serviceToken);
      for (const route of routes) {
        if (route.method !== request.method) continue;
        const match = route.pattern.exec(url.pathname);
        if (!match) continue;
        return Response.json(await route.run(request, match.slice(1)), {
          headers: { "cache-control": "no-store" },
        });
      }
      throw notFound();
    } catch (error) {
      return toResponse(error);
    }
  };
}
