import {
  buildListUrl,
  createItem,
  deleteItem,
  fetchItem,
  fetchList,
  isSameKey,
  updateItem,
  type CrudEntity,
  type ListResponse,
} from "@/services/CRUDLogic";

interface MockEntity extends CrudEntity {
  name: string;
}

// jsdom does not provide fetch/Response, and undici needs TextDecoder (missing in jsdom). Use a minimal mock.
beforeAll(() => {
  const g = global as unknown as {
    fetch?: typeof fetch;
    Response?: typeof Response;
  };
  if (typeof g.Response === "undefined") {
    class MockResponse {
      ok: boolean;
      body: string;
      constructor(
        body: string,
        init?: { status?: number; headers?: Record<string, string> }
      ) {
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

describe("crudLogic", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("buildListUrl", () => {
    it("builds absolute URL with query params", () => {
      const url = buildListUrl("https://api.test/items", {
        status: "active",
        q: "test",
      });
      const parsed = new URL(url);
      expect(parsed.origin + parsed.pathname).toBe("https://api.test/items");
      expect(parsed.searchParams.get("status")).toBe("active");
      expect(parsed.searchParams.get("q")).toBe("test");
    });

    it("supports relative baseUrl when params provided", () => {
      const url = buildListUrl("/api/items", { status: "active" });
      expect(url).toBe("/api/items?status=active");
    });

    it("appends params when relative baseUrl already has query", () => {
      const url = buildListUrl("/api/items?x=1", { status: "active" });
      // parse relative URL using a base
      const parsed = new URL(url, "http://localhost");
      expect(parsed.pathname).toBe("/api/items");
      expect(parsed.searchParams.get("x")).toBe("1");
      expect(parsed.searchParams.get("status")).toBe("active");
    });

    it("omits null/undefined/empty string values", () => {
      const url = buildListUrl("/api/items", {
        a: "only",
        b: "",
        c: undefined,
        d: null,
      });
      expect(url).toBe("/api/items?a=only");
    });

    it("URL-encodes query params", () => {
      const url = buildListUrl("/api/items", { q: "a b&c" });
      // URLSearchParams may encode space as + or %20 depending on runtime.
      expect(url).toMatch(/^\/api\/items\?q=a(\+|%20)b%26c$/);
    });
  });

  describe("fetchList", () => {
    it("returns plain array when no parser configured", async () => {
      const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
        new Response(JSON.stringify([{ id: 1, name: "A" }] as MockEntity[]), {
          status: 200,
        })
      );

      const data = await fetchList<MockEntity>(
        { entityKey: "items", baseUrl: "/api/items" },
        undefined
      );
      expect(data).toEqual([{ id: 1, name: "A" }]);
      expect(fetchSpy).toHaveBeenCalledWith("/api/items");
    });

    it("uses listFromResponse when configured", async () => {
      jest
        .spyOn(global, "fetch")
        .mockResolvedValue(
          new Response(
            JSON.stringify({ results: [{ id: 1, name: "Unwrapped" }] }),
            { status: 200 }
          )
        );

      const data = await fetchList<MockEntity>({
        entityKey: "items",
        baseUrl: "/api/items",
        listFromResponse: (body) => (body as { results: MockEntity[] }).results,
      });

      expect(data).toEqual([{ id: 1, name: "Unwrapped" }]);
    });

    it("uses parseListResponse when configured (preserves meta)", async () => {
      jest.spyOn(global, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({
            results: [{ id: 1, name: "WithMeta" }],
            info: { count: 1 },
          }),
          { status: 200 }
        )
      );

      type Meta = { info: { count: number } };
      const config = {
        entityKey: "items",
        baseUrl: "/api/items",
        parseListResponse: (body: unknown): ListResponse<MockEntity, Meta> => {
          const b = body as { results: MockEntity[]; info: Meta["info"] };
          return { list: b.results, info: b.info };
        },
      };

      const data = await fetchList<MockEntity, Meta>(config);
      expect(data).toEqual({
        list: [{ id: 1, name: "WithMeta" }],
        info: { count: 1 },
      });
    });

    it("throws on non-OK responses", async () => {
      jest
        .spyOn(global, "fetch")
        .mockResolvedValue(
          new Response(JSON.stringify({ error: "nope" }), { status: 500 })
        );

      await expect(
        fetchList<MockEntity>({ entityKey: "items", baseUrl: "/api/items" })
      ).rejects.toThrow("Failed to fetch items");
    });
  });

  describe("fetchItem", () => {
    it("returns parsed JSON on success", async () => {
      jest
        .spyOn(global, "fetch")
        .mockResolvedValue(
          new Response(JSON.stringify({ id: 1, name: "A" }), { status: 200 })
        );

      const data = await fetchItem<MockEntity>(
        { entityKey: "items", baseUrl: "/api/items" },
        1
      );
      expect(data).toEqual({ id: 1, name: "A" });
    });

    it("throws notFoundMessage when non-OK", async () => {
      jest
        .spyOn(global, "fetch")
        .mockResolvedValue(new Response(JSON.stringify({}), { status: 404 }));

      await expect(
        fetchItem<MockEntity>(
          {
            entityKey: "items",
            baseUrl: "/api/items",
            notFoundMessage: "Item missing",
          },
          1
        )
      ).rejects.toThrow("Item missing");
    });
  });

  describe("request contracts", () => {
    it("createItem sends POST with JSON body + content-type", async () => {
      const fetchSpy = jest
        .spyOn(global, "fetch")
        .mockResolvedValue(
          new Response(JSON.stringify({ id: 1, name: "A" }), { status: 200 })
        );

      await createItem<MockEntity>(
        { entityKey: "items", baseUrl: "/api/items" },
        { name: "A" }
      );

      expect(fetchSpy).toHaveBeenCalledWith("/api/items", {
        method: "POST",
        body: JSON.stringify({ name: "A" }),
        headers: { "Content-type": "application/json" },
      });
    });

    it("updateItem sends PATCH to /:id with JSON body + content-type", async () => {
      const fetchSpy = jest
        .spyOn(global, "fetch")
        .mockResolvedValue(
          new Response(JSON.stringify({ id: 1, name: "B" }), { status: 200 })
        );

      await updateItem<MockEntity>(
        { entityKey: "items", baseUrl: "/api/items" },
        { id: 1, name: "B" }
      );

      expect(fetchSpy).toHaveBeenCalledWith("/api/items/1", {
        method: "PATCH",
        body: JSON.stringify({ id: 1, name: "B" }),
        headers: { "Content-type": "application/json" },
      });
    });

    it("deleteItem sends DELETE to /:id", async () => {
      const fetchSpy = jest
        .spyOn(global, "fetch")
        .mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

      await deleteItem<MockEntity>(
        { entityKey: "items", baseUrl: "/api/items" },
        1
      );

      expect(fetchSpy).toHaveBeenCalledWith("/api/items/1", {
        method: "DELETE",
      });
    });
  });

  describe("composite key", () => {
    type MemberItemKey = { memberId: number; key: string };
    interface MemberItem extends MemberItemKey {
      name: string;
    }

    const compositeConfig: import("@/services/CRUDLogic").CrudServiceConfig<
      MemberItem,
      undefined,
      MemberItemKey
    > = {
      entityKey: "member-items",
      baseUrl: "/api/members/1/items",
      getItemUrl: (k) => `/api/members/${k.memberId}/items/${k.key}`,
      getKeyFromEntity: (e) => ({ memberId: e.memberId, key: e.key }),
    };

    it("fetchItem uses getItemUrl for composite key", async () => {
      jest.spyOn(global, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({ memberId: 1, key: "x", name: "Item X" }),
          { status: 200 }
        )
      );

      const data = await fetchItem<MemberItem, undefined, MemberItemKey>(
        compositeConfig,
        { memberId: 1, key: "x" }
      );

      expect(data).toEqual({ memberId: 1, key: "x", name: "Item X" });
      expect(global.fetch).toHaveBeenCalledWith("/api/members/1/items/x");
    });

    it("updateItem uses getKeyFromEntity and getItemUrl", async () => {
      const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({ memberId: 1, key: "x", name: "Updated" }),
          { status: 200 }
        )
      );

      await updateItem<MemberItem, undefined, MemberItemKey>(compositeConfig, {
        memberId: 1,
        key: "x",
        name: "Updated",
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/members/1/items/x",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            memberId: 1,
            key: "x",
            name: "Updated",
          }),
        })
      );
    });

    it("deleteItem uses getItemUrl for composite key", async () => {
      const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
        new Response(JSON.stringify({}), { status: 200 })
      );

      await deleteItem<MemberItem, undefined, MemberItemKey>(compositeConfig, {
        memberId: 1,
        key: "x",
      });

      expect(fetchSpy).toHaveBeenCalledWith("/api/members/1/items/x", {
        method: "DELETE",
      });
    });

    describe("isSameKey", () => {
      it("compares numeric keys", () => {
        const config = { entityKey: "items", baseUrl: "/api/items" };
        expect(isSameKey(config, { id: 1, name: "A" }, 1)).toBe(true);
        expect(isSameKey(config, { id: 1, name: "A" }, 2)).toBe(false);
      });

      it("compares composite keys by all key fields", () => {
        expect(
          isSameKey(compositeConfig, { memberId: 1, key: "x", name: "A" }, { memberId: 1, key: "x" })
        ).toBe(true);
        expect(
          isSameKey(compositeConfig, { memberId: 1, key: "x", name: "A" }, { memberId: 1, key: "y" })
        ).toBe(false);
      });

      it("returns false for key type mismatch", () => {
        expect(
          isSameKey(
            compositeConfig as unknown as import("@/services/CRUDLogic").CrudServiceConfig<
              MemberItem,
              undefined,
              number
            >,
            { memberId: 1, key: "x", name: "A" } as unknown as MemberItem,
            1
          )
        ).toBe(false);
      });
    });
  });
});
