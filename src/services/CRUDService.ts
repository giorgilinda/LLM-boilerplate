import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";

import {
  createItem,
  deleteItem,
  fetchItem,
  fetchList,
  updateItem,
} from "./CRUDLogic";
import type {
  CrudEntity,
  CrudServiceConfig,
  ListData,
  ListResponse,
} from "./CRUDLogic";

// --- GENERIC CRUD SERVICE ---

export type {
  CrudEntity,
  CrudServiceConfig,
  ListData,
  ListResponse,
  ListWithInfo,
} from "./CRUDLogic";

/** Query key factory returned by createCrudService. */
export interface CrudQueryKeys<ListParams = void> {
  all: readonly [string];
  lists: (params?: ListParams) => readonly unknown[];
  details: () => readonly [string, string];
  detail: (id: number) => readonly [string, string, number];
}

/** Return type of createCrudService. */
export interface CrudServiceResult<
  T extends CrudEntity,
  ListMeta = undefined,
  ListParams = void
> {
  queryKeys: CrudQueryKeys<ListParams>;
  useGetList: (
    params?: ListParams
  ) => ReturnType<typeof useQuery<ListData<T, ListMeta>>>;
  useGetItem: (id: number) => ReturnType<typeof useQuery<T>>;
  useCreate: () => ReturnType<typeof useMutation<T, Error, Omit<T, "id">>>;
  useUpdate: () => ReturnType<typeof useMutation<T, Error, T>>;
  useDelete: () => ReturnType<typeof useMutation<number, Error, number>>;
}

/**
 * Creates a generic CRUD service for TanStack Query.
 * Supports list, detail, create (optimistic), update, and delete (optimistic).
 *
 * List responses:
 * - No config: API returns T[] → hook returns T[].
 * - listFromResponse: unwrap to T[] (e.g. body.results) → hook returns T[].
 * - parseListResponse: return { list: T[], ...meta } → hook returns full object; mutations preserve meta.
 *
 * List params (optional): Use the third generic ListParams to type query params for the list endpoint.
 * Pass an object to useGetList(params); it is serialized as URL search params (e.g. ?status=alive&species=Human).
 *
 * @param config - Entity key, base URL, and optional list parsers
 * @returns Query keys and hooks for the entity
 *
 * @example List only (simple)
 * createCrudService<Post>({ entityKey: "posts", baseUrl: "/api/posts" })
 *
 * @example List + metadata (any shape)
 * createCrudService<Item, { info: Info; next?: string }>({
 *   entityKey: "items", baseUrl: "/api/items",
 *   parseListResponse: (body) => ({ list: body.data, info: body.info, next: body.links?.next }),
 * })
 *
 * @example Server-side list params (third generic)
 * createCrudService<Character, CharListMeta, { status?: string; species?: string }>({ ... })
 * useGetList({ status: "alive", species: "Human" })  // GET /api/character?status=alive&species=Human
 */
export function createCrudService<
  T extends CrudEntity,
  ListMeta = undefined,
  ListParams = void
>(
  config: CrudServiceConfig<T, ListMeta>
): CrudServiceResult<T, ListMeta, ListParams> {
  const { entityKey, parseListResponse } = config;

  const hasListMeta = !!parseListResponse;

  const queryKeys: CrudQueryKeys<ListParams> = {
    all: [entityKey] as const,
    lists: (params?: ListParams) =>
      (params != null
        ? ([...queryKeys.all, "list", params] as const)
        : ([...queryKeys.all, "list"] as const)) as readonly unknown[],
    details: () => [...queryKeys.all, "detail"] as const,
    detail: (id: number) => [...queryKeys.details(), id] as const,
  };

  const useGetList = (
    params?: ListParams
  ): ReturnType<CrudServiceResult<T, ListMeta, ListParams>["useGetList"]> =>
    useQuery({
      queryKey: queryKeys.lists(params),
      queryFn: async (): Promise<ListData<T, ListMeta>> => {
        return fetchList<T, ListMeta, ListParams>(config, params);
      },
    }) as ReturnType<CrudServiceResult<T, ListMeta, ListParams>["useGetList"]>;

  const useGetItem = (id: number) =>
    useQuery({
      queryKey: queryKeys.detail(id),
      queryFn: async (): Promise<T> => {
        return fetchItem<T, ListMeta>(config, id);
      },
      enabled: !!id,
    });

  const useCreate = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (newItem: Omit<T, "id">) => {
        return createItem<T, ListMeta>(config, newItem);
      },
      onMutate: async (newItem) => {
        await queryClient.cancelQueries({ queryKey: queryKeys.lists() });
        const previous = queryClient.getQueriesData<
          T[] | ListResponse<T, ListMeta>
        >({ queryKey: queryKeys.lists() });
        queryClient.setQueriesData<T[] | ListResponse<T, ListMeta>>(
          { queryKey: queryKeys.lists() },
          (old) => {
            const isListResponse =
              hasListMeta &&
              old != null &&
              typeof old === "object" &&
              "list" in old;
            const arr = isListResponse
              ? (old as ListResponse<T, ListMeta>).list
              : ((old ?? []) as T[]);
            const nextList = [{ ...newItem, id: Date.now() } as T, ...arr];
            return isListResponse
              ? { ...(old as ListResponse<T, ListMeta>), list: nextList }
              : nextList;
          }
        );
        return { previous };
      },
      onError: (_err, _newItem, context) => {
        (context?.previous as Array<[QueryKey, unknown]> | undefined)?.forEach(
          ([key, data]) => queryClient.setQueryData(key, data)
        );
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
      },
    });
  };

  const useUpdate = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (updatedItem: T) => {
        return updateItem<T, ListMeta>(config, updatedItem);
      },
      onSuccess: (data: T) => {
        queryClient.setQueryData(queryKeys.detail(data.id), data);
        queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
      },
    });
  };

  const useDelete = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (id: number) => {
        await deleteItem<T, ListMeta>(config, id);
        return id;
      },
      onMutate: async (id) => {
        await queryClient.cancelQueries({ queryKey: queryKeys.lists() });
        const previous = queryClient.getQueriesData<
          T[] | ListResponse<T, ListMeta>
        >({ queryKey: queryKeys.lists() });
        queryClient.setQueriesData<T[] | ListResponse<T, ListMeta>>(
          { queryKey: queryKeys.lists() },
          (old) => {
            const isListResponse =
              hasListMeta &&
              old != null &&
              typeof old === "object" &&
              "list" in old;
            const arr = isListResponse
              ? (old as ListResponse<T, ListMeta>).list
              : ((old ?? []) as T[]);
            const nextList = arr.filter((item) => item.id !== id);
            return isListResponse
              ? { ...(old as ListResponse<T, ListMeta>), list: nextList }
              : nextList;
          }
        );
        return { previous };
      },
      onError: (_err, _id, context) => {
        (context?.previous as Array<[QueryKey, unknown]> | undefined)?.forEach(
          ([key, data]) => queryClient.setQueryData(key, data)
        );
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
      },
    });
  };

  return {
    queryKeys,
    useGetList,
    useGetItem,
    useCreate,
    useUpdate,
    useDelete,
  };
}

