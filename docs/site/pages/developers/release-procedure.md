---
title: Release Procedure
---

# dash.js Release Procedure

## Branching model

dash.js follows a Gitflow-style model with three kinds of branches:

* **`development`** — the integration branch. It is **always open**: feature and
  enhancement PRs for the *next* version keep merging here throughout the entire
  release cycle. It is never frozen.
* **`RC_vX.X.X`** — the release (stabilization) branch for one specific version.
  It is cut from `development` at code freeze and receives **only bug fixes** for
  that version. This is the branch testers build against and the branch the
  release candidates are cut from. It is a branch, not a tag.
* **`master`** — the released state. Each release is a merge of the finished
  `RC_vX.X.X` branch into `master`, tagged `vX.X.X`, with built `dist` files.

The key idea: **the release branch is what gets frozen, not `development`.**
Cutting `RC_vX.X.X` isolates the release so it can be stabilized and tested while
day-to-day development continues in parallel. New feature PRs never have to be
held back — they simply target `development` and ship with the next version.

```
development  ──●──●───────────●───────────●──●──►   next-version PRs keep landing
                  \          ↑ back-merge     ↑ final back-merge (RC → development)
                   \        /  each fix      /
RC_vX.X.X           ●──●───●───────●────────●   only fixes; rc.0, rc.1 … tested here
                                              \
master       ──────────────────────────────────●──►  merge, tag vX.X.X, build dist, publish
```

### Keeping the two lines in sync

Every fix that lands on `RC_vX.X.X` must also reach `development`, or
`development` silently regresses (a bug fixed in the RC reappears in the next
version). Do this **continuously**, not only at the end:

* Merge `RC_vX.X.X` back into `development` after each RC (or cherry-pick each
  fix as it lands). Periodic merges are far less painful than one large merge at
  the very end.
* At release time, do a final back-merge of `RC_vX.X.X` into `development` before
  deleting the branch, so nothing from the release is lost.

## Pre-release (post code-freeze date)

* Cut the release branch `RC_vX.X.X` from `development`. From this point,
  `development` stays open for next-version work — only fixes for this release go
  onto `RC_vX.X.X`.
* Keep the version numbers in `package.json` on the `RC_vX.X.X` branch at the final `X.X.X` release version. Use a
  short-lived `_npm` branch for any `X.X.X-rc.N` npm prerelease builds.
* Every change pulled into this release gets a release candidate, even if the
  changes are minor.
* Create the Release Notes and share them on the Google Groups mailing list for
  feedback.

## During the RC / testing phase

* **Only bug fixes** go onto `RC_vX.X.X`. Build the candidates from this branch
  and hand them to testers.
* **Feature work continues on `development`** for the next version — no freeze.
* Back-merge every fix from `RC_vX.X.X` into `development` (see *Keeping the two
  lines in sync* above) so the next version inherits all the fixes.
* Optionally publish `x.y.z-rc.N` builds to npm under the `next` tag so testers
  can install them like a real user (see *Publishing to npm → Release candidate*).
* Iterate: fix on `RC_vX.X.X`, cut a new candidate, re-test, until the branch is
  clean.

## Release

* Merge the finished `RC_vX.X.X` branch into `master`. (`master` should end up in
  the exact state of the latest, approved RC branch.)
* Pull `master` locally and build the `dist` files with `npm run build`.
* Push the resulting `dist` files to `master`.
* Draft the release with the Git Release UI:
    * Tag the release with the version number, e.g. `vX.X.X`.
    * Title the release `dash.js vX.X.X`.
    * Add the release notes created beforehand.
    * Save as a draft for now.
* Update and upload the archive index page for the player.
* Publish the Git release by opening the saved draft and clicking publish.
* Publish to npm following the procedure below.
* **Back-merge `RC_vX.X.X` into `development`** one final time so the release
  state (final version bump, any last fixes) is reflected there.
* Get the tag release URL and send out the official dash.js release email.
* Delete all `RC_vX.X.X` branches for cleanup.

