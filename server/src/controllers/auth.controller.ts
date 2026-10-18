// src/controllers/auth.controller.ts
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import type { Request, RequestHandler, Response } from "express";
import type { AppConfig } from "../config.js";
import type { ErrorResponse } from "../errors.js";
import { User } from "../models/User.js";
import { SESSION_COOKIE_NAME, sessionCookieOptions } from "../auth/session.js";
import { EMAIL_PATTERN } from "../validation/email.js";

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72;
const USERNAME_PATTERN = /^[a-z0-9_.-]{3,30}$/;

export interface PublicUser {
  id: string;
  username: string;
  email: string;
}

export type UserResponse = { user: PublicUser } | ErrorResponse;

// Bodies are untrusted JSON, so every field is checked before use
interface SignUpBody {
  username?: unknown;
  email?: unknown;
  password?: unknown;
}

interface LogInBody {
  identifier?: unknown;
  password?: unknown;
}

interface SignUpInput {
  username: string;
  email: string;
  password: string;
}

interface UserDocument {
  _id: { toString(): string };
  username: string;
  email: string;
}

function publicUser(user: UserDocument): PublicUser {
  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
  };
}

// Returns the normalized input, or an error message
function validateSignUp({ username, email, password }: SignUpBody): SignUpInput | string {
  if (typeof username !== "string" || !USERNAME_PATTERN.test(username.trim().toLowerCase())) {
    return "Username must be 3-30 characters using letters, numbers, dots, underscores, or hyphens";
  }
  if (typeof email !== "string") {
    return "A valid email address is required";
  }
  const normalizedEmail = email.trim();
  if (normalizedEmail.length > 254 || !EMAIL_PATTERN.test(normalizedEmail)) {
    return "A valid email address is required";
  }
  if (
    typeof password !== "string" ||
    password.length < MIN_PASSWORD_LENGTH ||
    Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES
  ) {
    return "Password must be at least 8 characters and no more than 72 UTF-8 bytes";
  }
  return {
    username: username.trim().toLowerCase(),
    email: normalizedEmail.toLowerCase(),
    password,
  };
}

function establishSession(req: Request, userId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((regenerateError) => {
      if (regenerateError) {
        reject(regenerateError);
        return;
      }

      req.session.userId = userId;
      req.session.save((saveError) => {
        if (saveError) {
          reject(saveError);
          return;
        }
        resolve();
      });
    });
  });
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

function handleAuthError(res: Response<ErrorResponse>, error: unknown): void {
  if (isDuplicateKeyError(error)) {
    res.status(409).json({ message: "Username or email is already registered" });
    return;
  }
  if (error instanceof mongoose.Error.ValidationError) {
    res.status(400).json({ message: "Invalid account details" });
    return;
  }
  res.status(500).json({ message: "Authentication request failed" });
}

export function createAuthController(config: Pick<AppConfig, "isProduction">) {
  const signUp: RequestHandler<{}, UserResponse, SignUpBody | undefined> = async (req, res) => {
    const input = validateSignUp(req.body ?? {});
    if (typeof input === "string") {
      res.status(400).json({ message: input });
      return;
    }

    try {
      const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
      const user = await User.create({ username: input.username, email: input.email, passwordHash });
      await establishSession(req, user._id.toString());

      res.status(201).json({ user: publicUser(user) });
    } catch (error) {
      handleAuthError(res, error);
    }
  };

  const logIn: RequestHandler<{}, UserResponse, LogInBody | undefined> = async (req, res) => {
    const identifier =
      typeof req.body?.identifier === "string" ? req.body.identifier.trim().toLowerCase() : "";
    const password = req.body?.password;

    if (!identifier || typeof password !== "string" || !password) {
      res.status(400).json({ message: "Username or email and password are required" });
      return;
    }

    try {
      const user = await User.findOne({
        $or: [{ username: identifier }, { email: identifier }],
      }).select("+passwordHash");

      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        res.status(401).json({ message: "Invalid username/email or password" });
        return;
      }

      await establishSession(req, user._id.toString());
      res.json({ user: publicUser(user) });
    } catch (error) {
      handleAuthError(res, error);
    }
  };

  const logOut: RequestHandler<{}, { message: string }> = (req, res) => {
    req.session.destroy((error) => {
      if (error) {
        res.status(500).json({ message: "Could not log out" });
        return;
      }

      res.clearCookie(SESSION_COOKIE_NAME, { ...sessionCookieOptions(config), path: "/" });
      res.json({ message: "Logged out" });
    });
  };

  const getCurrentUser: RequestHandler<{}, UserResponse> = async (req, res) => {
    if (!req.session.userId) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    try {
      const user = await User.findById(req.session.userId);
      if (!user) {
        res.status(401).json({ message: "Not authenticated" });
        return;
      }
      res.json({ user: publicUser(user) });
    } catch (error) {
      handleAuthError(res, error);
    }
  };

  return { signUp, logIn, logOut, getCurrentUser };
}
