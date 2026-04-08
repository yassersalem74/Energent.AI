export class SandboxUnavailableError extends Error {
  readonly code = "SANDBOX_UNAVAILABLE";

  constructor(message: string) {
    super(message);
    this.name = "SandboxUnavailableError";
  }
}

const hasSandboxAuth = () =>
  Boolean(
    process.env.VERCEL_OIDC_TOKEN ||
      (process.env.VERCEL_TOKEN &&
        process.env.VERCEL_TEAM_ID &&
        process.env.VERCEL_PROJECT_ID),
  );

export const getSandboxUnavailableReason = () => {
  if (!process.env.SANDBOX_SNAPSHOT_ID) {
    return "Desktop mode requires SANDBOX_SNAPSHOT_ID in .env.local.";
  }

  if (!hasSandboxAuth()) {
    return "Desktop mode requires Vercel Sandbox auth in .env.local.";
  }

  if (
    process.platform === "win32" &&
    process.env.FORCE_ENABLE_VERCEL_SANDBOX !== "1"
  ) {
    return "Desktop mode is opt-in on Windows. Add FORCE_ENABLE_VERCEL_SANDBOX=1 to .env.local after snapshot and auth are configured.";
  }

  return null;
};

export const assertSandboxAvailable = () => {
  const reason = getSandboxUnavailableReason();

  if (reason) {
    throw new SandboxUnavailableError(reason);
  }
};
