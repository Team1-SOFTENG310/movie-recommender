import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { requestSignup } from "../api/auth";
import { useAuth } from "../hooks/useAuth";
import "./AuthForm.css";

export default function Signup() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, setUser } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError(null);

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    // Keep this rule in sync with USERNAME_PATTERN in the backend. The backend is the source of truth, but we can do a quick check here to avoid unnecessary requests.
    if (!/^[a-z0-9_.-]{3,30}$/i.test(trimmedUsername)) {
      setError(
        "Username must be 3–30 characters using letters, numbers, dots, underscores, or hyphens.",
      );
      return;
    }

    if (!trimmedEmail) {
      setError("Enter your email address.");
      return;
    }

    if (
      password.length < 8 ||
      new TextEncoder().encode(password).length > 72
    ) {
      setError(
        "Password must be at least 8 characters and no more than 72 UTF-8 bytes.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const user = await requestSignup({
        username: trimmedUsername,
        email: trimmedEmail,
        password,
      });

      setUser(user);
      void navigate("/", { replace: true });
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create your account. Please try again.",
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
      <section className="login-card" aria-labelledby="signup-title">
        <Link to="/">← Back to movies</Link>

        <h1 id="signup-title">Create an account</h1>
        <p>Register to start using your account.</p>

        <form onSubmit={(event) => void handleSubmit(event)}>
          <div className="login-field">
            <label htmlFor="signup-username">Username</label>
            <input
              id="signup-username"
              name="username"
              type="text"
              autoComplete="username"
              aria-describedby="signup-username-hint"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={isSubmitting}
              required
            />
            <small id="signup-username-hint">
              Use 3–30 letters, numbers, dots, underscores, or hyphens.
            </small>
          </div>

          <div className="login-field">
            <label htmlFor="signup-email">Email</label>
            <input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              name="password"
              type="password"
              autoComplete="new-password"
              aria-describedby="signup-password-hint"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isSubmitting}
              required
            />
            <small id="signup-password-hint">
              Use at least 8 characters, with a maximum of 72 UTF-8 bytes.
            </small>
          </div>

          <div className="login-field">
            <label htmlFor="signup-confirm-password">Confirm password</label>
            <input
              id="signup-confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          {error && <p role="alert">{error}</p>}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating account…" : "Register"}
          </button>
        </form>

        <p>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </section>
    </main>
  );
}
