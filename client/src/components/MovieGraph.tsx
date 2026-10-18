import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import { fetchRecommendedMovies } from "../api/recommendedMovies";
import { isAbortError } from "../api/tmdb";
import {
  addRelatedMovies,
  createGraph,
  linkEndId,
  neighbourIds,
  nodeLabel,
  type MovieGraphData,
  type MovieGraphLink,
  type MovieGraphNode,
} from "./movieGraphData";
import AiRecommendationPanel from "./AiRecommendations/AiRecommendationPanel";
import { ThemeContext } from "../context/ThemeContext";
import { readGraphColors } from "../theme/graphColors";
import "./MovieGraph.css";

const GRAPH_HEIGHT = 600;
const GRAPH_HEIGHT_NARROW = 440;
const NARROW_WIDTH = 640;
const MAX_RELATED_PER_MOVIE = 10;
const MAX_LABEL_LENGTH = 24;
// Second-level titles overlap at the default zoom, so they only appear once zoomed in.
const LABEL_ZOOM = 2.2;
const ZOOM_STEP = 1.5;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 8;
const SCROLL_HINT_MS = 1500;
const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

const FADED_ALPHA = 0.2;
const LABEL_FONT = "Outfit, sans-serif";

type PositionedNode = MovieGraphNode & { x?: number; y?: number };

interface Props {
  movieId: number;
  title: string;
  year: number | null;
}

function shortLabel(title: string): string {
  if (title.length <= MAX_LABEL_LENGTH) {
    return title;
  }
  return `${title.slice(0, MAX_LABEL_LENGTH - 1)}…`;
}

/**
 * The movies around this one, drawn as a graph: the movie on this page sits at the
 * centre and every link is a "these two are related" pairing. Clicking a movie
 * pulls in its own related movies, so the graph grows outwards as you explore.
 */
