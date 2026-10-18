import { describe, expect, it } from "vitest";
import { User } from "./User.js";

describe("User model", () => {
  it("normalizes username and email", () => {
    const user = new User({
      username: "  Film_Fan  ",
      email: "  FILM@example.com  ",
      passwordHash: "hashed-password",
    });

    expect(user.username).toBe("film_fan");
    expect(user.email).toBe("film@example.com");
  });

  it("accepts common email syntax and rejects malformed dot placement", async () => {
    const validUser = new User({
      username: "film_fan",
      email: "first.last+tag@sub-domain.example",
      passwordHash: "hashed-password",
    });
    await expect(validUser.validate()).resolves.toBeUndefined();

    for (const email of [
      ".first@example.com",
      "first..last@example.com",
      "first.@example.com",
      "first@-example.com",
      "first@example-.com",
      "first@example..com",
      `${"a".repeat(65)}@example.com`,
    ]) {
      const user = new User({
        username: "film_fan",
        email,
        passwordHash: "hashed-password",
      });
      await expect(user.validate()).rejects.toMatchObject({
        errors: { email: expect.anything() },
      });
    }
  });

  it("requires username, email, and password hash", async () => {
    const user = new User();

    await expect(user.validate()).rejects.toMatchObject({
      errors: {
        username: expect.anything(),
        email: expect.anything(),
        passwordHash: expect.anything(),
      },
    });
  });

  it("does not select password hashes by default", () => {
    expect(User.schema.path("passwordHash").options.select).toBe(false);
  });

  it("creates unique indexes for username and email", () => {
    const indexes = User.schema.indexes();

    expect(
      indexes.some(([fields, options]) => fields.username === 1 && options.unique),
    ).toBe(true);
    expect(
      indexes.some(([fields, options]) => fields.email === 1 && options.unique),
    ).toBe(true);
  });
});
