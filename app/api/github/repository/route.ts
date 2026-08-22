const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;

type GitHubRepository = {
  full_name?: unknown;
  description?: unknown;
  private?: unknown;
  default_branch?: unknown;
  html_url?: unknown;
  pushed_at?: unknown;
  open_issues_count?: unknown;
};

export async function GET(request: Request) {
  const repositoryName = new URL(request.url).searchParams.get("repo")?.trim() || "";

  if (!REPOSITORY_PATTERN.test(repositoryName) || repositoryName.includes("..")) {
    return Response.json({ error: "Enter a repository as owner/repository." }, { status: 422 });
  }

  const token = process.env.GITHUB_TOKEN?.trim();
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "AiFix3r-security-automation",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetch(`https://api.github.com/repos/${repositoryName}`, {
      headers,
      signal: AbortSignal.timeout(15_000),
    });

    if (response.status === 404) {
      return Response.json(
        { error: "Repository was not found or the server token cannot access it." },
        { status: 404 },
      );
    }
    if (!response.ok) {
      return Response.json(
        { error: `GitHub returned HTTP ${response.status}. Try again later.` },
        { status: 502 },
      );
    }

    const payload = (await response.json()) as GitHubRepository;
    if (
      typeof payload.full_name !== "string" ||
      typeof payload.html_url !== "string" ||
      !payload.html_url.startsWith("https://github.com/")
    ) {
      return Response.json({ error: "GitHub returned an unexpected response." }, { status: 502 });
    }

    return Response.json({
      repository: {
        full_name: payload.full_name.slice(0, 220),
        description: typeof payload.description === "string" ? payload.description.slice(0, 500) : null,
        private: Boolean(payload.private),
        default_branch: typeof payload.default_branch === "string" ? payload.default_branch.slice(0, 100) : "main",
        html_url: payload.html_url,
        pushed_at: typeof payload.pushed_at === "string" ? payload.pushed_at : "",
        open_issues_count: typeof payload.open_issues_count === "number" ? Math.max(0, payload.open_issues_count) : 0,
      },
    });
  } catch {
    return Response.json({ error: "GitHub is unavailable or timed out." }, { status: 502 });
  }
}
