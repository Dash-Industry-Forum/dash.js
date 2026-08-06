---
title: Release Procedure
---

# dash.js Release Procedure

## Pre-release: (Post Code Freeze Date)
* Update version numbers in `package.json`
* Create a new release candidate for all changes pulled into the `development` branch (even if they are minor).
* The release candidate should be a branch named RC_vX.X.X not a tag.
* Create Release Notes and share on Google Groups mailing list for feedback.

## Release
* Merge the `development` branch into the `master` branch. `development` should be the same exact state as the Latest RC Branch.
* Once the changes are merged into the `master` branch pull the `master` branch locally and build `dist` files by running `npm run build`.
* Push the resulting `dist` files to the `master` branch.
* Use the Git Release UI to draft a release.
    * Tag the release with the version number, e.g. `vx.x.x`
    * Title the release `dash.js vX.X.X`
    * Add the release notes created beforehand.
    * Save as a draft for now.
* Update and upload the archive index page for the player.
* Publish the Git release by going to saved draft and clicking publish.
* Publish to npm following the procedure below.
* Get Tag release URL and Send out official Dash.js Release Email 
* Delete All RC Branches for cleanup

## Publishing to npm

Publishing happens exclusively through the manually triggered `Publish to NPM` GitHub Actions workflow
(`.github/workflows/publish_npm.yml`). Never run `npm publish` locally: the workflow uses
[npm trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC, no tokens) and verifies the exact
tarball before it ships — tests, lint, dist build, tarball content assertions and a consumer-app playback
smoke test all have to pass first.

Keep in mind: **npm versions are immutable.** Once a version is published it can never be replaced or
reused, even after unpublishing. The steps below exist to make sure a broken build never reaches `latest`.

### 1. Prepare

* Bump the version in `package.json`. The workflow refuses versions that already exist on npm.
* Commit and push. The workflow publishes the ref you dispatch it from.

### 2. Rehearse (always)

* GitHub → Actions → `Publish to NPM` → Run workflow, keep the defaults (`dry_run: true`).
* This runs the complete pipeline including `npm publish --dry-run` — nothing is published.
* Fix anything that fails and repeat until green.

### 3. Release candidate (recommended for major or risky releases)

* Set the `version` field in `package.json` (repository root) to `x.y.z-rc.0`, either by editing it
  directly or by running:
  ```bash
  npm version x.y.z-rc.0 --no-git-tag-version
  ```
* Commit and push the `package.json` change, then dispatch the workflow on that branch with
  `dry_run: false` and `tag: next`.
* This is a real publish to the real registry, but `latest` stays untouched. The workflow blocks
  prerelease versions on the `latest` tag.
* Verify from the outside, exactly like a user would:
  ```bash
  mkdir /tmp/dashjs-rc-check && cd /tmp/dashjs-rc-check && npm init -y
  npm install dashjs@next
  ```
  Load the player and play a stream.
* If the RC is broken: fix, bump to `-rc.1`, repeat. Nothing is lost.

### 4. Final publish

* Set the `version` field in `package.json` to the final `x.y.z` (e.g. `npm version x.y.z --no-git-tag-version`),
  commit and push, run step 2 once more, then dispatch with `dry_run: false` and `tag: latest`.

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