---

## Publishing to npm

Publishing happens exclusively through the manually triggered `Publish to NPM` GitHub Actions workflow
(`.github/workflows/publish_npm.yml`). Never run `npm publish` locally: the workflow uses
[npm trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC, no tokens) and verifies the exact
tarball before it ships — tests, lint, dist build, tarball content assertions and a consumer-app playback
smoke test all have to pass first.

Keep in mind: **npm versions are immutable.** Once a version is published it can never be replaced or
reused, even after unpublishing. The steps below exist to make sure a broken build never reaches `latest`.

### 1. Prepare

* Bump the version in `package.json` on the `RC_vX.X.X` branch. The workflow refuses versions that already
  exist on npm. Use the format `x.y.z-rc.N`.
* Commit and push. The workflow publishes the ref you dispatch it from.

### 2. Rehearse (always)

* GitHub → Actions → `Publish to NPM` → Run workflow, keep the defaults (`dry_run: true`).
* This runs the complete pipeline including `npm publish --dry-run` — nothing is published.
* Fix anything that fails and repeat until green.

### 3. Release candidate (recommended for major or risky releases)

Publish `x.y.z-rc.N` to npm under the `next` tag so testers can install it exactly like a real user. The
`-rc.N` version bump needs its own commit, but you don't want that commit in the history that gets merged
into `master` and back into `development`. So do the bump on a short throwaway branch cut from the current
state of `RC_vX.X.X` — only the workflow needs to see it. The stabilization branch `RC_vX.X.X` keeps its
`package.json` at the plain release version.

* Create a short throwaway branch from the current RC state:
  ```bash
  git checkout RC_vX.X.X
  git checkout -b RC_vX.X.X_npm
  ```
* Set the `version` field to `x.y.z-rc.0` (updates `package.json` and `package-lock.json`):
  ```bash
  npm version x.y.z-rc.0 --no-git-tag-version
  ```
* Commit and push the branch:
  ```bash
  git commit -am "Bump version to x.y.z-rc.0"
  git push -u origin RC_vX.X.X_npm
  ```
* Dispatch `Publish to NPM` with `dry_run: false` and `tag: next`, and **select the throwaway branch in the
  "Use workflow from" dropdown** — the workflow publishes the `package.json` of the branch it runs on.
* This is a real publish to the real registry, but `latest` stays untouched. The workflow blocks
  prerelease versions on the `latest` tag.
* Verify from the outside, exactly like a user would:
  ```bash
  mkdir /tmp/dashjs-rc-check && cd /tmp/dashjs-rc-check && npm init -y
  npm install dashjs@next
  ```
  Load the player and play a stream.
* If the RC is broken: fix on `RC_vX.X.X`, re-cut the throwaway branch, bump to `-rc.1`, repeat. Nothing is
  lost, and the fix is already on the branch that will be released.
* Delete the throwaway `_npm` branch once you're done with prerelease publishing. The final release in
  step 4 happens on `RC_vX.X.X` itself, so no `-rc.N` version bump ever pollutes the released history.

### 4. Final publish

* On the `RC_vX.X.X` branch, set the `version` field in `package.json` to the final `x.y.z`
  (e.g. `npm version x.y.z --no-git-tag-version`), commit and push, run step 2 once more, then dispatch
  with `dry_run: false` and `tag: latest`.

### 5. Verify the published package

* `npm view dashjs version` shows the new version.
* `npm install dashjs@latest` in a scratch project installs and plays.

### If a broken version reaches npm anyway

Never try to republish the same version number — npm will reject it. Fix forward:

* Bump the patch version, fix the problem and publish again.
* Deprecate the broken version so installs warn about it:
  ```bash
  npm deprecate dashjs@x.y.z "Broken release, use x.y.z+1 instead"
  ```
* If the broken version holds the `latest` tag and the fix needs time, point `latest` back to the last
  good version in the meantime:
  ```bash
  npm dist-tag add dashjs@<last-good-version> latest
  ```
