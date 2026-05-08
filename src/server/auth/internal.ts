import { auth, currentUser } from "@clerk/nextjs/server";

export class InternalAuthorizationError extends Error {
  readonly status = 401;
  readonly code = "UNAUTHORIZED";

  constructor(message = "Unauthorized") {
    super(message);
    this.name = "InternalAuthorizationError";
  }
}

export type InternalAuthContext = {
  clerkUserId: string;
  clerkSessionId: string | null;
};

export type InternalActor = InternalAuthContext & {
  email: string | null;
  name: string | null;
  imageUrl: string | null;
};

export async function requireInternalAuth(): Promise<InternalAuthContext> {
  const { isAuthenticated, sessionId, userId } = await auth();

  if (!isAuthenticated || !userId) {
    throw new InternalAuthorizationError();
  }

  return {
    clerkUserId: userId,
    clerkSessionId: sessionId ?? null,
  };
}

export async function requireInternalActor(): Promise<InternalActor> {
  const authContext = await requireInternalAuth();
  const user = await currentUser();

  if (!user) {
    throw new InternalAuthorizationError();
  }

  return {
    ...authContext,
    email: user.primaryEmailAddress?.emailAddress ?? null,
    name: user.fullName ?? null,
    imageUrl: user.imageUrl ?? null,
  };
}

export function isInternalAuthorizationError(
  error: unknown,
): error is InternalAuthorizationError {
  return error instanceof InternalAuthorizationError;
}
