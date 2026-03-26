// Pure CRUD logic (no React hooks). Safe to use server-side.

/** Entity shape for single-id (default). Must have a numeric `id`. */
export interface CrudEntity {
  id: number;
}

/**
 * Entity constraint: when Id is number, T must extend CrudEntity; when Id is an object (composite key), T must extend Id.
 */
export type EntityForId<Id> = Id extends number ? CrudEntity : Id;

/**
 * Payload for create: omit id when single-id; full entity (including key) when composite key.
 */
export type CreatePayload<T, Id> = Id extends number ? Omit<T, "id"> : T;

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

/** Configuration for creating a CRUD service. Default Id = number (single id). For composite key, set Id and provide getItemUrl + getKeyFromEntity. */
export interface CrudServiceConfig<
  T extends EntityForId<Id>,
  ListMeta = undefined,
  Id = number,
> {
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
  /**
   * Required for composite key. Builds the URL for a single item (GET/PATCH/DELETE).
   * When omitted, item URL is baseUrl + "/" + id (single numeric id).
   */
  getItemUrl?: (key: Id) => string;
  /**
   * Required for composite key. Extracts the key from an entity (for cache key and URL).
   * When omitted, key is (entity as { id: number }).id.
   */
  getKeyFromEntity?: (entity: T) => Id;
}

/** List data: T[] when no parser or listFromResponse, or { list, ...meta } when parseListResponse. */
export type ListData<T, M> = M extends undefined ? T[] : ListResponse<T, M>;

function resolveItemUrl<T extends EntityForId<Id>, ListMeta, Id>(
  config: CrudServiceConfig<T, ListMeta, Id>,
  key: Id
): string {
  if (config.getItemUrl) return config.getItemUrl(key);
  return `${config.baseUrl}/${key}`;
}

function resolveKeyFromEntity<T extends EntityForId<Id>, ListMeta, Id>(
  config: CrudServiceConfig<T, ListMeta, Id>,
  entity: T
): Id {
  if (config.getKeyFromEntity) return config.getKeyFromEntity(entity);
  return (entity as { id: number }).id as Id;
}

/** Compares entity's key with the given key (for optimistic delete filter). Exported for use in CRUDService. */
export function isSameKey<T extends EntityForId<Id>, ListMeta, Id>(
  config: CrudServiceConfig<T, ListMeta, Id>,
  entity: T,
  key: Id
): boolean {
  const entityKey = resolveKeyFromEntity(config, entity);
  if (typeof entityKey === "number" && typeof key === "number") return entityKey === key;
  if (typeof entityKey === "object" && typeof key === "object" && entityKey !== null && key !== null) {
    const a = entityKey as Record<string, unknown>;
    const b = key as Record<string, unknown>;
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].every((k) => a[k] === b[k]);
  }
  return false;
}

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
  T extends EntityForId<Id>,
  ListMeta = undefined,
  ListParams = void,
  Id = number,
