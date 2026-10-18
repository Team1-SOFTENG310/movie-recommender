import { describe, it, expect } from "vitest";
import {
  addRelatedMovies,
  createGraph,
  linkEndId,
  nodeLabel,
  type MovieGraphData,
} from "./movieGraphData";
import type { Movie } from "../types/movie";

function movie(id: number, title: string, year: number | null = 2020): Movie {
  return {
    id,
    title,
    year,
    posterUrl: null,
    overview: "",
    genreIds: [],
    voteAverage: null,
  };
}

const root = { id: 1, title: "Root Movie", year: 1999 };

describe("createGraph", () => {
  it("starts with the root movie and no links", () => {
    const graph = createGraph(root);

    expect(graph.nodes).toEqual([{ id: 1, title: "Root Movie", year: 1999, depth: 0 }]);
    expect(graph.links).toEqual([]);
  });
});

describe("addRelatedMovies", () => {
  it("adds a node and a link for each related movie", () => {
    const graph = addRelatedMovies(createGraph(root), 1, [movie(2, "A"), movie(3, "B")], 8);

    expect(graph.nodes.map((node) => node.id)).toEqual([1, 2, 3]);
    expect(graph.links).toEqual([
      { source: 1, target: 2 },
      { source: 1, target: 3 },
    ]);
  });

  it("records how far each movie sits from the root", () => {
    let graph = addRelatedMovies(createGraph(root), 1, [movie(2, "A")], 8);
    graph = addRelatedMovies(graph, 2, [movie(3, "B")], 8);

    expect(graph.nodes.map((node) => node.depth)).toEqual([0, 1, 2]);
  });

  it("stops at the limit", () => {
    const related = [movie(2, "A"), movie(3, "B"), movie(4, "C")];
    const graph = addRelatedMovies(createGraph(root), 1, related, 2);

    expect(graph.nodes.map((node) => node.id)).toEqual([1, 2, 3]);
  });

  it("links to a movie that is already in the graph instead of duplicating it", () => {
    let graph = addRelatedMovies(createGraph(root), 1, [movie(2, "A"), movie(3, "B")], 8);
    graph = addRelatedMovies(graph, 2, [movie(3, "B")], 8);

    expect(graph.nodes.map((node) => node.id)).toEqual([1, 2, 3]);
    expect(graph.links).toContainEqual({ source: 2, target: 3 });
  });

  it("ignores a connection the graph already has, in either direction", () => {
    let graph = addRelatedMovies(createGraph(root), 1, [movie(2, "A")], 8);
    const linkCount = graph.links.length;

    graph = addRelatedMovies(graph, 2, [movie(1, "Root Movie", 1999)], 8);

    expect(graph.links).toHaveLength(linkCount);
  });

  it("ignores a movie recommending itself", () => {
    const graph = addRelatedMovies(createGraph(root), 1, [movie(1, "Root Movie", 1999)], 8);

    expect(graph.nodes).toHaveLength(1);
    expect(graph.links).toHaveLength(0);
  });

  it("keeps existing nodes by reference so the layout does not reset", () => {
    const graph = addRelatedMovies(createGraph(root), 1, [movie(2, "A")], 8);
    const rootNode = graph.nodes[0];

    const grown = addRelatedMovies(graph, 2, [movie(3, "B")], 8);

    expect(grown.nodes[0]).toBe(rootNode);
  });

  it("returns the same graph when there is nothing new to add", () => {
    const graph = addRelatedMovies(createGraph(root), 1, [movie(2, "A")], 8);

    expect(addRelatedMovies(graph, 1, [movie(2, "A")], 8)).toBe(graph);
  });

  it("returns the same graph when the source movie is not in it", () => {
    const graph = createGraph(root);

    expect(addRelatedMovies(graph, 99, [movie(2, "A")], 8)).toBe(graph);
  });

  it("reads link ends that the force layout has replaced with node objects", () => {
    const rootNode = { id: 1, title: "Root Movie", year: 1999, depth: 0 };
    const nodeA = { id: 2, title: "A", year: 2020, depth: 1 };
    const laidOut: MovieGraphData = {
      nodes: [rootNode, nodeA],
      // The force layout swaps ids for the node objects themselves once it renders.
      links: [{ source: rootNode, target: nodeA }],
    };

    const graph = addRelatedMovies(laidOut, 1, [movie(2, "A")], 8);

    expect(graph.links).toHaveLength(1);
  });
});

describe("linkEndId", () => {
  it("reads an id from both link end forms", () => {
    expect(linkEndId(7)).toBe(7);
    expect(linkEndId({ id: 7, title: "A", year: null, depth: 1 })).toBe(7);
  });
});

describe("nodeLabel", () => {
  it("includes the year when there is one", () => {
    expect(nodeLabel({ id: 1, title: "A", year: 1999, depth: 0 })).toBe("A (1999)");
    expect(nodeLabel({ id: 1, title: "A", year: null, depth: 0 })).toBe("A");
  });
});
