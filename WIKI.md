# Welcome!

This wiki denotes the project documentation, largely consisting of:
- The work-distribution between each member,
- Mistakes made in the process of development, 
- Group meeting minutes,
- Other documentation details that don't quite fit anywhere else.

Currently we don't require contribution to the wiki, but if you want to contribute to the project, or point out any document issues, please refer to the [Contributing Guidelines](CONTRIBUTING.md) document.

Please also look through our [Code of Conduct](CODE_OF_CONDUCT.md) for expected behaviour when interacting/contributing with the project.

## SonarQube
SonarQube was used in the project, both as a recommended linter extension when using an IDE, and also SonarCloud which provides a pre-merge check for security implications. We integrated this as soon as we were able to, and it has helped to keep our code more secure.

<img width="735" height="436" alt="image" src="https://github.com/user-attachments/assets/9e1c9d80-fda3-462a-8c54-cc00c2fc715d" />

The above screenshot show SonarCloud returning no errors, as of the newest release tag.


## Snyk
Snyk is a platform used to find security vulnerabilities in the packages used. As shown from the image below, there were no vulnerabilities associated with the project, in any of the package files. A potential reason for this is that node.js has its own vulnerability checker against a public database via `npm audit`. Therefore, most of the packages now have two levels of scrutiny, under both Snyk and npm.

<img width="620" height="219" alt="snyk vulnerability screenshot" src="https://github.com/user-attachments/assets/01a5f1ac-0284-421b-b873-05915ec2b318" />

## CI/CD
There are currently three pre-merge CI checks on the project. As mentioned earlier, SonarCloud has a pre-merge check to ensure no issues or security vulnerabilities are detected. Snyk also provides its own CI check for checking package security. Finally, there is a CI check to ensure all tests pass by starting an Ubuntu instance, running the install script and running all tests for both client and server. Once all these are met, the PR is suitable for review.

Because this automated test check does not have a `.env` file of its own, it is important to note that **no test case should reach out to TMDB unmocked**, as no API key is provided.

### Automated test issue
While testing the workflow for the automated tests, there was one issue where the instance could not install the dependent packages due to a discrepancy in `package-lock.json`. For this reason it is important to always commit your `package-lock.json` whenever it is noted as changed. In the chance that the issue still isn't fixed and the workflow still fails, it is recommended to delete the `node_modules/` folder and `package-lock.json` file wherever the issue is present, and reinstall by running `npm install`, recommitting the lock file.

## Issue Labeling System
While we have adopted the default issue labels as they have fit into the project, we have also added some labels for additional context. The most commonly used labels are:
- `bug` - Any errors, crashing or otherwise unexpected behaviour from the website
- `enhancement` - Any additional tweaks or features not explicitly described in the original project brief
- `documentation` - Any changes required to the Wiki, `README.md`, `CONTRIBUTING.md` or `CODE_OF_CONDUCT.md`, e.g. grammatical/spelling errors, missing/unclear sections.
- `key task`- A major task as noted in the original Project Proposal, a key function for the website to fit the initial vision. Issues under this label will also define under which milestone (A1/A2) they are to be completed.
- `refactor` - Any change required to code that doesn't change external behaviour e.g. strict TS checking, restructuring, etc.

## Issue Types without Templates
For any issues that need to be submitted that don't have any relevant template, the issuer should strive to keep the formatting as even and consistent with the existing issue templates as possible.

## Issue Approval Process
The issue approval process is done in-person and online. During weekly meeting team members bring forward the additional features that they want to add, and the team reviews if it is worth pursuing considering time constraints and their additional workload. Issues can also be approved online, via group discussion, and typically approved before the issue is posted. In some select instances, an issue posted may have a comment indicating approval, if it were not discussed beforehand. This is still valid, and was likely done in the interest of time, not having to wait until the next meeting to discuss further.

## AI Usage
AI was used for development to assist in the creating of the boilerplate code that served as the template that all team members worked from. Furthermore, many team members used AI for guidance in their allocated tasks, to solve the best method for an implementation given time constraints, and troubleshoot common errors. This was especially valuable as many team members have never used Node, much less the MERN stack before, therefore this was their first time needing to familiarise with the new concepts.

AI was also used on some occasion for code review, for pointing out immediately blatant errors, speeding up workflow when no members were available.

AI was **not** used for documentation; the wiki, `README.md`, `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md` are all manually drafted and edited.

---
## Using a shared-repo model instead of fork-and-pull
There have been 2 instances for which we have merged PRs using a branch instead of from a forked repo.

The first was before proper consideration for the process - we were under the impression that the fork-and-pull model was for contributors that weren't part of the group, e.g. for A2. This is because the setup involved being part of the same GitHub organisation with elevated permissions, therefore it felt more practical to use branches, as we typically do with previous university projects.

The first instance was the initial merge of the website template. We were not aware of the requirement of fork-and-pull at this time, and some members of the team didn't know how to fork the repo. After this, we all, during an in-person meeting, clarified the workflow, and were on the same page regarding forking. Therefore, we weren't expecting any other issues relating to this.

