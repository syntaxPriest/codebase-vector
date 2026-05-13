// GitHub API + tarball download.
// Token resolution order: explicit `token` arg > GITHUB_TOKEN env > anonymous.
// Anonymous rate limit is 60/hr; an env token raises it to 5000/hr; a
// per-user OAuth token unlocks private repos for that user.

const UA = "codebase-vector";

export interface ResolvedRepo {
  owner: string;
  repo: string;
  branch: string;
  sha: string;
}

function resolveToken(token: string | null | undefined): string | null {
  return token || process.env.GITHUB_TOKEN || null;
}

function apiHeaders(token: string | null | undefined): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": UA,
    "Accept": "application/vnd.github+json",
  };
  const t = resolveToken(token);
  if (t) headers.Authorization = `Bearer ${t}`;
  return headers;
}

async function fetchJson(url: string, token?: string | null): Promise<any> {
  let res: Response;
  try {
    res = await fetch(url, { headers: apiHeaders(token) });
  } catch (e) {
    // Node's undici wraps low-level network failures (DNS, TCP, TLS)
    // as TypeError("fetch failed"). Surface that as a clearer message
    // pointing at the network, not the app.
    const cause = (e as { cause?: { code?: string } } | null)?.cause;
    const code = cause?.code ? ` (${cause.code})` : "";
    throw new Error(`could not reach github${code} · check VPN / firewall / connectivity`);
  }
  if (!res.ok) {
    if (res.status === 404) throw new Error(`repository not found · ${url}`);
    if (res.status === 401) throw new Error(`unauthorized · session may have expired`);
    if (res.status === 403) {
      const body = await res.text().catch(() => "");
      throw new Error(`rate limited · ${body.slice(0, 120)}`);
    }
    throw new Error(`github api ${res.status} · ${url}`);
  }
  return res.json();
}

export async function resolveRepo(
  owner: string,
  repo: string,
  token?: string | null,
): Promise<ResolvedRepo> {
  const meta = await fetchJson(
    `https://api.github.com/repos/${owner}/${repo}`,
    token,
  );
  const branch: string = meta.default_branch;
  const ref = await fetchJson(
    `https://api.github.com/repos/${owner}/${repo}/commits/${encodeURIComponent(branch)}`,
    token,
  );
  return { owner, repo, branch, sha: ref.sha };
}

export async function downloadTarball(
  owner: string,
  repo: string,
  ref: string,
  token?: string | null,
): Promise<Buffer> {
  const url = `https://codeload.github.com/${owner}/${repo}/tar.gz/${encodeURIComponent(ref)}`;
  const headers: Record<string, string> = { "User-Agent": UA };
  const t = resolveToken(token);
  if (t) headers.Authorization = `Bearer ${t}`;
  let res: Response;
  try {
    res = await fetch(url, { headers });
  } catch (e) {
    const cause = (e as { cause?: { code?: string } } | null)?.cause;
    const code = cause?.code ? ` (${cause.code})` : "";
    throw new Error(`could not reach github${code} · tarball download blocked by network`);
  }
  if (!res.ok) {
    if (res.status === 404) throw new Error(`tarball not found · ${url}`);
    if (res.status === 401) throw new Error(`unauthorized to download · session may have expired`);
    throw new Error(`tarball download failed · ${res.status} · ${url}`);
  }
  return Buffer.from(await res.arrayBuffer());
}
