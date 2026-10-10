// Placeholder: Member 1's auth middleware sets req.user
declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
    }
  }
}

export {};