>(
  config: CrudServiceConfig<T, ListMeta, Id>,
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

/** Fetches a single entity by key (id: number for default, or composite key object). */
export async function fetchItem<
  T extends EntityForId<Id>,
  ListMeta = unknown,
  Id = number,
>(
  config: CrudServiceConfig<T, ListMeta, Id>,
  key: Id
): Promise<T> {
  const url = resolveItemUrl(config, key);
  const res = await fetch(url);
  if (!res.ok) throw new Error(config.notFoundMessage ?? "Not found");
  return res.json();
}

/** Creates a new entity (POST baseUrl). */
export async function createItem<
  T extends EntityForId<Id>,
  ListMeta = unknown,
  Id = number,
>(
  config: CrudServiceConfig<T, ListMeta, Id>,
  newItem: CreatePayload<T, Id>
): Promise<T> {
  const res = await fetch(config.baseUrl, {
    method: "POST",
    body: JSON.stringify(newItem),
    headers: { "Content-type": "application/json" },
  });
  return res.json();
}

/** Updates an entity (PATCH to item URL). */
export async function updateItem<
  T extends EntityForId<Id>,
  ListMeta = unknown,
  Id = number,
>(
  config: CrudServiceConfig<T, ListMeta, Id>,
  updatedItem: T
): Promise<T> {
  const key = resolveKeyFromEntity(config, updatedItem);
  const url = resolveItemUrl(config, key);
  const res = await fetch(url, {
    method: "PATCH",
    body: JSON.stringify(updatedItem),
    headers: { "Content-type": "application/json" },
  });
  return res.json();
}

/** Deletes an entity (DELETE to item URL). */
export async function deleteItem<
  T extends EntityForId<Id>,
  ListMeta = unknown,
  Id = number,
>(
  config: CrudServiceConfig<T, ListMeta, Id>,
  key: Id
): Promise<void> {
  const url = resolveItemUrl(config, key);
  await fetch(url, { method: "DELETE" });
}

/* --- DOCUMENTATION: HOW TO USE CRUDLogic ---
 *
 * Overview:
 *   Pure CRUD logic (no React hooks). Safe to use server-side (e.g. in Server Components,
 *   API routes, or server actions). CRUDService.ts wraps these with TanStack Query.
 *
 * Types:
 *   CrudEntity           — Default entity shape: must have numeric id.
 *   EntityForId<Id>      — Id extends number ? CrudEntity : Id (entity constraint).
 *   CreatePayload<T,Id>  — Create payload: Omit<T,'id'> when Id=number, else T.
 *   ListResponse<T,M>    — { list: T[] } & M; use with parseListResponse.
 *   ListWithInfo<T,I>    — ListResponse<T, { info: I }>.
 *   CrudServiceConfig    — entityKey, baseUrl, optional parsers; for composite key add getItemUrl + getKeyFromEntity (third generic Id).
 *   ListData<T,M>        — T[] when no parser, or ListResponse<T,M> when parseListResponse.
 *   isSameKey(config, entity, key) — Compares entity key with key (for optimistic delete); exported for CRUDService.
 *
 * --- buildListUrl<ListParams>(baseUrl, params?) ---
 *   Builds the list URL with optional query params (works for absolute and relative baseUrl).
 *   Pass: baseUrl (string), params (optional object → serialized as ?key=value).
 *   Returns: string (full URL).
 *   Example: buildListUrl("/api/posts") → "/api/posts"
 *            buildListUrl("/api/character", { status: "alive", species: "Human" })
 *            → "/api/character?status=alive&species=Human"
 *
 * --- fetchList<T, ListMeta, ListParams, Id>(config, params?) ---
 *   Fetches the list endpoint and applies config list parsers.
 *   Pass: config (CrudServiceConfig<T, ListMeta, Id>), params (optional, list query params).
 *   Returns: Promise<ListData<T, ListMeta>> — T[] or { list, ...meta }.
 *   Example: const posts = await fetchList(config);
 *            const filtered = await fetchList(config, { status: "draft", limit: 10 });
 *
 * --- fetchItem<T, ListMeta, Id>(config, key) ---
 *   Fetches a single entity by key (number for default, or composite key object).
 *   Pass: config (CrudServiceConfig), key (Id: number or composite object).
 *   Returns: Promise<T>. Throws if not found (uses config.notFoundMessage or "Not found").
 *   Example: const post = await fetchItem(config, 1);
 *            const item = await fetchItem(config, { memberId: 1, key: "x" });
 *
 * --- createItem<T, ListMeta, Id>(config, newItem) ---
 *   Creates a new entity (POST to baseUrl). newItem: CreatePayload<T,Id> (omit id for single-id, full T for composite).
 *   Returns: Promise<T> (created entity).
 *   Example: const created = await createItem(config, { title: "Hello", body: "World", userId: 1 });
 *
 * --- updateItem<T, ListMeta, Id>(config, updatedItem) ---
 *   Updates an entity (PATCH to item URL from getItemUrl or baseUrl/:id).
 *   Pass: config (CrudServiceConfig), updatedItem (full T).
 *   Returns: Promise<T>.
 *   Example: const updated = await updateItem(config, { id: 1, title: "New Title", body: "...", userId: 1 });
 *
 * --- deleteItem<T, ListMeta, Id>(config, key) ---
 *   Deletes an entity (DELETE to item URL). key: Id (number or composite object).
 *   Returns: Promise<void>.
 *   Example: await deleteItem(config, 1);  or  await deleteItem(config, { memberId: 1, key: "x" });
 *
 * --- Example: API returns array directly ---
 *   const config: CrudServiceConfig<Post> = { entityKey: "posts", baseUrl: "/api/posts", notFoundMessage: "Post not found" };
 *   const posts = await fetchList(config);
 *   const post = await fetchItem(config, 1);
 *   const created = await createItem(config, { title: "Hi", body: "...", userId: 1 });
 *   const updated = await updateItem(config, { id: 1, title: "Updated", body: "...", userId: 1 });
 *   await deleteItem(config, 1);
 *
 * --- Example: API wraps list (listFromResponse) ---
 *   const config: CrudServiceConfig<Post> = {
 *     entityKey: "posts", baseUrl: "https://api.example.com/posts",
 *     listFromResponse: (body) => (body as { results: Post[] }).results,
 *   };
 *   const posts = await fetchList(config);  // Post[]
 *
 * --- Example: API returns list + metadata (parseListResponse) ---
 *   type Meta = { info: { count: number; pages: number } };
 *   const config: CrudServiceConfig<Post, Meta> = {
 *     entityKey: "posts", baseUrl: "/api/posts",
 *     parseListResponse: (body) => {
 *       const { results, info } = body as { results: Post[]; info: Meta["info"] };
 *       return { list: results, info };
 *     },
 *   };
 *   const result = await fetchList(config);  // { list: Post[]; info: { count; pages } }
 *
 * --- Example: Composite key (memberId + key) ---
 *   type MemberItemKey = { memberId: number; key: string };
 *   interface MemberItem extends MemberItemKey { name: string; }
 *   const config: CrudServiceConfig<MemberItem, undefined, MemberItemKey> = {
 *     entityKey: "member-items",
 *     baseUrl: "/api/members/1/items",
 *     getItemUrl: (k) => `/api/members/${k.memberId}/items/${k.key}`,
 *     getKeyFromEntity: (e) => ({ memberId: e.memberId, key: e.key }),
 *   };
 *   const item = await fetchItem(config, { memberId: 1, key: "x" });
 *   await updateItem(config, { memberId: 1, key: "x", name: "Updated" });
 *   await deleteItem(config, { memberId: 1, key: "x" });
 */

