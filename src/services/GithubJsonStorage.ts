export class GithubJsonStorage {
  private owner: string;
  private repo: string;
  private filePath: string;
  private token: string;
  private apiUrl: string;

  constructor(options: {
    owner: string;
    repo: string;
    path: string;
    token: string;
  }) {
    this.owner = options.owner;
    this.repo = options.repo;
    this.filePath = options.path;
    this.token = options.token;
    this.apiUrl = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${this.filePath}`;
  }

  async readJSON<T = any>(): Promise<{ data: T; sha: string | null }> {
    const res = await fetch(this.apiUrl, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (res.status === 404) {
      return { data: [] as unknown as T, sha: null };
    }

    const json = await res.json();
    const content = Buffer.from(json.content, "base64").toString("utf-8");
    return { data: JSON.parse(content), sha: json.sha };
  }

  async writeJSON(data: any, sha: string | null) {
    const body = {
      message: "Update words.json via Telegram bot",
      content: Buffer.from(JSON.stringify(data, null, 2)).toString("base64"),
      sha: sha ?? undefined,
    };

    const res = await fetch(this.apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error("GitHub write failed: " + t);
    }

    return res.json();
  }
}
