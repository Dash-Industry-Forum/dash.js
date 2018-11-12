# How to contribute #
As an open source project, operating under a [meritocratic governance model](https://github.com/Dash-Industry-Forum/dash.js/wiki/governance-model), we welcome contributions of any kind. Naturally this includes software contributions, but we also welcome help on documentation, testing, project coordination, marketing, [release preparation](https://github.com/Dash-Industry-Forum/dash.js/wiki/Release-Management) and more.

For any kind of contribution your first port of call should be to join our [mailing list]( https://groups.google.com/d/forum/dashjs). We welcome all contributions to the mailing list (including asking questions which demonstrate our documentation needs to be improved).

The dash.js project serves as the reference player for the DASH Industry Forum. Respecting this, if you wish to contribute features or behavior which are non-conforming with the [interop guidelines](https://dashif.org/guidelines/), then that feature must be explicitly enabled behind a compatibility flag.

## Submitting and managing Issues

We track work in our [Issue tracker](https://github.com/Dash-Industry-Forum/dash.js/issues) and welcome anyone to add items that we should consider. Tracked issues include, but are not limited to, bug reports, feature requests and documentation (support) requests.

To add an issue simply visit the issue tracker and click the "New Issue" button. However, before adding an issue please search to see if there is an existing issue and consider adding more information to that entry rather than creating a new one.

Once an issue has been submitted it will be examined by a member of the developer team and labeled to indicate the likelihood of the issue being addressed in the near future. This is done by assigning a priority labels of either "Pri-Critical", "Pri-High", "Pri-Medium" or "Pri-Low". The meaning of each of these labels is described below. Occasionally an issue will be marked as "wontfix". These issues are invalid in some way, for example, they may be a duplicate of an existing issue, they may not be reproducable or they may not relevant to this project. When an issue is marked as "wontfix" the developer should indicate why this is the case in a comment on the issue.

### Pri-Critical Issues

These are issues that are considered critical to the current development plans and will be included in the next milestone. These issues should also be assigned to a milestone to indicate when they will be delivered.

It is likely that a developer is already working on, or planning to work on, this issue as part of their existing commitments. Anyone wishing to contribute to a critical issue ought to post a message to the project mailing list or issue tracker to ensure their work will be aligned with ongoing work by other developers.

### Pri-High Issues

High priority issues are ones that affect the current development plans and are intended to be in the next release. As with critical issues these should be assigned to a specific milestone, however, it is possible that these issues will slip to a later milestone.

Contributors wishing to work on these issues are well advised to indicate that they plan to work on them in order to ensure they are not duplicating ongoing or planned work by other contributors. By picking up one of these items you ensure that it will be included in the next release.

### Pri-Medium Issues

Medium priority issues do not affect the development plans for the next release but are expected to become important in future releases. These issues may be assigned to a milestone to indicate when they are likely to be fixed. However, the only way to ensure this is the case is to contribute fixes for these issues.

### Pri-Low Issues

Low priority issues are considered valid issues that users might see. However, they are not currently considered important by the current developers. These issues are unlikely to be fixed in the foreseeable future and thus will not be assigned to a milestone.

If you find a low priority issues is affecting your use case then the only way to ensure it gets addressed is to contribute a fix yourself (or have someone else create a fix on your behalf).

## Process for contributing code

1. Before starting work on a new feature, enhancement or fix, ask the group if anyone else is already working on the same task. This will avoid duplication of effort.
1. Read and understand the wiki sections on [Developer Getting Started Guide](https://github.com/Dash-Industry-Forum/dash.js/wiki/Developer-Getting-Started-Guide) and [JSLint compliance](https://github.com/Dash-Industry-Forum/dash.js/wiki/JSLint-Compliance).
1. Read and understand the project's [Branching Strategy](http://nvie.com/posts/a-successful-git-branching-model/).
1. Fork the repository and setup a new branch to work in.
1. In each of your files, include the required BSD-3 header available [here](https://dashif.org/docs/dash.js.license-header.May2013.txt). Be sure to replace the placeholder text "YOUR_COMPANY_NAME_HERE" with the name of your company before adding it to the header.
1. Add or modify unit tests for any new or modified functionality in your patch.
1. Run `grunt` before you commit so that you may catch test failures, lint issues, or syntax errors. Pull requests that do not compile or pass linter checks or pass all unit tests will not be accepted.
1. If you are submitting code as an individual or on behalf of a company who is _not a member_ of the DASH [Industry Forum](http://dashif.org/members), then download, sign, scan and email back to the email list the [Feedback Agreement](https://dashif.org/docs/DASH-IF-Feedback-Agreement-3-7-2014.pdf). Your code will not be reviewed and accepted by the Admins until this has been received. DASH IF members do not need to take this step, as the Forum's By-Laws already cover your submission to this open source project.
1. Issue a Pull Request.
1. The Admins will review your code and may optionally request conformance, functional or other changes. Work with them to resolve any issues.
1. Upon acceptance, your code will be added to the main branch and available for all.
