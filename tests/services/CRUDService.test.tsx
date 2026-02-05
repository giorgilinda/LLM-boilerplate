import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createCrudService,
  type CrudEntity,
} from "@/services/CRUDService";

interface MockEntity extends CrudEntity {
  name: string;
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("createCrudService", () => {
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

      const wrapper = createWrapper();
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

      const wrapper = createWrapper();
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

      const wrapper = createWrapper();
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

      jest.spyOn(global, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({ results: [{ id: 1, name: "Unwrapped" }] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const wrapper = createWrapper();
      const { result } = renderHook(() => service.useGetList(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([{ id: 1, name: "Unwrapped" }]);
    });
  });
});
