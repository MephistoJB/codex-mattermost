export class MattermostError extends Error {
  constructor(message, { status = 0, errorId = undefined, requestId = undefined } = {}) {
    super(message);
    this.name = "MattermostError";
    this.status = status;
    this.errorId = errorId;
    this.requestId = requestId;
  }
}

function asIsoTime(value) {
  return Number.isFinite(value) && value > 0 ? new Date(value).toISOString() : null;
}

export function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    nickname: user.nickname || "",
  };
}

export function sanitizeTeam(team) {
  return {
    id: team.id,
    name: team.name,
    display_name: team.display_name,
    type: team.type,
    description: team.description || "",
  };
}

export function sanitizeChannel(channel) {
  return {
    id: channel.id,
    team_id: channel.team_id,
    name: channel.name,
    display_name: channel.display_name,
    type: channel.type,
    purpose: channel.purpose || "",
    header: channel.header || "",
  };
}

export function sanitizePost(post, serverUrl) {
  return {
    id: post.id,
    create_at: asIsoTime(post.create_at),
    update_at: asIsoTime(post.update_at),
    user_id: post.user_id,
    channel_id: post.channel_id,
    root_id: post.root_id || "",
    message: post.message || "",
    type: post.type || "",
    permalink: post.id ? `${serverUrl}/_redirect/pl/${post.id}` : null,
  };
}

export function candidatesFor(items, target) {
  const needle = target.trim().toLocaleLowerCase();
  const exact = items.filter((item) =>
    [item.id, item.name, item.display_name]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase() === needle),
  );
  if (exact.length) return { match_type: "exact", candidates: exact };

  const partial = items.filter((item) =>
    [item.name, item.display_name]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase().includes(needle)),
  );
  return { match_type: partial.length ? "partial" : "none", candidates: partial.slice(0, 20) };
}

function orderedPosts(payload, serverUrl, limit) {
  const posts = payload?.posts && typeof payload.posts === "object" ? payload.posts : {};
  const fallbackOrder = Object.values(posts)
    .sort((a, b) => (b.create_at || 0) - (a.create_at || 0))
    .map((post) => post.id);
  const order = Array.isArray(payload?.order) ? payload.order : fallbackOrder;
  return order
    .map((id) => posts[id])
    .filter(Boolean)
    .slice(0, limit)
    .map((post) => sanitizePost(post, serverUrl));
}

export class MattermostClient {
  constructor({ serverUrl, getToken, fetchImpl = fetch, timeoutMs = 20_000 }) {
    this.serverUrl = serverUrl;
    this.apiBase = `${serverUrl}/api/v4`;
    this.getToken = getToken;
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  async request(path, { method = "GET", query = {}, body = undefined } = {}) {
    const url = new URL(`${this.apiBase}${path}`);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    const token = await this.getToken();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let response;
    try {
      response = await this.fetchImpl(url, {
        method,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          "User-Agent": "codex-mattermost/0.2.0",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new MattermostError("Mattermost request timed out.");
      }
      throw new MattermostError(`Unable to reach Mattermost: ${error.message}`);
    } finally {
      clearTimeout(timeout);
    }

    const requestId = response.headers.get("x-request-id") || undefined;
    const text = await response.text();
    let payload = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }
    if (!response.ok) {
      const safeMessage =
        response.status === 401
          ? "Mattermost rejected the local credential. Reconfigure authentication."
          : payload?.message || `Mattermost request failed with HTTP ${response.status}.`;
      throw new MattermostError(safeMessage, {
        status: response.status,
        errorId: payload?.id,
        requestId,
      });
    }
    return payload;
  }

  async getCurrentUser() {
    return sanitizeUser(await this.request("/users/me"));
  }

  async listTeams() {
    const teams = await this.request("/users/me/teams");
    return teams.map(sanitizeTeam);
  }

  async listChannels() {
    const channels = await this.request("/users/me/channels");
    return channels.map(sanitizeChannel);
  }

  async getChannel(channelId) {
    return sanitizeChannel(await this.request(`/channels/${encodeURIComponent(channelId)}`));
  }

  async readChannel(channelId, { limit = 20, since = undefined } = {}) {
    const query = since
      ? { since: Date.parse(since) }
      : { page: 0, per_page: Math.min(limit, 100) };
    if (since && !Number.isFinite(query.since)) {
      throw new MattermostError("The since value must be a valid ISO-8601 timestamp.");
    }
    const payload = await this.request(
      `/channels/${encodeURIComponent(channelId)}/posts`,
      { query },
    );
    return orderedPosts(payload, this.serverUrl, limit);
  }

  async readPost(postId, { includeThread = true, limit = 100 } = {}) {
    if (!includeThread) {
      const post = await this.request(`/posts/${encodeURIComponent(postId)}`);
      return [sanitizePost(post, this.serverUrl)];
    }
    const payload = await this.request(`/posts/${encodeURIComponent(postId)}/thread`, {
      query: { perPage: Math.min(limit, 100) },
    });
    return orderedPosts(payload, this.serverUrl, limit).reverse();
  }

  async searchPosts(teamId, terms, { limit = 20, isOrSearch = false } = {}) {
    const payload = await this.request(`/teams/${encodeURIComponent(teamId)}/posts/search`, {
      method: "POST",
      body: {
        terms,
        is_or_search: isOrSearch,
        include_deleted_channels: false,
        page: 0,
        per_page: Math.min(limit, 100),
      },
    });
    return orderedPosts(payload, this.serverUrl, limit);
  }

  async createPost({ channelId, message, rootId = "" }) {
    const post = await this.request("/posts", {
      method: "POST",
      body: {
        channel_id: channelId,
        message,
        ...(rootId ? { root_id: rootId } : {}),
      },
    });
    return sanitizePost(post, this.serverUrl);
  }
}
