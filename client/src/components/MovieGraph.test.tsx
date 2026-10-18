import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { server } from "../test/server";
import MovieGraph from "./MovieGraph";
import LocationDisplay from "../test/LocationDisplay";
import type { MovieGraphData, MovieGraphNode } from "./movieGraphData";

// mocks graph due to jsdom limitations for canvas rendering
vi.mock("react-force-graph-2d", () => ({
default: ({
    graphData,
    onNodeClick,
    onNodeHover,
    nodeCanvasObject,
}: Readonly<{
    graphData: MovieGraphData;
    onNodeClick: (node: MovieGraphNode) => void;
    onNodeHover?: (node: MovieGraphNode | null) => void;
    nodeCanvasObject?: (node: MovieGraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => void;
}>) => (
    <div data-testid="graph">
    {graphData.nodes.map((node) => {
        let fillColor = "";
        let alpha = 1;


        const fakeCtx = {
            // spied fields used in constructor - required
            beginPath: vi.fn<CanvasRenderingContext2D["beginPath"]>(),
            arc: vi.fn<CanvasRenderingContext2D["arc"]>(),
            fill: vi.fn<() => void>(),
            stroke: vi.fn<() => void>(),

            // fill hook when rendered, capture value
            set fillStyle(val: string) {
                if (!fillColor) {
                fillColor = val;
                }
            },
            // first value set is the node's own opacity (it is reset to 1 afterwards)
            set globalAlpha(val: number) {
                if (alpha === 1) {
                alpha = val;
                }
            },
        } as unknown as CanvasRenderingContext2D; // force mock as canvas context

        // write node into the mocked canvas
        if (nodeCanvasObject) {
            nodeCanvasObject(node, fakeCtx, 1);
        }

        // check node color (indicating level 0/1/2), true = level 0/1
        const isExpanded = fillColor !== "#5c5866";

        // returns button per node to mock as clickable on canvas
        return (
            <button
                key={node.id}
                type="button"
                data-node-id={node.id}
                data-faded={alpha < 1} // read to check hover highlighting in tests
                aria-expanded={isExpanded} // read to check expansion state in tests
                onClick={() => onNodeClick(node)}
                onMouseEnter={() => onNodeHover?.(node)}
                onMouseLeave={() => onNodeHover?.(null)}
            >
                {node.title}
            </button>
        );
    })}
    </div>
),
}));

    function rawMovie(id: number, title: string) {
    return {
        id,
        title,
        release_date: "2001-01-01",
        poster_path: null,
        overview: null,
        genre_ids: null,
        vote_average: null,
    };
    }

    /** Recommendations that differ per movie, so expanding a node adds something new. */
function useBranchingRecommendations() {
    server.use(
        http.get("https://api.themoviedb.org/3/movie/:id/recommendations", ({ params }) => {
        const results =
            Number(params.id) === 1
            ? [rawMovie(100, "First Neighbour")]
            : [rawMovie(200, "Second Neighbour")];

        return HttpResponse.json({
            results,
            page: 1,
            total_pages: 1,
            total_results: results.length,
        });
        }),
    );
}

function useMultiLevelRecommendations() {
    server.use(
        http.get("https://api.themoviedb.org/3/movie/:id/recommendations", ({ params }) => {
        const id = Number(params.id);
        // something like root below, except movie A links back to root (https://diagon.arthursonzogni.com/)
        // ┌────────────┐      
        // │root        │      
        // └┬──────────┬┘      
        // ┌▽────────┐┌▽───────┐
        // │movie B  │ │movie A │
        // └┬───────┬┘ └┬───────┘
        // ┌▽─────┐┌▽──▽──┐    
        // │unique│ │shared│    
        // └──────┘ └──────┘    

        if (id === 1) {
            // root returns level 1s A and B
            return HttpResponse.json({
            results: [rawMovie(2, "movie A"), rawMovie(3, "movie B")],
            });
        }
        if (id === 2) {
            // movie A links back to root and level 2 shared
            return HttpResponse.json({
            results: [rawMovie(4, "shared"), rawMovie(1, "Root Movie")],
            });
        }
        if (id === 3) {
            // movie B
            return HttpResponse.json({
            results: [rawMovie(4, "shared"), rawMovie(5, "unique")],
            });
        }
        return HttpResponse.json({ results: [] });
        }),
    );
}

function renderGraph() {
    return render(
        <MemoryRouter>
            <MovieGraph movieId={1} title="Root Movie" year={1999} />
            <LocationDisplay />
        </MemoryRouter>,
    );
}

describe("MovieGraph", () => {
    beforeAll(() => {
        // jsdom reports every element as zero-width; the canvas needs a real width.
        Object.defineProperty(HTMLElement.prototype, "clientWidth", {
        configurable: true,
        value: 800,
        });
    });

    it("shows the movie itself while its connections load", () => {
        renderGraph();

        expect(screen.getByRole("button", { name: "Root Movie" })).toBeInTheDocument();
        expect(screen.getByText(/Loading related movies/i)).toBeInTheDocument();
    });

    it("adds the related movies once they load", async () => {
        useBranchingRecommendations();
        renderGraph();

        expect(await screen.findByRole("button", { name: "First Neighbour" })).toBeInTheDocument();
        expect(screen.getByText("3 movies, 2 connections")).toBeInTheDocument();
    });

    it("does not duplicate nodes when referenced twice", async () => {
        useMultiLevelRecommendations();
        renderGraph();

        // Wait for the complete 2-level graph to finish rendering
        await screen.findByRole("button", { name: "unique" });

        // only count node buttons inside the graph (not overlay controls like the AI button)
        const allButtons = within(screen.getByTestId("graph")).getAllByRole("button");
        const nodeIds = allButtons.map((btn) => btn.getAttribute("data-node-id"));

        // Verify exactly 5 unique nodes were created (Root, 2x L1, 2x L2)
        expect(allButtons).toHaveLength(5);
        expect(new Set(nodeIds).size).toBe(5);
    });

    it("does not mark level 2 recommendation nodes as expanded on initial load", async () => {
        useMultiLevelRecommendations();
        renderGraph();

        await screen.findByRole("button", { name: "unique" });

        // Root and Level 1 nodes should be marked expanded
        expect(screen.getByRole("button", { name: "Root Movie" })).toHaveAttribute("aria-expanded", "true");
        expect(screen.getByRole("button", { name: "movie A" })).toHaveAttribute("aria-expanded", "true");
        expect(screen.getByRole("button", { name: "movie B" })).toHaveAttribute("aria-expanded", "true");
        // Level 2 nodes must NOT be marked expanded
        expect(screen.getByRole("button", { name: "shared" })).toHaveAttribute("aria-expanded", "false");
        expect(screen.getByRole("button", { name: "unique" })).toHaveAttribute("aria-expanded", "false");
    });

    it("stays put when the movie at the centre is clicked", async () => {
        useBranchingRecommendations();
        renderGraph();

        // wait until all neighbors load (2nd is last)
        await screen.findByRole("button", { name: "Second Neighbour" });

        await userEvent.click(screen.getByRole("button", { name: "Root Movie" }));

        expect(screen.getByTestId("location-display").textContent).toBe("/");
    });

    it("explains what the node colours mean", () => {
        renderGraph();

        const key = screen.getByRole("list", { name: "Graph key" });
        expect(within(key).getByText("This movie")).toBeInTheDocument();
        expect(within(key).getByText("Recommended for this movie")).toBeInTheDocument();
        expect(within(key).getByText("Related through another movie")).toBeInTheDocument();
    });

    it("has zoom and fit-to-view controls", () => {
        renderGraph();

        expect(screen.getByRole("button", { name: "Zoom in" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Zoom out" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Fit graph to view" })).toBeInTheDocument();
    });

    it("fades movies that aren't connected to the hovered one", async () => {
        useMultiLevelRecommendations();
        renderGraph();
        await screen.findByRole("button", { name: "unique" });

        await userEvent.hover(screen.getByRole("button", { name: "movie B" }));

        // movie B links to the root, "shared" and "unique"; movie A does not link to it
        expect(screen.getByRole("button", { name: "movie B" })).toHaveAttribute("data-faded", "false");
        expect(screen.getByRole("button", { name: "Root Movie" })).toHaveAttribute("data-faded", "false");
        expect(screen.getByRole("button", { name: "shared" })).toHaveAttribute("data-faded", "false");
        expect(screen.getByRole("button", { name: "unique" })).toHaveAttribute("data-faded", "false");
        expect(screen.getByRole("button", { name: "movie A" })).toHaveAttribute("data-faded", "true");

        await userEvent.unhover(screen.getByRole("button", { name: "movie B" }));

        expect(screen.getByRole("button", { name: "movie A" })).toHaveAttribute("data-faded", "false");
    });

    it("clears the hover highlight when the page moves to another movie", async () => {
        useMultiLevelRecommendations();
        const { rerender } = renderGraph();
        await screen.findByRole("button", { name: "unique" });
        await userEvent.hover(screen.getByRole("button", { name: "shared" }));

        // e.g. a movie picked from the recommendations row, not from the graph
        rerender(
            <MemoryRouter>
                <MovieGraph movieId={3} title="movie B" year={2001} />
            </MemoryRouter>,
        );
        await screen.findByText("3 movies, 2 connections");

        // "unique" isn't linked to "shared", so it would be faded if the old hover stuck
        expect(screen.getByRole("button", { name: "unique" })).toHaveAttribute("data-faded", "false");
    });

    it("says so when there are no related movies", async () => {
        server.use(
            http.get("https://api.themoviedb.org/3/movie/:id/recommendations", () =>
                HttpResponse.json({ results: [], page: 1, total_pages: 1, total_results: 0 }),
            ),
        );
        renderGraph();

        expect(await screen.findByText("No related movies found.")).toBeInTheDocument();
    });

    it("leaves plain scrolling to the page and explains how to zoom", () => {
        renderGraph();
        const canvas = screen.getByTestId("graph").parentElement as HTMLElement;

        fireEvent.wheel(canvas, { deltaY: 100, ctrlKey: true });
        expect(screen.queryByText(/\+ scroll to zoom/)).not.toBeInTheDocument();

        fireEvent.wheel(canvas, { deltaY: 100 });
        expect(screen.getByText("Use Ctrl + scroll to zoom")).toBeInTheDocument();
    });

    it("reports a failure to load related movies", async () => {
        server.use(
        http.get("https://api.themoviedb.org/3/movie/:id/recommendations", () =>
            HttpResponse.json({ status_message: "nope" }, { status: 500 }),
        ),
        );
        renderGraph();

        expect(await screen.findByText(/Could not load related movies/i)).toBeInTheDocument();
    });
});
