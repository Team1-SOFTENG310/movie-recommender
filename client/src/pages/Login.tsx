import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { requestLogin } from "../api/auth";
import { useAuth } from "../hooks/useAuth";
import "./AuthForm.css";

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, setUser } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const trimmedIdentifier = identifier.trim();

    if (!trimmedIdentifier || !password) {
      setError("Enter your username or email and password.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const user = await requestLogin({
        identifier: trimmedIdentifier,
        password,
      });

      setUser(user);
      void navigate("/", { replace: true });
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to log in. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <output>Checking your session…</output>;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <Link to="/">← Back to movies</Link>

        <h1 id="login-title">Log in</h1>
        <p>Log in with your username or email address.</p>

        <form onSubmit={(event) => void handleSubmit(event)}>
          <div className="login-field">
            <label htmlFor="login-identifier">Username or email</label>
            <input
              id="login-identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          {error && <p role="alert">{error}</p>}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Logging in…" : "Log in"}
          </button>
        </form>
        <p>
            Don't have an account? <Link to="/signup">Register</Link>
        </p>
      </section>
    </main>
  );
}
