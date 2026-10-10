# Contributing to `movie-recommender`

To start, thank you for considering contributing to this project. Having contributors such as yourself allow us to develop our website further, and to a high quality, which is very appreciated.

## Getting Started
To begin, please look through our [Code of Conduct](CODE_OF_CONDUCT.md) if you haven't already, to understand the behaviour we are looking to cultivate in our community.

Furthermore, also refer to the [README.md](README.md) for the initial setup instructions for running the project - this is also required to work on the project.

## Contribution Model
Like most open-source projects, we utilise a fork-and-pull model. Contributors fork from the main repository, make a branch encapsulating their changes, and once ready can submit a pull request from their forked branch to the `main` branch of the main repository.

## Code Editor
We recommend using an IDE such as [VSCode](https://code.visualstudio.com/) to work on the project for linting and syntax validation.

Regarding IDE extensions, we heavily recommend using [SonarLint](https://www.sonarsource.com/products/sonarqube/ide/) to ensure code is of a high quality and free of any potential security vulnerabilities.

## Architecture Overview
The project is split into two folders, the `client/` and `server/`. Both run on different ports on the dev server, and uses CORS to interact between them.

The `client/` relates to the frontend, utilising React Components and CSS. There is an api folder for an api fetch call onto the backend.

The `server/` relates to the backend, utilising ExpressJS and TypeScript. Because this project utilises TMDB, this mostly pertains to sending get requests and processing the response data. Currently MongoDB is not utilised in the project.

## Adding a Backend Route

### Where things live
```
server/src/
  index.ts             Entry point: loads .env, loadConfig(), starts the server
  app.ts               createApp(config, deps): middleware, routers, error handling
  config.ts            AppConfig + loadConfig(): every environment variable goes through here
  errors.ts            HttpError, ErrorResponse
  middleware/          asyncHandler, notFound, errorHandler
  tmdb/                TMDB client + response types
  controllers/         Request handlers, grouped by feature
  routes/              Routers that map URLs to controllers
  types/express.d.ts   Extra fields on Express's Request (e.g. req.user)
server/test/
  fixtures.ts          Shared test data and fakes
  integration/         Supertest tests against the full app
```

### Pattern: factories with injected dependencies
Controllers and routers are **factory functions** that receive their dependencies (e.g. the TMDB client) as arguments instead of importing them directly. This lets tests pass in fakes without mocking modules.

**1. Add a handler to the controller** (`src/controllers/movies.controller.ts`):
```ts
const getMovie: RequestHandler<{ id: string }, TmdbMovieDetails | ErrorResponse> = asyncHandler(
  async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpError(400, "Movie id must be a positive integer");
    }
    res.json(await tmdb.getMovie(id));
  },
);

return { getRandomMovie, getMovie };
```

**2. Register it in the router** (`src/routes/movies.routes.ts`):
```ts
router.get("/random", getRandomMovie);
router.get("/:id", getMovie); // after /random, or "random" would be treated as an :id
```

**3. For a new feature area**, create `src/routes/<feature>.routes.ts` exporting `create<Feature>Router(deps)`. Mount it in `createApp` *before* `notFound`/`errorHandler`, and add any new dependencies to `AppDeps`:
```ts
app.use("/api/watchlist", createWatchlistRouter(deps));
```

### Errors
- Wrap every `async` handler in `asyncHandler`. Express 4 does not catch rejected promises on its own; without the wrapper, an error leaves the request hanging.
- To return an error status, `throw new HttpError(status, "message")`. `errorHandler` sends `{ message }` with that status.
- Anything that isn't an `HttpError` becomes a `500 { message: "Internal server error" }` and is logged. Internal error messages are never sent to the client.
- Don't call `res.status(500).json(...)` yourself. Throw, and let `errorHandler` respond, so every error has the same shape.

### Adding a config key
1. Add the field to `AppConfig` in `src/config.ts`. Make it optional (`?`) until the feature that needs it is merged.
2. Read it in `loadConfig()` from `env` (not `process.env` directly), and validate it there. Throw an `Error` with a clear message if a required key is missing or invalid.
3. Add it to `.env.example` with a comment explaining it.
4. Add a case to `src/config.spec.ts`.
5. Use it through the `config` object passed to `createApp`. Never read `process.env` anywhere else.

Never prefix a secret with `VITE_`: Vite includes every `VITE_*` variable in the browser bundle.

### Writing an integration test
Build the real app with a fake TMDB client, then call it with Supertest:
```ts
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { fakeTmdb, movieDetails, testConfig } from "../fixtures.js";

describe("GET /api/movies/:id", () => {
  it("returns the movie", async () => {
    const tmdb = fakeTmdb();
    tmdb.getMovie.mockResolvedValue(movieDetails(550));

    const res = await request(createApp(testConfig, { tmdb })).get("/api/movies/550");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(movieDetails(550));
    expect(tmdb.getMovie).toHaveBeenCalledWith(550);
  });

  it("rejects a non-numeric id", async () => {
    const res = await request(createApp(testConfig, { tmdb: fakeTmdb() })).get("/api/movies/abc");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Movie id must be a positive integer" });
  });
});
```

### Before opening a PR
From `server/`:
- `npm run typecheck`: no `any`, and no `as` casts in `src/` (casts are only allowed in test helpers, with a comment explaining why)
- `npm test`
- `npm run build`

## Submitting Issues
If you found a bug to fix, some documentation to clarify, or want to implement/request a new feature, we use issues to document these. When you [submit an issue](https://github.com/fn5-310/movie-recommender/issues/new), select the issue template most relevant to your request - or use the blank issue if none apply.

For the most part (except for key tasks), any issues will go through an approval process by the project team - whether the bug is dismissable, a feature out of scope, etc. The project team may require extra information in some cases. If approved, the issue is open to be assigned, and can be further developed/fixed.

### Key Tasks
Issues denoted as key tasks are those that were outlined in the Project Proposal in the initial ideation phase of the project. These tasks are automatically approved to be worked on.

## Creating a Pull Request
Before making a pull request, ensure that:
- The feature you are submitting is from a feature-branch, i.e. not the main branch of your forked repository
- Your branch name is relevant to the added content
- Your branch is up to date with to the latest version of the main repo
- The project can run without errors or crashes
- All test cases (new and existing) pass - see below on **Creating Tests**.

When submitting a pull request, there will be a preset template to fill out, including a checklist of all of the prerequisites before submitting the pull request. The other important section is linking your PR to the issue your PR closes, using closing keywords.

After submitting, a team member will review your work, possibly request changes, and approve your PR. Your PR should then be (if you are merging) squash merged into the `main` branch.

Congratulations! You have successfully contributed to the `movie-recommender` project!

## Creating Tests
`vitest` is used for all test cases, and roughly follows the below structure:

```js
describe("TestSuiteName", () => {
    it("TestCaseName", async () => { // may not be async depending on test type
        const result = testFunction(arg1, arg2);
        expect(result).toBe(`${arg1}-${arg2}`) // toBe checks identity of result and string - use toEqual for equality
    })
    it("TestCaseName2", async () => {
        const result = testFunction(arg1);
        expect(result).toBe(`${arg1}-${arg1}`)
    })
})
```
Given the above structure, each `it()` call makes one test case, while describe groups these tests together - i.e. a test suite.

The test file for a function should be in the same folder as the file being tested, adding `.spec` or `.test` before the file extension, e.g. `client/testFunction.ts` will have a test file `client/testFunction.spec.ts`.

To run the tests:
```
npm run test
```

### Frontend
Frontend tests make use of the [React Testing Library](https://github.com/testing-library/react-testing-library), and work by emulating a DOM and rendering the components used.

Unit testing should be done per component or function file in isolation. These test whether the component or function by itself has all required functionality.

Integration testing should be done in a more practical environment, e.g. testing the `SearchBar` from the `App` component. These tests should ensure expected behaviour without colliding with other components.

In the case where a component needs to interact with the backend, this is currently mocked by MSW. in `client/src/test/handlers.ts`, there is a list of handlers; when a handler link is called, a mocked `HttpResponse` will be returned, allowing for mocking external api/backend calls.

While frontend testing can confirm the logic of the DOM state e.g. what classes a component has, what text is displayed, it is unable to test direct visual state, e.g. responsiveness, component alignment, etc. This is more suitable to tools such as Playwright, which currently is not implemented, with no immediate plans of doing so.

### Backend
Backend testing is typically either unit tests on controller files, or integration tests on route files.

Unit tests sit next to the file they test in `server/src/` (e.g. `src/config.spec.ts`). They call the function directly and replace its dependencies with fakes — for example, `createTmdbClient("key", fakeFetch)` instead of calling the real TMDB API.

Integration tests live in `server/test/integration/`. They build the real app with `createApp(testConfig, { tmdb: fakeTmdb() })` and send HTTP requests to it with `supertest`, so routing, middleware and error handling are all tested together. Shared test data and fakes are in `server/test/fixtures.ts`. See **Adding a Backend Route** below for an example.

