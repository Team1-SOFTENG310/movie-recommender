import { Link } from "react-router-dom";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import "./NotFound.css";

/** Shown for any URL that doesn't match a route, instead of a blank page. */
export default function NotFound() {
  useDocumentTitle("Page not found");

  return (
    <main className="not-found">
      <p className="not-found__code">404</p>
      <h1>Page not found</h1>
      <p>The page you were looking for doesn't exist. The link may be broken or mistyped.</p>
      <Link to="/" className="not-found__home">
        Go to the homepage
      </Link>
    </main>
  );
}
