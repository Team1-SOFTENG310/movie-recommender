import type { Movie } from "../types/movie";

/**
 * Graph-shaped view of the movie data: every movie is a node, every "these two
 * are related" pairing is a link. This module is deliberately free of React and
 * of the rendering library so the shape of the data can be tested on its own.
 */

export type MovieGraphNode = {
  id: number;
  title: string;
  year: number | null;
  /** How many links away this movie sits from the movie the graph started at. */
  depth: number;
};

/**
 * Link ends start out as plain movie ids, but the force layout swaps in the node
 * objects themselves once it has rendered a frame, so both forms have to be read.
 */
export type MovieGraphLinkEnd = number | MovieGraphNode;

export type MovieGraphLink = {
  source: MovieGraphLinkEnd;
  target: MovieGraphLinkEnd;
};

export type MovieGraphData = {
  nodes: MovieGraphNode[];
  links: MovieGraphLink[];
};

/** Reads the movie id off a link end, whichever of the two forms it is in. */
export function linkEndId(end: MovieGraphLinkEnd): number {
  return typeof end === "number" ? end : end.id;
}

function pairKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/** A graph holding a single movie — the one whose page we are on. */
export function createGraph(root: Pick<MovieGraphNode, "id" | "title" | "year">): MovieGraphData {
  return {
    nodes: [{ id: root.id, title: root.title, year: root.year, depth: 0 }],
    links: [],
  };
}

/**
 * Hangs `related` off the movie `sourceId`, skipping movies and connections the
 * graph already has.
 *
 * Existing nodes and links are carried over by reference on purpose: the force
 * layout stores each node's position on the node object, so replacing them would
 * throw the whole graph back into the middle of the canvas on every expansion.
 */
export function addRelatedMovies(
  graph: MovieGraphData,
  sourceId: number,
  related: Movie[],
  limit: number,
): MovieGraphData {
  const source = graph.nodes.find((node) => node.id === sourceId);
  if (!source) {
    return graph;
  }

  const knownIds = new Set(graph.nodes.map((node) => node.id));
  const knownPairs = new Set(
    graph.links.map((link) => pairKey(linkEndId(link.source), linkEndId(link.target))),
  );

  const newNodes: MovieGraphNode[] = [];
  const newLinks: MovieGraphLink[] = [];

  for (const movie of related.slice(0, limit)) {
    if (movie.id === sourceId) {
      continue;
    }

    if (!knownIds.has(movie.id)) {
      knownIds.add(movie.id);
      newNodes.push({
        id: movie.id,
        title: movie.title,
        year: movie.year,
        depth: source.depth + 1,
      });
    }

    const key = pairKey(sourceId, movie.id);
    if (!knownPairs.has(key)) {
      knownPairs.add(key);
      newLinks.push({ source: sourceId, target: movie.id });
    }
  }

  if (newNodes.length === 0 && newLinks.length === 0) {
    return graph;
  }

  return {
    nodes: [...graph.nodes, ...newNodes],
    links: [...graph.links, ...newLinks],
  };
}

/** Every movie's direct connections, looked up by movie id. */
export function neighbourIds(graph: MovieGraphData): Map<number, Set<number>> {
  const neighbours = new Map<number, Set<number>>();
  const add = (from: number, to: number) => {
    const set = neighbours.get(from) ?? new Set<number>();
    set.add(to);
    neighbours.set(from, set);
  };

  for (const link of graph.links) {
    const source = linkEndId(link.source);
    const target = linkEndId(link.target);
    add(source, target);
    add(target, source);
  }

  return neighbours;
}

/** Label shown on the canvas and in the hover tooltip. */
export function nodeLabel(node: MovieGraphNode): string {
  return node.year ? `${node.title} (${node.year})` : node.title;
}
