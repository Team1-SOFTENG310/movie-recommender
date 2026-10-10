import { getRandomMovie } from "./movies.controller.js";
import {randomInt} from "node:crypto";
import { describe, it, expect, vi, beforeEach } from "vitest";

// mock randomInt function to override
vi.mock("node:crypto", () => ({
    randomInt: vi.fn()
}));

describe("getRandomMovie", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("returns correct indexed data", async () => {
        vi.mocked(randomInt).mockReturnValue(0);

        vi.spyOn(globalThis, "fetch").mockResolvedValue(
            new Response(
            JSON.stringify({
                results: [{ name: "this" }, { name: "that" }]
            }),
            )
        );

        const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
        };

        await getRandomMovie({}, res);

        expect(res.json).toHaveBeenCalledWith({name:"this"});
    });
})