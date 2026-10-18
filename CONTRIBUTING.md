# Contributing to `movie-recommender`

To start, thank you for considering contributing to this project. Having contributors such as yourself allow us to develop our website further, and to a high quality, which is very appreciated.

## Getting Started
To begin, please look through our [Code of Conduct](CODE_OF_CONDUCT.md) if you haven't already, to understand the behaviour we are looking to cultivate in our community.

Furthermore, also refer to the [README.md](README.md) for the initial setup instructions for running the project - this is also required to work on the project.

## Contribution Model
We use a fork-and-pull model with two repositories:

| Repository | Role |
|---|---|
| [`fn5-310/movie-recommender`](https://github.com/fn5-310/movie-recommender) | The **central repository**. Pull requests target its `main`, and it only allows squash merges. |
| [`Team1-SOFTENG310/movie-recommender`](https://github.com/Team1-SOFTENG310/movie-recommender) | The **team fork** for A2. Feature branches are pushed here, and PRs are opened from here to the central repository. |

Never commit directly to `main` in either repository; every change goes through an issue, a feature branch and a reviewed pull request.

## Development Setup
Full instructions (Node.js, `.env`, TMDB and MongoDB keys, troubleshooting) are in the [README](README.md#getting-started). In short:

```shell
git clone https://github.com/Team1-SOFTENG310/movie-recommender.git
cd movie-recommender
git remote add upstream https://github.com/fn5-310/movie-recommender.git
npm run install:all
cp .env.example .env      # then fill in your keys (use copy on Windows)
npm run dev               # client on :5173, server on :5000
```

`origin` is the team fork and `upstream` is the central repository. Check with `git remote -v`.

## Workflow
1. **Have an approved issue.** Find or open an issue using one of the templates (see [Submitting Issues](#submitting-issues)), and wait for it to be approved before starting. Assign yourself so others know it's taken.
2. **Create a feature branch from the latest central `main`**, named `<type>/<issue number>-<short-description>`, where `type` is `feature`, `fix`, `refactor`, `docs`, `test` or `chore`:
   ```shell
   git fetch upstream
   git switch -c fix/31-search-box-focus upstream/main
   ```
3. **Implement the change with tests.** Keep each branch to one issue. Write commit messages in the imperative mood and reference the issue, e.g. `Stop the search box locking while results load (#31)`.
4. **Rebase onto the central `main` regularly**, at least before opening the PR and whenever `main` changes under you:
   ```shell
   git fetch upstream
   git rebase upstream/main
   # resolve any conflicts and run the checks again, then:
   git push --force-with-lease origin fix/31-search-box-focus
   ```
   Only force-push (with `--force-with-lease`) your own feature branch, never `main` or someone else's branch.
5. **Run every check** in [Before opening a PR](#before-opening-a-pr) and push the branch to the team fork.
6. **Open a pull request to the central repository** (base `fn5-310/movie-recommender:main`, head `Team1-SOFTENG310:<your-branch>`), fill in the template, and link the issue with a closing keyword (`Closes #31`). From the command line:
   ```shell
   gh pr create --repo fn5-310/movie-recommender --head Team1-SOFTENG310:fix/31-search-box-focus
   ```
7. **Get a review from another team member.** You can't approve your own PR. The reviewer follows the [review checklist](#reviewing-a-pull-request) and either approves or requests changes.
8. **Resolve feedback and merge conflicts** by pushing more commits (or rebasing), then re-request review. Reply to each review comment so the reviewer can see how it was addressed.
9. **Squash merge** once the PR has an approval from someone other than the author and all checks pass. Only members with write access merge, and the squash commit title keeps the PR title and issue number. Delete the branch afterwards.

## Code Editor
We recommend using an IDE such as [VSCode](https://code.visualstudio.com/) to work on the project for linting and syntax validation.

Regarding IDE extensions, we heavily recommend using [SonarLint](https://www.sonarsource.com/products/sonarqube/ide/) to ensure code is of a high quality and free of any potential security vulnerabilities.

## Architecture Overview
The project is split into two folders, the `client/` and `server/`. Both run on different ports on the dev server, and uses CORS to interact between them.

The `client/` relates to the frontend, utilising React (TypeScript), React Router and CSS. `client/src/api/` holds every network call: TMDB requests go through `tmdbGet` in `api/tmdb.ts`, and calls to our own backend go through `apiFetch` in `api/index.ts`. Pages live in `client/src/pages/`, reusable components in `client/src/components/`, and shared state such as the logged-in user in `client/src/context/`.

The `server/` relates to the backend, utilising ExpressJS and TypeScript. Because this project utilises TMDB, this mostly pertains to sending get requests and processing the response data. MongoDB (via Mongoose) stores user profiles.

## Adding a Backend Route

### Where things live
```
server/src/
  index.ts             Entry point: loads .env, loadConfig(), calls startServer()
  startServer.ts       Connects to MongoDB, then listens (degraded mode outside production)
  app.ts               createApp(config, deps): middleware, routers, /api/health, error handling
  config.ts            AppConfig + loadConfig(): every environment variable goes through here
  db.ts                connectDatabase(), isDatabaseConnected()
  errors.ts            HttpError, ErrorResponse
  middleware/          asyncHandler, notFound, errorHandler
  tmdb/                TMDB client + response types
  controllers/         Request handlers, grouped by feature
  routes/              Routers that map URLs to controllers
  types/express.d.ts   Extra fields on Express's Request (e.g. req.user)
server/test/
  fixtures.ts          Shared test data and fakes
  integration/         Supertest tests against the full app
  db.integration.ts    Live MongoDB check (npm run test:db; needs MONGODB_URI)
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
import { fakeDeps, fakeTmdb, movieDetails, testConfig } from "../fixtures.js";

describe("GET /api/movies/:id", () => {
  it("returns the movie", async () => {
    const tmdb = fakeTmdb();
    tmdb.getMovie.mockResolvedValue(movieDetails(550));

    const res = await request(createApp(testConfig, fakeDeps({ tmdb }))).get("/api/movies/550");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(movieDetails(550));
    expect(tmdb.getMovie).toHaveBeenCalledWith(550);
  });

  it("rejects a non-numeric id", async () => {
    const res = await request(createApp(testConfig, fakeDeps())).get("/api/movies/abc");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Movie id must be a positive integer" });
  });
});
```

### Backend checks
From `server/`:
- `npm run typecheck`: no `any`, and no `as` casts in `src/` (casts are only allowed in test helpers, with a comment explaining why)
- `npm test`
- `npm run build`

## Submitting Issues
If you found a bug to fix, some documentation to clarify, or want to implement/request a new feature, we use issues to document these. When you [submit an issue](https://github.com/fn5-310/movie-recommender/issues/new), select the issue template most relevant to your request - or use the blank issue if none apply.

For the most part (except for key tasks), any issues will go through an approval process by the project team - whether the bug is dismissable, a feature out of scope, etc. The project team may require extra information in some cases. If approved, the issue is open to be assigned, and can be further developed/fixed. Approval given outside GitHub (for example in a meeting) should be noted in a comment on the issue.

### Labels
Every issue gets at least one label: `bug`, `enhancement`, `documentation`, `refactor` or `key task`. Add `duplicate`, `wontfix` or `invalid` when closing an issue for that reason.

### Dependencies and duplicates
- If an issue or PR can't be finished until another is done, say so in its description with `Depends on #X`, and add `Blocks #Y` to the other side. GitHub turns both into links.
- Mark a duplicate with the `duplicate` label and a comment `Duplicate of #X`, then close it. Move any useful detail to the issue that stays open rather than deleting it.

### Key Tasks
Issues denoted as key tasks are those that were outlined in the Project Proposal in the initial ideation phase of the project. These tasks are automatically approved to be worked on.

## Creating a Pull Request
Before making a pull request, ensure that:
- The change is on a feature branch, not `main`
- Your branch name follows the convention in [Workflow](#workflow)
- Your branch is rebased onto the latest central `main`
- The project runs without errors or crashes
- Every check below passes

### Before opening a PR
Run these from the project root. CI runs the same checks on every pull request:

```shell
npm test                               # client and server test suites
npm run typecheck --prefix server
npm run build --prefix server
npm run typecheck --prefix client
npm run lint --prefix client           # oxlint, including type-aware rules
npm run build --prefix client
```

The pull request template asks for:
- a **title** that summarises the change, followed by the issue number, e.g. `Stop the search box locking while results load (#31)`
- a **summary** of what changed and why, and the **key changes**
- **how it was tested**: new or updated tests, and anything checked by hand
- the **issue it closes** (`Closes #X`) and any **dependencies** (`Depends on #X`)

PRs with empty or one-line descriptions won't be reviewed until they're filled in.

## Reviewing a Pull Request
Every PR needs an approving review from a team member other than its author. Reviews should be spread across the team, so check who has reviewed least before picking one up. As a reviewer:

1. Read the linked issue first, and check the PR does what it asks.
2. Check out the branch and run it, rather than only reading the diff:
   ```shell
   gh pr checkout <number> --repo fn5-310/movie-recommender
   npm run dev
   ```
3. Check the code:
   - Is the change focused on the issue, without unrelated edits?
   - Are new behaviour and bug fixes covered by tests, including error and edge cases?
   - Are errors handled, and shown to the user where relevant?
   - Are types sound (no `any`, no unchecked `as` casts or `!`)?
   - Do comments explain *why* rather than repeat *what* the code does?
   - Are secrets kept out of the code and out of `VITE_*` variables?
   - Is the documentation updated if behaviour or setup changed?
4. Leave specific comments (file and line, what's wrong and why) and finish with **Approve** or **Request changes**. A comment-only review isn't an approval.
5. Re-review when the author pushes fixes, and resolve your comments once they're addressed.

Congratulations! You have successfully contributed to the `movie-recommender` project!

## Frontend Type Checking and Linting
The client uses strict TypeScript (`strict`, `noUncheckedIndexedAccess` and `noImplicitReturns` in `client/tsconfig.app.json`) and is linted with [oxlint](https://oxc.rs/docs/guide/usage/linter.html). The lint includes type-aware rules that reject `any` values and unhandled promises. CI runs both on every pull request, and you can run them from `client/`:
```
npm run typecheck
npm run lint
```

These conventions keep both passing:
- Request TMDB data through the functions in `client/src/api/`, which use `tmdbGet` and the response types in `client/src/types/tmdb.ts`, instead of calling `fetch` in a component.
- Treat values read from storage, `JSON.parse` or form inputs as `unknown` and check them before use (see `client/src/utils/searchStorage.ts`), instead of casting with `as`.
- Indexing an array gives `T | undefined`, so handle the `undefined` case (or use `?.`) instead of adding `!`.
- If you don't want to wait for a promise, such as `navigate()` in a click handler, mark it with `void`.

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

Some code waits before acting, such as the debounce on the search input. Don't wait for these delays in real time (with `setTimeout` or a longer `findBy*` timeout), because the test can fail on a slow or busy machine. Instead, call `vi.useFakeTimers({ shouldAdvanceTime: true })` and advance the clock by the delays in `client/src/constants/debounce.ts`, wrapping each advance in `act()`. `client/src/App.spec.tsx` shows the pattern.

While frontend testing can confirm the logic of the DOM state e.g. what classes a component has, what text is displayed, it is unable to test direct visual state, e.g. responsiveness, component alignment, etc. This is more suitable to tools such as Playwright, which currently is not implemented, with no immediate plans of doing so.

### Backend
Backend testing is typically either unit tests on controller files, or integration tests on route files.

Unit tests sit next to the file they test in `server/src/` (e.g. `src/config.spec.ts`). They call the function directly and replace its dependencies with fakes — for example, `createTmdbClient("key", fakeFetch)` instead of calling the real TMDB API.

Integration tests live in `server/test/integration/`. They build the real app with `createApp(testConfig, fakeDeps())` (override any dependency, e.g. `fakeDeps({ tmdb })`) and send HTTP requests to it with `supertest`, so routing, middleware and error handling are all tested together. Shared test data and fakes are in `server/test/fixtures.ts`. See **Adding a Backend Route** above for an example.

