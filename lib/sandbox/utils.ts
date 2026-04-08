"use server";

import os from "node:os";
import path from "node:path";
import { resolution } from "./tool";
import {
  SandboxUnavailableError,
  assertSandboxAvailable,
} from "./runtime";

const NOVNC_PORT = 6080;
const DISPLAY_ENV = { DISPLAY: ":99" };

type SandboxInstance = {
  sandboxId: string;
  status: string;
  domain: (port: number) => string;
  readFileToBuffer: (options: { path: string }) => Promise<Buffer | null>;
  runCommand: (options: {
    cmd: string;
    args?: string[];
    env?: Record<string, string>;
    detached?: boolean;
  }) => Promise<{ stdout: () => Promise<string> }>;
  stop: () => Promise<unknown>;
};

type SandboxCredentials = {
  token: string;
  teamId: string;
  projectId: string;
};

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded =
    padding === 0 ? normalized : normalized.padEnd(normalized.length + (4 - padding), "=");

  return Buffer.from(padded, "base64").toString("utf8");
};

const getSandboxCredentials = (): SandboxCredentials => {
  if (
    process.env.VERCEL_TOKEN &&
    process.env.VERCEL_TEAM_ID &&
    process.env.VERCEL_PROJECT_ID
  ) {
    return {
      token: process.env.VERCEL_TOKEN,
      teamId: process.env.VERCEL_TEAM_ID,
      projectId: process.env.VERCEL_PROJECT_ID,
    };
  }

  const oidcToken = process.env.VERCEL_OIDC_TOKEN;

  if (!oidcToken) {
    throw new SandboxUnavailableError(
      "Desktop mode requires Vercel Sandbox auth in .env.local.",
    );
  }

  try {
    const [, payloadPart] = oidcToken.split(".");

    if (!payloadPart) {
      throw new Error("Missing JWT payload.");
    }

    const payload = JSON.parse(decodeBase64Url(payloadPart)) as {
      owner_id?: string;
      project_id?: string;
      exp?: number;
    };

    if (!payload.owner_id || !payload.project_id) {
      throw new Error("OIDC token is missing owner_id or project_id.");
    }

    if (typeof payload.exp === "number") {
      const expiresAt = payload.exp * 1000;

      if (Date.now() >= expiresAt) {
        throw new SandboxUnavailableError(
          `Vercel OIDC token expired at ${new Date(expiresAt).toISOString()}. Run \`npx vercel env pull\` and restart the dev server.`,
        );
      }
    }

    return {
      token: oidcToken,
      teamId: payload.owner_id,
      projectId: payload.project_id,
    };
  } catch (error) {
    throw new SandboxUnavailableError(
      error instanceof Error
        ? `Invalid Vercel OIDC token: ${error.message}`
        : "Invalid Vercel OIDC token.",
    );
  }
};

const getSandboxSdk = async () => {
  assertSandboxAvailable();

  if (!process.env.VERCEL_AUTH_CONFIG_DIR) {
    process.env.VERCEL_AUTH_CONFIG_DIR = path.join(
      os.homedir() || process.cwd(),
      ".vercel",
    );
  }

  if (!process.env.APPDATA) {
    process.env.APPDATA = path.join(
      os.homedir() || process.cwd(),
      "AppData",
      "Roaming",
    );
  }

  if (!process.env.LOCALAPPDATA) {
    process.env.LOCALAPPDATA = path.join(
      os.homedir() || process.cwd(),
      "AppData",
      "Local",
    );
  }

  const { Sandbox } = await import("@vercel/sandbox");
  return Sandbox;
};

export const getDesktop = async (id?: string) => {
  try {
    const Sandbox = await getSandboxSdk();
    const credentials = getSandboxCredentials();

    if (id) {
      const existing = (await Sandbox.get({
        sandboxId: id,
        ...credentials,
      })) as SandboxInstance;
      if (existing.status === "running") {
        return existing;
      }
    }

    const sandbox = (await Sandbox.create({
      source: {
        type: "snapshot",
        snapshotId: process.env.SANDBOX_SNAPSHOT_ID!,
      },
      timeout: 300000,
      ports: [NOVNC_PORT],
      ...credentials,
    })) as SandboxInstance;

    await sandbox.runCommand({
      cmd: "bash",
      args: ["/usr/local/bin/start-desktop.sh"],
      env: {
        RESOLUTION: `${resolution.x}x${resolution.y}`,
      },
      detached: true,
    });

    await waitForNoVNC(sandbox);

    await sandbox.runCommand({
      cmd: "python3",
      args: [
        "-c",
        `import ctypes
lib = ctypes.cdll.LoadLibrary('libX11.so.6')
d = lib.XOpenDisplay(None)
s = lib.XDefaultScreen(d)
r = lib.XRootWindow(d, s)
lib.XSetWindowBackground(d, r, 0x2D2D2D)
lib.XClearWindow(d, r)
lib.XFlush(d)
lib.XCloseDisplay(d)`,
      ],
      env: DISPLAY_ENV,
    });

    await sandbox.runCommand({
      cmd: "bash",
      args: [
        "-c",
        "google-chrome --no-sandbox --disable-gpu --no-first-run --disable-dev-shm-usage --start-maximized 'about:blank' &",
      ],
      env: DISPLAY_ENV,
      detached: true,
    });

    return sandbox;
  } catch (error) {
    if (error instanceof SandboxUnavailableError) {
      throw error;
    }

    console.error("Error in getDesktop:", error);
    throw error;
  }
};

async function waitForNoVNC(sandbox: SandboxInstance, maxRetries = 20) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await sandbox.runCommand({
        cmd: "bash",
        args: [
          "-c",
          `curl -s -o /dev/null -w "%{http_code}" http://localhost:${NOVNC_PORT}`,
        ],
      });

      const statusCode = await result.stdout();

      if (statusCode.trim() === "200") {
        return;
      }
    } catch {}

    await new Promise((r) => setTimeout(r, 500));
  }

  console.warn("noVNC health check timed out");
}

export const getDesktopURL = async (id?: string) => {
  try {
    const sandbox = await getDesktop(id);

    const baseUrl = sandbox.domain(NOVNC_PORT);
    const streamUrl = `${baseUrl}/vnc.html?autoconnect=true&resize=scale&reconnect=true`;

    return {
      streamUrl,
      id: sandbox.sandboxId,
      error: null,
    };
  } catch (error) {
    if (error instanceof SandboxUnavailableError) {
      return {
        streamUrl: null,
        id: null,
        error: error.message,
      };
    }

    console.error("Error in getDesktopURL:", error);
    throw error;
  }
};

export const killDesktop = async (id: string) => {
  try {
    const Sandbox = await getSandboxSdk();
    const sandbox = await Sandbox.get({
      sandboxId: id,
      ...getSandboxCredentials(),
    });
    await sandbox.stop();
  } catch (error) {
    if (error instanceof SandboxUnavailableError) {
      return;
    }

    console.error("Error killing desktop:", error);
  }
};