/* --- USAGE EXAMPLES ---
 *
 * List response options:
 * - No list config: API returns T[] → hook returns T[].
 * - listFromResponse: unwrap to T[] (e.g. body.results) → hook returns T[].
 * - parseListResponse: return { list: T[], ...meta } → hook returns full object; mutations preserve meta.
 *
 * --- Example 1: API returns array directly (e.g. JSONPlaceholder) ---
 *
 * const postService = createCrudService<Post>({
 *   entityKey: "posts",
 *   baseUrl: "https://jsonplaceholder.typicode.com/posts",
 *   notFoundMessage: "Post not found",
 * });
 * export const useGetPosts = postService.useGetList;  // data: Post[] | undefined
 *
 * --- Example 2: API wraps list (e.g. { results: T[] }) — return only the list ---
 *
 * const postService = createCrudService<Post>({
 *   entityKey: "posts",
 *   baseUrl: "https://api.example.com/posts",
 *   listFromResponse: (body) => (body as { results: Post[] }).results,
 * });
 * export const useGetPosts = postService.useGetList;  // data: Post[] | undefined
 *
 * --- Example 3: API returns list + metadata (e.g. { results, info, next }) — access everything ---
 *
 * interface PostListMeta {
 *   info: { count: number; pages: number; next: string | null };
 *   nextPage?: string;
 * }
 * const postService = createCrudService<Post, PostListMeta>({
 *   entityKey: "posts",
 *   baseUrl: "https://api.example.com/posts",
 *   parseListResponse: (body) => {
 *     const { results, info, links } = body as { results: Post[]; info: PostListMeta["info"]; links?: { next: string } };
 *     return { list: results, info, nextPage: links?.next };
 *   },
 * });
 * export const useGetPosts = postService.useGetList;  // data: { list: Post[]; info: ...; nextPage?: string } | undefined
 *
 * --- Example 4: Server-side filtering (optional third generic ListParams) ---
 *
 * interface CharacterListParams { name?: string; status?: "alive" | "dead" | "unknown"; species?: string; }
 * const charService = createCrudService<Character, CharListMeta, CharacterListParams>({ ... });
 * const { data } = useGetCharacters({ status: "alive", species: "Human" });
 * // Fetches: /api/character?status=alive&species=Human
 *
 * --- Hook usage (same for all list shapes) ---
 *
 * 1. READ LIST:   const { data, isLoading } = useGetPosts();
 *                 // With server-side filters: useGetPosts({ status: "alive", species: "Human" })
 *                 // data is T[] (examples 1–2) or { list, ...meta } (example 3); use data?.list ?? data for items
 * 2. READ ITEM:   const { data: item } = useGetPost(1);
 * 3. CREATE:      const { mutate: create } = useCreatePost();
 *                 create({ title: "Hello", body: "World", userId: 1 });
 * 4. UPDATE:      const { mutate: update } = useUpdatePost();
 *                 update({ id: 1, title: "New Title", body: "...", userId: 1 });
 * 5. DELETE:      const { mutate: deleteItem } = useDeletePost();
 *                 deleteItem(1);
 */