The second instance was when adding the SonarCloud quality gate badge to the `README.md`. Because it was such a small commit, it was reviewed without much consideration for whether the branch was on the organisation repo or the forked repo. The suspected cause is making a branch on the IDE without correctly verifying which repo was being worked on (making a new branch on the organisation repo, not the fork). This was discovered later, and the team altogether was briefed on the incident, enforcing the need to ensure they are working on the forked repo.

---
## Using a merge commit vs squashing
Similar to above, many of the team didn't know what or how to squash merge. The two earliest PRs were merge commits, before the team learned of the requirement to squash, and we were briefed in a weekend and in online messages how the workflow should be, including squashing to merge. This has been effective up to this point, and all PRs since then have been squash-merged.

A more recent incident of this occurring was done without consideration, possibly in regards to other project happening concurrently that don't require squash merging. To rememdy this, the option to merge-commit was disabled, as the brief seems to specify specifically for squash merging in all cases - therefore other methods aren't needed.

---
## Not implementing test cases for code implementations
The requirement for test cases wasn't clarified within the team for a while, until some time after merging the template onto `main`. Many members of the team weren't familiar with Node or the MERN stack, and we generally were unsure of how to proceed in regard to creating tests.

One member of the team did research and found `vitest` as a potential testing framework that would work for the project. However, because no one had used this before, it was crucial to do some sandboxing to ensure
- (a) this was suitable for the project and
- (b) they were familiar enough to make example test cases that could be modified and replicated by other members of the team.

In this time, due to time constraints and other dependent implementations, there was one PR that went through before the test library implementation, which added the search bar component and converted the React code from JavaScript to TypeScript. After this, the test implementations were able to go through, and all future code implementations have the requirement for added test cases.

Regarding the search bar component, there were some basic test cases added for them with the test case implementation, however there is the opportunity to add extra test cases at a later date.

---
## Not having corresponding issue with PR

Of the pull requests that were merged into the organisation's `main`, two did not have a corresponding issue.

The first was the initial template merge, which as previously mentioned we were focused on having a template, and with less regard to the proper workflow; at this point we would've considered there's no actual "issue" to assign, so the merge would've gone through regardless. Since then, we've reconsidered the approach and created labels to denote key tasks, therefore we can justify tasks being documented in GitHub issues.

The second time was the aforementioned SonarCloud badge on the `README.md`. This didn't have a particularly valuable addition aside from having a display to look more official, such as other repositories which often have multiple badges. As it was a quick one-line addition that didn't affect the code, we did not have an issue for it. While technically incorrect for workflow, the impact is small enough to not affect the project detrimentally. Furthermore, we do not intend to include any other badges, therefore this circumstance is an exception, and will not occur again.

---
## Not using issue/PR templates
Before the issue/PR templates were created and merged, the formatting of the pull requests and issues were inconsistent and lacking, on occasion being entirely empty. This is no longer an issue because the issue templates are expansive enough to go over most cases, and the PR template is automatically provided and reasonably well-encompassing for the information the code reviewer needs to know. Nonetheless, the team was briefed to always use the pull request template, and to properly format their issues should they choose to forgo the issue templates for any reason, being as informative and concise as possible.

---
## Closing Wrong Issues
In one instance, the closing keywords were applied to the incorrect issue when a PR was merged into main. Somehow, the issue was also able to be closed from a merge in a fork repo that didn't interact with the organisation repo at all. The issue was reverted with justification, and the correct issue closed.

This happened a second time for the exact same issue and similar pull request, but this was also reverted.

From this, the team and the person who caused the initial problem were prompted to double-check the issue they link to their PR is correct, and to edit their comment if need be.

--
## Potential Improvements
Although these features weren't explicitly required by the assignment, the project may have benefited by enforcing uniformity for the below actions:

### Branch Name Conventions
Although the general concept of branch naming is familiar enough, it is not uniform between all contributors. Some people use category prefixes (e.g. `feature/` or `fix/`), while others do not. Having this be clear would've set a very uniform precedent for documentation and future contributors.

### Code review Uniformity
There was no defined protocol for how to conduct a code review. While we believe all members acted in good faith and performed to the best of their ability, this standard isn't set consistently, and in some cases may have added minor bugs between contributions. Having a clear list as a reviewer, to check through, ensuring the bare minimum (or even enforcing some aspects, such as checking for sufficient comments) would've led to a better structure, and thereby more of a smooth review process.

# Refactor
The migration was an effective modernization rather than a simple file-extension change. It improved compile-time correctness, module separation, testability, external-service resilience, configuration handling, and CI enforcement while preserving the existing backend behavior.

Its strongest maintainability benefit is the introduction of explicit, typed boundaries between the application, database, controller, routing, and TMDB layers. The successful type-check, build, and 122-test backend suite provide good evidence that the refactor is functioning correctly. Further improvement would mainly involve deeper runtime validation of TMDB payloads and continuing to add typed integration coverage as new backend features are introduced.

--
Listed below are the current team members, and their contributions to the project (not including code reviews):