export default function MovieGraph({ movieId, title, year }: Readonly<Props>) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods<MovieGraphNode, MovieGraphLink> | undefined>(undefined);
  // Set when new movies arrive, so the view is re-framed once the layout settles
  // rather than on every simulation restart (a drag would otherwise yank the view).
  const shouldRefitRef = useRef(true);

  const [width, setWidth] = useState(0);
  const [graph, setGraph] = useState<MovieGraphData>(() =>
    createGraph({ id: movieId, title, year }),
  );
  const [loadingId, setLoadingId] = useState<number | null>(movieId);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  // Canvas drawing can't use CSS variables directly, so read them for the current theme.
  const resolvedTheme = useContext(ThemeContext)?.resolvedTheme ?? "dark";
  const colors = useMemo(() => readGraphColors(resolvedTheme), [resolvedTheme]);
  const [error, setError] = useState<string | null>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const scrollHintTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(scrollHintTimerRef.current), []);

  // The canvas needs pixel dimensions, so track the width of the surrounding box.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const measure = () => setWidth(element.clientWidth);
    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Start over whenever the page moves to a different movie. Reset during render
  // rather than in the effect below, so the old movie's graph is never drawn again.
  const [graphFor, setGraphFor] = useState({ movieId, title, year });
  if (graphFor.movieId !== movieId || graphFor.title !== title || graphFor.year !== year) {
    setGraphFor({ movieId, title, year });
    setGraph(createGraph({ id: movieId, title, year }));
    setError(null);
    setLoadingId(movieId);
    setHoveredId(null);
  }

    // Load this movie's related movies, and theirs.
    useEffect(() => {
        const controller = new AbortController();
        shouldRefitRef.current = true;

        fetchRecommendedMovies(movieId, controller.signal)
            .then(async (relatedMovies) => {
                // prevent processing unrendered recommendations (causes visual bug)
                const relatedMoviesSliced = relatedMovies.slice(0, MAX_RELATED_PER_MOVIE);
                let updatedGraph = addRelatedMovies(createGraph({ id: movieId, title, year }), movieId, relatedMoviesSliced, MAX_RELATED_PER_MOVIE);

                // for each recommended movie, create a promise to get 2-deep recommended movies
                const moviePromise2 = relatedMoviesSliced.map((l1Movie) => {
                    return fetchRecommendedMovies(l1Movie.id, controller.signal)
                        .then((related) => ({id: l1Movie.id, related: related}))
                        .catch(() => null) // do nothing when fetch fails - fine to ignore some
                })

                // resolve all promises parallel-wise (not sequential)
                const relatedMovies2Results = await Promise.all(moviePromise2);

                relatedMovies2Results.forEach((movie2) => {
                    if (movie2) { // for all promises that didn't fail
                        updatedGraph = addRelatedMovies(updatedGraph, movie2.id, movie2.related, MAX_RELATED_PER_MOVIE);
                    }
                })

                // update all relevant nodes
                setGraph(updatedGraph);
                setLoadingId(null);
                shouldRefitRef.current = true;

            }).catch((err: unknown) => {
                if (isAbortError(err)) {
                return;
                }
                setError("Could not load related movies.");
                setLoadingId(null);
            })

    return () => controller.abort();
  }, [movieId, title, year]);


  // While a movie is hovered, it and its direct connections stay lit and the rest fade.
  const neighbours = useMemo(() => neighbourIds(graph), [graph]);
  const highlightedIds = useMemo(() => {
    if (hoveredId === null) {
      return null;
    }
    return new Set([hoveredId, ...(neighbours.get(hoveredId) ?? [])]);
  }, [hoveredId, neighbours]);

  const nodeColor = useCallback((node: MovieGraphNode) => {
    if (node.depth === 0) {
      return colors.root;
    }
    return node.depth === 1 ? colors.direct : colors.indirect;
  }, [colors]);

  const nodeRadius = useCallback((node: MovieGraphNode) => {
    if (node.depth === 0) {
      return 7;
    }
    return node.depth === 1 ? 5 : 3.5;
  }, []);

  const paintNode = useCallback(
    (node: PositionedNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const radius = nodeRadius(node);
      const isHighlighted = highlightedIds?.has(node.id) ?? false;
      const isFaded = highlightedIds !== null && !isHighlighted;

      ctx.globalAlpha = isFaded ? FADED_ALPHA : 1;

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = nodeColor(node);
      ctx.fill();

      if (node.id === loadingId || node.id === hoveredId) {
        ctx.strokeStyle = colors.root;
        ctx.lineWidth = 1.5 / globalScale;
        ctx.beginPath();
        ctx.arc(x, y, radius + 2.5 / globalScale, 0, 2 * Math.PI);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    },
    [colors, highlightedIds, hoveredId, loadingId, nodeColor, nodeRadius],
  );

  // Titles are drawn after every node and line, so a neighbouring dot can't cover one.
  const paintLabels = useCallback(
    (ctx: CanvasRenderingContext2D, globalScale: number) => {
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.lineJoin = "round";

      for (const node of graph.nodes as PositionedNode[]) {
        if (node.x === undefined || node.y === undefined) {
          continue;
        }

        const isHighlighted = highlightedIds?.has(node.id) ?? false;
        const isFaded = highlightedIds !== null && !isHighlighted;
        const fitsAtThisZoom = node.depth <= 1 || globalScale >= LABEL_ZOOM;
        // This movie stays labelled as a reference point, even while something else is hovered.
        const showLabel = node.depth === 0 || node.id === hoveredId || (fitsAtThisZoom && !isFaded);
        if (!showLabel) {
          continue;
        }

        // Divide by the zoom level so labels keep a constant on-screen size.
        const fontSize = (node.depth === 0 ? 13 : 11) / globalScale;
        const weight = node.depth === 0 || node.id === hoveredId ? 600 : 400;
        const label = shortLabel(node.title);
        const labelY = node.y + nodeRadius(node) + 3 / globalScale;

        ctx.font = `${weight} ${fontSize}px ${LABEL_FONT}`;
        // A background-coloured outline keeps labels readable where lines cross them.
        ctx.lineWidth = 3 / globalScale;
        ctx.strokeStyle = colors.background;
        ctx.strokeText(label, node.x, labelY);
        ctx.fillStyle = colors.label;
        ctx.fillText(label, node.x, labelY);
      }
    },
    [colors, graph, highlightedIds, hoveredId, nodeRadius],
  );

  // Keeps the clickable area in step with the circles drawn above.
  const paintPointerArea = useCallback(
    (node: PositionedNode, color: string, ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(node.x ?? 0, node.y ?? 0, nodeRadius(node) + 3, 0, 2 * Math.PI);
      ctx.fill();
    },
    [nodeRadius],
  );

  const touchesHovered = useCallback(
    (link: MovieGraphLink) =>
      hoveredId !== null &&
      (linkEndId(link.source) === hoveredId || linkEndId(link.target) === hoveredId),
    [hoveredId],
  );

  const linkColor = useCallback(
    (link: MovieGraphLink) => {
      if (hoveredId === null) {
        return colors.link;
      }
      return touchesHovered(link) ? colors.root : colors.linkFaded;
    },
    [colors, hoveredId, touchesHovered],
  );

  const linkWidth = useCallback(
    (link: MovieGraphLink) => (touchesHovered(link) ? 1.5 : 1),
    [touchesHovered],
  );

  const isNarrow = width > 0 && width < NARROW_WIDTH;
  const height = isNarrow ? GRAPH_HEIGHT_NARROW : GRAPH_HEIGHT;

  const fitToView = useCallback(() => {
    graphRef.current?.zoomToFit(400, isNarrow ? 40 : 60);
  }, [isNarrow]);

  const handleEngineStop = useCallback(() => {
    if (!shouldRefitRef.current) {
      return;
    }
    shouldRefitRef.current = false;
    fitToView();
  }, [fitToView]);

  const zoomBy = (factor: number) => {
    const graphMethods = graphRef.current;
    if (graphMethods) {
      const target = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, graphMethods.zoom() * factor));
      graphMethods.zoom(target, 250);
    }
  };

  // A plain scroll over the graph scrolls the page; zooming needs Ctrl/⌘ held (as on
  // embedded maps), otherwise scrolling down the page gets stuck zooming the graph.
  const allowZoomGesture = useCallback(
    (event: MouseEvent) => event.type !== "wheel" || event.ctrlKey || event.metaKey,
    [],
  );

  const handleWheel = (event: ReactWheelEvent) => {
    if (event.ctrlKey || event.metaKey) {
      return;
    }
    setShowScrollHint(true);
    clearTimeout(scrollHintTimerRef.current);
    scrollHintTimerRef.current = setTimeout(() => setShowScrollHint(false), SCROLL_HINT_MS);
  };

  // Every movie except the one this page is about opens its page when clicked.
  const showPointerCursor = useCallback(
    (item: MovieGraphNode | MovieGraphLink | undefined) =>
      item !== undefined && "depth" in item && item.id !== movieId,
    [movieId],
  );

  let status: string;
  if (loadingId !== null) {
    status = "Loading related movies…";
  } else if (error) {
    status = error;
  } else if (graph.nodes.length === 1) {
    status = "No related movies found.";
  } else {
    const movieCount = graph.nodes.length;
    const linkCount = graph.links.length;
    status = `${movieCount} ${movieCount === 1 ? "movie" : "movies"}, ${linkCount} ${
      linkCount === 1 ? "connection" : "connections"
    }`;
  }

  return (
    <div className="movie-graph">
      <div className="movie-graph__toolbar">
        <ul className="movie-graph__legend" aria-label="Graph key">
          <li>
            <span className="movie-graph__swatch movie-graph__swatch--root" aria-hidden="true" />
            This movie
          </li>
          <li>
            <span className="movie-graph__swatch movie-graph__swatch--direct" aria-hidden="true" />
            Recommended for this movie
          </li>
          <li>
            <span className="movie-graph__swatch movie-graph__swatch--indirect" aria-hidden="true" />
            Related through another movie
          </li>
        </ul>
        <p className="movie-graph__status" aria-live="polite">
          {status}
        </p>
      </div>

      <div
        className="movie-graph__canvas"
        ref={containerRef}
        style={{ height }}
        onWheel={handleWheel}
      >
        {width > 0 && (
          <ForceGraph2D<MovieGraphNode, MovieGraphLink>
            ref={graphRef}
            graphData={graph}
            width={width}
            height={height}
            backgroundColor={colors.background}
            nodeLabel={nodeLabel}
            nodeRelSize={5}
            nodeCanvasObject={paintNode}
            nodePointerAreaPaint={paintPointerArea}
            onRenderFramePost={paintLabels}
            linkColor={linkColor}
            linkWidth={linkWidth}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            enableZoomInteraction={allowZoomGesture}
            showPointerCursor={showPointerCursor}
            onNodeHover={(node) => setHoveredId(node?.id ?? null)}
            onNodeClick={(node) => {
                if (node.id !== movieId) { // do nothing if clicked center node
                    setHoveredId(null);
                    void navigate(`/movie/${node.id}`)
                }
            }}
            onEngineStop={handleEngineStop}
          />
        )}
        {showScrollHint && (
          <p className="movie-graph__scroll-hint" role="status">
            Use {IS_MAC ? "⌘" : "Ctrl"} + scroll to zoom
          </p>
        )}
        <AiRecommendationPanel movieId={movieId} title={title} year={year} />
        <div className="movie-graph__zoom" role="group" aria-label="Zoom">
          <button type="button" onClick={() => zoomBy(ZOOM_STEP)} aria-label="Zoom in" title="Zoom in">
            +
          </button>
          <button type="button" onClick={() => zoomBy(1 / ZOOM_STEP)} aria-label="Zoom out" title="Zoom out">
            −
          </button>
          <button
            type="button"
            onClick={fitToView}
            aria-label="Fit graph to view"
            title="Fit to view"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path
                d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </button>
        </div>
      </div>

      <p className="movie-graph__hint">
        Lines join movies that TMDB recommends together.{" "}
        <span className="movie-graph__hint--pointer">
          Click a movie to open it, hover to see its connections, and drag to move around. Zoom in
          with {IS_MAC ? "⌘" : "Ctrl"} + scroll or the + button to see every title.
        </span>
        <span className="movie-graph__hint--touch">
          Tap a movie to open it and drag to move around. Pinch or use the + button to zoom in and
          see every title.
        </span>
      </p>
    </div>
  );
}
