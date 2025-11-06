---
layout: default
title: Release Procedure
parent: Developers
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
* Update NPM https://www.npmjs.com/package/dashjs - Just go to package.json in dash.js in type "npm publish"
* Get Tag release URL and Send out official Dash.js Release Email 
* Delete All RC Branches for cleanup