## Crynner (*Calvin Shih*)
- Implemented test libraries and example test files
- Implemented markdown template for pull requests
- Added 4 markdown templates for issues (bug report, feature request, key task, doc changes)
- Created `README`, `CONTRIBUTING`, and `CODE_OF_CONDUCT` doc files
- Added random movie button and associated styling
- Centralised `.env` location to project root (refactor)
- Implemented basic clustering with react-force
- Sanitising repo of unused template files

## harrywu23 (*Harry Wu*)
- Converted client-side to TypeScript
- Implemented search bar component on frontend
- Refactored CSS files that were unused/redundant
- Implemented Sonar and Snyk
- Implemented basic clustering with react-force

## willjinjin (*Will Jin*)
- Created initial project template
- Designed the UI and layout of app and components using Figma

## Comrademonke (*Vincent Ung*)
- Added dynamic movie details page with poster, title, genres, rating, cast (headshots + character names), runtime, overview, and release date
- Added persistent search bar
- Set up the client-side routing scaffold for the dynamic /movie/:id route
- Added error/not found fallback states with error message and a back button

## MonkePeek (*George Talukder*)
- Implemented filter/discover feature: genre, actor, year, rating, sort, and active-filter chips
- Combined filters with free-text search
- Added corresponding test coverage

## ivanyuch (*Ivan Yu*)
- Added movie recommendations in movie details page
- Added expandable reviews in movie details page
- Added persistent filter (expanding on persistent search bar)

## Dylan Liddle (*@DL-Eng-Acc*)
- Improve README setup instructions for new contributors (PR: #28, Issue: #27)
- AI recommendation card and graph overlay (PR: #25, Issue: #26, #2)
- Code review on PRs(#29, #24, #84)

## Shenol Peiris (*@nikopeiris*)
- Feat/llm recommendation (PR: #4, Issue: #2)
- docs/updating-documentation by adding meetings mins and contributions (PR: #84, Issue: #83)
- Code review on PRs(#28, #5)
- Code review on fn5-310 PRs(#72, #73, #74, #75, #76, #78, #80, #81, #82)

## Kenny Geng (*@imke11*)
- Feat/random movie filters and Toast Notification (PR: #22, Issue: #21)
- Code review on PRs(#25)

## Gabriel Liu (*@Gabeliu*)
- Add Snyk dependency scan to CI (PR: #20)
- Make the Filters button easier to find (PR: #13, Issue: #12)
- Frontend type safety and linting (PR: #11, Issue: #7)
- Restore saved filters when returning to search (PR: #10, Issue: #8)
- Fix flaky search tests (PR: #9, Issue: #6)
- Code review on PRs(#23, #17)

## Dandan Wu (*@WhoWhatWhereAmI*)
- Tidy profile logout feedback and account navigation styling (PR: #29)
- Add protected profile page and profile logout (PR: #24, Issue: #1)
- Add login, registration, and account navigation (PR: #23, Issue: #1)
- Add front end authentication context and session states foundation (PR: #17, Issue: #2)
- Code review on PRs(#20, #22, #15, #4)

## Scott Wallace (*@Swal289*)
- Feat/user endpoints (PR: #19, Issue: #18)
- Feat/Basic Database Integration (PR: #15, Issue: #14)
- Code review on PRs(#13, #10, #9), left as PR comments

## Neia Tererei (*@rbntres*)
- Feature/backend ts migration (PR: #5, Issue: #16)
- Code review on PRs()

# Meeting minutes 
## 19/10/2026 Meeting Notes
### Present (Shenol, Kenny, Dandan, Dylan, Neia, Gabriel, Scott)
- practising demo presentation
- finalsing project

## 12/10/2026 Meeting Notes
### Present (Shenol, Kenny, Dandan, Neia, Gabriel, Scott)
- updating eachother on project progress
- allocating extra features to people with less work

## 5/10/2026 Meeting Notes
### (No meeting)

## 28/09/2026 Meeting Notes
### Present (Shenol, Kenny, Dandan, Neia, Dylan, Scott)
- Reviewing PRs and creating issues and features requests
- updating project progress (most hasnt started)

## 21/09/2026 Meeting Notes
### Present (Shenol, Kenny, Dandan, Neia, Dylan, Scott, Gabriel)
- allocating tasks and roles to group
- project set up and forked main repo to org

## 23/08/2026 Meeting Notes
- Devising demo presentation structure
- Allocating team members for remaining open PRs
- Ensuring all team members have sufficient contributions (2 PRs, 2 code reviews)

## 18/08/2026 Meeting Notes
- Setup Snyk on repository and run analysis
- Allocating remaining tasks
- Stand-up/progress check per team member
- Will follow up with absent team members on their progress

## 11/08/2026 Meeting Notes
- Progress check/stand-up
- Code review outline practice
- Discovering SonarCloud and SonarLint (may use in repo)

## 03/08/2026 Meeting Notes
- Initial task allocation for key tasks
- Documentation structure review
- Discussed comment styles, issue structure

## 27/07/2026 Meeting Notes
- Project ideation
- Project feature ideation
- Milestone allocation