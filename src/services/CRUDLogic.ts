// Pure CRUD logic (no React hooks). Safe to use server-side.

/** Entity shape required by the CRUD service. Must have a numeric `id`. */
export interface CrudEntity {
  id: number;
}

/**
 * Generic list response: list plus any extra fields from the API.
 * Use with parseListResponse when the API returns list + metadata (pagination, links, etc.).
 * Mutations only update the `list` property and preserve all other fields.
 */
export type ListResponse<T, M = Record<string, never>> = { list: T[] } & M;

/**
 * Convenience type for APIs that return { list, info }.
 * Same as ListResponse<T, { info: I }>.
 */
export type ListWithInfo<T, I> = ListResponse<T, { info: I }>;

/** Configuration for creating a CRUD service. */
export interface CrudServiceConfig<T extends CrudEntity, ListMeta = undefined> {
  /** Query key segment (e.g. "posts", "users"). Used for cache keys. */
  entityKey: string;
  /** Base API URL (e.g. "https://api.example.com/posts" or "/api/posts"). */
  baseUrl: string;
  /** Optional: custom error message when fetch fails. */
  notFoundMessage?: string;
  /**
   * Optional: return only the list when the API wraps it (e.g. { results: T[] }).
   * Hook returns T[]; simplest when you don't need other response fields.
   */
  listFromResponse?: (body: unknown) => T[];
  /**
   * Optional: return list + any metadata. Your parser returns { list: T[], ...meta }.
   * Hook returns that object; mutations preserve meta and only update list.
   * Use createCrudService<T, ListMeta> to type the extra fields.
   */
  parseListResponse?: (body: unknown) => ListResponse<T, ListMeta>;
}

/** List data: T[] when no parser or listFromResponse, or { list, ...meta } when parseListResponse. */
export type ListData<T, M> = M extends undefined ? T[] : ListResponse<T, M>;

/**
 * Builds a list URL for both absolute and relative base URLs.
 * (The browser supports fetching relative URLs like "/api/items".)
 */
export function buildListUrl<ListParams = void>(
  baseUrl: string,
  params?: ListParams
): string {
  if (params == null || typeof params !== "object") return baseUrl;

  // Prefer URL when baseUrl is absolute; fall back to string concatenation for relative URLs.
  try {
    const url = new URL(baseUrl);
    Object.entries(params as Record<string, unknown>).forEach(
      ([k, v]) => v != null && v !== "" && url.searchParams.set(k, String(v))
    );
    return url.toString();
  } catch {
    const searchParams = new URLSearchParams();
    Object.entries(params as Record<string, unknown>).forEach(([k, v]) => {
      if (v != null && v !== "") searchParams.set(k, String(v));
    });
    const qs = searchParams.toString();
    if (!qs) return baseUrl;
    return baseUrl.includes("?") ? `${baseUrl}&${qs}` : `${baseUrl}?${qs}`;
  }
}

/** Fetches the list endpoint and applies list parsers from config. */
export async function fetchList<
  T extends CrudEntity,
  ListMeta = undefined,
  ListParams = void,
>(
  config: CrudServiceConfig<T, ListMeta>,
  params?: ListParams
): Promise<ListData<T, ListMeta>> {
  const url = buildListUrl<ListParams>(config.baseUrl, params);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${config.entityKey}`);
  const body = await res.json();
  if (config.parseListResponse) return config.parseListResponse(body) as ListData<T, ListMeta>;
  if (config.listFromResponse) return config.listFromResponse(body) as ListData<T, ListMeta>;
  return body as T[] as ListData<T, ListMeta>;
}

/** Fetches a single entity by id. */
export async function fetchItem<T extends CrudEntity, ListMeta = unknown>(
  config: CrudServiceConfig<T, ListMeta>,
  id: number
): Promise<T> {
  const res = await fetch(`${config.baseUrl}/${id}`);
  if (!res.ok) throw new Error(config.notFoundMessage ?? "Not found");
  return res.json();
}

/** Creates a new entity (POST baseUrl). */
export async function createItem<T extends CrudEntity, ListMeta = unknown>(
  config: CrudServiceConfig<T, ListMeta>,
  newItem: Omit<T, "id">
): Promise<T> {
  const res = await fetch(config.baseUrl, {
    method: "POST",
    body: JSON.stringify(newItem),
    headers: { "Content-type": "application/json" },
  });
  return res.json();
}

/** Updates an entity (PATCH baseUrl/:id). */
export async function updateItem<T extends CrudEntity, ListMeta = unknown>(
  config: CrudServiceConfig<T, ListMeta>,
  updatedItem: T
): Promise<T> {
  const res = await fetch(`${config.baseUrl}/${updatedItem.id}`, {
    method: "PATCH",
    body: JSON.stringify(updatedItem),
    headers: { "Content-type": "application/json" },
  });
  return res.json();
}

/** Deletes an entity (DELETE baseUrl/:id). */
export async function deleteItem<T extends CrudEntity, ListMeta = unknown>(
  config: CrudServiceConfig<T, ListMeta>,
  id: number
): Promise<void> {
  await fetch(`${config.baseUrl}/${id}`, { method: "DELETE" });
}

