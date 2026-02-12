import React from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createCrudService,
  type CrudEntity,
} from "@/services/CRUDService";

interface MockEntity extends CrudEntity {
  name: string;
}

// jsdom does not provide fetch/Response, and undici needs TextDecoder (missing in jsdom). Use a minimal mock.
beforeAll(() => {
  const g = global as unknown as { fetch?: typeof fetch; Response?: typeof Response };
  if (typeof g.Response === "undefined") {
    class MockResponse {
      ok: boolean;
      body: string;
      constructor(body: string, init?: { status?: number; headers?: Record<string, string> }) {
        this.body = body;
        this.ok = (init?.status ?? 200) >= 200 && (init?.status ?? 200) < 300;
      }
      async json() {
        return JSON.parse(this.body);
      }
    }
    g.Response = MockResponse as unknown as typeof Response;
  }
  if (typeof g.fetch === "undefined") {
    g.fetch = jest.fn();
  }
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false },
      mutations: { retry: false },
    },
  });
  const wrapper = function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
  return { wrapper, queryClient };
}

describe("createCrudService", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    cleanup();
  });

  function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }

  describe("return shape and query keys", () => {
    it("returns queryKeys and all hook factories", () => {
      const service = createCrudService<MockEntity>({
        entityKey: "items",
        baseUrl: "/api/items",
      });

      expect(service.queryKeys).toBeDefined();
      expect(service.useGetList).toBeDefined();
      expect(service.useGetItem).toBeDefined();
      expect(service.useCreate).toBeDefined();
      expect(service.useUpdate).toBeDefined();
      expect(service.useDelete).toBeDefined();

      expect(service.queryKeys.all).toEqual(["items"]);
      expect(service.queryKeys.lists()).toEqual(["items", "list"]);
      expect(service.queryKeys.details()).toEqual(["items", "detail"]);
      expect(service.queryKeys.detail(1)).toEqual(["items", "detail", 1]);
    });

    it("includes list params in query key when ListParams generic is used", () => {
      const service = createCrudService<
        MockEntity,
        undefined,
        { status?: string }
      >({
        entityKey: "items",
        baseUrl: "/api/items",
      });

      expect(service.queryKeys.lists()).toEqual(["items", "list"]);
      expect(service.queryKeys.lists({ status: "active" })).toEqual([
        "items",
        "list",
        { status: "active" },
      ]);
    });
  });

  describe("useGetList URL building", () => {
    it("fetches base URL when no params", async () => {
      const service = createCrudService<MockEntity>({
        entityKey: "items",
        baseUrl: "https://api.test/items",
      });

      const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
        new Response(JSON.stringify([{ id: 1, name: "A" }]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => service.useGetList(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(fetchSpy).toHaveBeenCalledWith("https://api.test/items");
      fetchSpy.mockRestore();
    });

    it("fetches URL with query params when ListParams provided", async () => {
      const service = createCrudService<
        MockEntity,
        undefined,
        { status?: string; q?: string }
      >({
        entityKey: "items",
        baseUrl: "https://api.test/items",
      });

      const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
        new Response(JSON.stringify([{ id: 1, name: "A" }]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(
        () => service.useGetList({ status: "active", q: "test" }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.test/items?status=active&q=test"
      );
      fetchSpy.mockRestore();
    });

    it("supports relative baseUrl when ListParams provided", async () => {
      const service = createCrudService<
        MockEntity,
        undefined,
        { status?: string }
      >({
        entityKey: "items",
        baseUrl: "/api/items",
      });

      const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
        new Response(JSON.stringify([{ id: 1, name: "A" }]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => service.useGetList({ status: "active" }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(fetchSpy).toHaveBeenCalledWith("/api/items?status=active");
      fetchSpy.mockRestore();
    });

    it("omits null/undefined/empty string params from URL", async () => {
      const service = createCrudService<
        MockEntity,
        undefined,
        { a?: string; b?: string }
      >({
        entityKey: "items",
        baseUrl: "https://api.test/items",
      });

      const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const { wrapper } = createWrapper();
      renderHook(
        () =>
          service.useGetList({
            a: "only",
            b: "",
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalled();
      });

      const calledUrl = (fetchSpy.mock.calls[0] as [string])[0];
      expect(calledUrl).toContain("a=only");
      expect(calledUrl).not.toContain("b=");
      fetchSpy.mockRestore();
    });
  });

  describe("listFromResponse", () => {
    it("uses listFromResponse when configured", async () => {
      const service = createCrudService<MockEntity>({
        entityKey: "items",
        baseUrl: "https://api.test/items",
        listFromResponse: (body) => (body as { results: MockEntity[] }).results,
      });

      const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({ results: [{ id: 1, name: "Unwrapped" }] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => service.useGetList(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([{ id: 1, name: "Unwrapped" }]);
      fetchSpy.mockRestore();
    });
  });

  describe("parseListResponse", () => {
    it("returns list + meta object when configured", async () => {
      type Meta = { info: { count: number } };
      const service = createCrudService<MockEntity, Meta>({
        entityKey: "items",
        baseUrl: "https://api.test/items",
        parseListResponse: (body) => {
          const b = body as { results: MockEntity[]; info: Meta["info"] };
          return { list: b.results, info: b.info };
        },
      });

      jest.spyOn(global, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({
            results: [{ id: 1, name: "A" }],
            info: { count: 1 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => service.useGetList(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({ list: [{ id: 1, name: "A" }], info: { count: 1 } });
    });
  });

  describe("useGetItem", () => {
    it("does not fetch when id is 0 (disabled)", async () => {
      const service = createCrudService<MockEntity>({
        entityKey: "items",
        baseUrl: "/api/items",
      });

      const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ id: 1, name: "A" }), { status: 200 })
      );

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => service.useGetItem(0), { wrapper });

      await waitFor(() => {
        expect(result.current.fetchStatus).toBe("idle");
      });

      // The important behavior is that the disabled query doesn't fetch the detail endpoint.
      // (Other tests/hooks may still trigger fetches in the same process.)
      const calledUrls = fetchSpy.mock.calls.map((c) => c[0]);
      expect(calledUrls.some((u) => String(u).endsWith("/api/items/0"))).toBe(false);
    });
  });

  describe("optimistic updates (create/delete)", () => {
    it("optimistically prepends created item (array list) and rolls back on error", async () => {
      const service = createCrudService<MockEntity>({
        entityKey: "items",
        baseUrl: "/api/items",
      });

      const nowSpy = jest.spyOn(Date, "now").mockReturnValue(123);
      const d = deferred<Response>();
      const fetchSpy = jest.spyOn(global, "fetch").mockReturnValue(d.promise as unknown as Promise<Response>);

      const { wrapper, queryClient } = createWrapper();
      queryClient.setQueryData(service.queryKeys.lists(), [{ id: 1, name: "A" }]);

      const { result } = renderHook(() => service.useCreate(), { wrapper });

      act(() => {
        result.current.mutate({ name: "B" });
      });

      await waitFor(() => {
        expect(queryClient.getQueryData(service.queryKeys.lists())).toEqual([
          { id: 123, name: "B" },
          { id: 1, name: "A" },
        ]);
      });

      // Now fail the request to trigger rollback.
      act(() => {
        d.reject(new Error("network"));
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      await waitFor(() => {
        expect(queryClient.getQueryData(service.queryKeys.lists())).toEqual([{ id: 1, name: "A" }]);
      });

      nowSpy.mockRestore();
      fetchSpy.mockRestore();
    });

    it("optimistically removes deleted item (array list) and rolls back on error", async () => {
      const service = createCrudService<MockEntity>({
        entityKey: "items",
        baseUrl: "/api/items",
      });

      const d = deferred<Response>();
      const fetchSpy = jest.spyOn(global, "fetch").mockReturnValue(d.promise as unknown as Promise<Response>);

      const { wrapper, queryClient } = createWrapper();
      queryClient.setQueryData(service.queryKeys.lists(), [
        { id: 1, name: "A" },
        { id: 2, name: "B" },
      ]);

      const { result } = renderHook(() => service.useDelete(), { wrapper });

      act(() => {
        result.current.mutate(2);
      });

      await waitFor(() => {
        expect(queryClient.getQueryData(service.queryKeys.lists())).toEqual([{ id: 1, name: "A" }]);
      });

      act(() => {
        d.reject(new Error("network"));
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      await waitFor(() => {
        expect(queryClient.getQueryData(service.queryKeys.lists())).toEqual([
          { id: 1, name: "A" },
          { id: 2, name: "B" },
        ]);
      });

      fetchSpy.mockRestore();
    });

    it("preserves meta shape when optimistically creating/deleting with parseListResponse", async () => {
      type Meta = { info: { count: number } };
      const service = createCrudService<MockEntity, Meta>({
        entityKey: "items",
        baseUrl: "/api/items",
        parseListResponse: (body) => body as any,
      });

      const nowSpy = jest.spyOn(Date, "now").mockReturnValue(999);

      const { wrapper, queryClient } = createWrapper();
      queryClient.setQueryData(service.queryKeys.lists(), {
        list: [{ id: 1, name: "A" }],
        info: { count: 1 },
      });

      const createDeferred = deferred<Response>();
      jest
        .spyOn(global, "fetch")
        .mockReturnValueOnce(createDeferred.promise as unknown as Promise<Response>);

      const { result: createResult } = renderHook(() => service.useCreate(), { wrapper });
      act(() => {
        createResult.current.mutate({ name: "B" });
      });

      await waitFor(() => {
        expect(queryClient.getQueryData(service.queryKeys.lists())).toEqual({
          list: [
            { id: 999, name: "B" },
            { id: 1, name: "A" },
          ],
          info: { count: 1 },
        });
      });

      act(() => {
        createDeferred.reject(new Error("network"));
      });

      await waitFor(() => {
        expect(createResult.current.isError).toBe(true);
      });

      // rollback
      await waitFor(() => {
        expect(queryClient.getQueryData(service.queryKeys.lists())).toEqual({
          list: [{ id: 1, name: "A" }],
          info: { count: 1 },
        });
      });

      // delete path
      const deleteDeferred = deferred<Response>();
      jest
        .spyOn(global, "fetch")
        .mockReturnValueOnce(deleteDeferred.promise as unknown as Promise<Response>);

      const { result: deleteResult } = renderHook(() => service.useDelete(), { wrapper });
      act(() => {
        deleteResult.current.mutate(1);
      });
      await waitFor(() => {
        expect(queryClient.getQueryData(service.queryKeys.lists())).toEqual({
          list: [],
          info: { count: 1 },
        });
      });

      act(() => {
        deleteDeferred.reject(new Error("network"));
      });

      await waitFor(() => {
        expect(deleteResult.current.isError).toBe(true);
      });

      await waitFor(() => {
        expect(queryClient.getQueryData(service.queryKeys.lists())).toEqual({
          list: [{ id: 1, name: "A" }],
          info: { count: 1 },
        });
      });

      nowSpy.mockRestore();
    });
  });

  describe("useUpdate", () => {
    it("sets detail cache and invalidates lists on success", async () => {
      const service = createCrudService<MockEntity>({
        entityKey: "items",
        baseUrl: "/api/items",
      });

      jest.spyOn(global, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ id: 1, name: "Updated" }), { status: 200 })
      );

      const { wrapper, queryClient } = createWrapper();
      const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => service.useUpdate(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ id: 1, name: "Updated" });
      });

      expect(queryClient.getQueryData(service.queryKeys.detail(1))).toEqual({
        id: 1,
        name: "Updated",
      });
      expect(invalidateSpy).toHaveBeenCalled();
    });
  });
});
