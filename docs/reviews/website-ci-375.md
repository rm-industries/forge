# Website CI selection and cadence

[Ticket 375](https://github.com/rm-industries/forge/issues/375) applies the
[baseline inventory](ci-baseline-367.md) to the independent website consumer.
The shared impact selector consumes the complete changed path set. Website source,
lockfile, layouts, styles, assets, build configuration, shared setup and unknown
inputs retain the full browser suite. Known package/template-only changes skip
website validation: those inputs do not replace its independent registry dependencies.
All Markdown under `docs/` is consumed by Astro, including review notes, so it
still runs website source checks, build validation, Chromium browser/accessibility
checks and Lighthouse budgets. Mixed changes take the broader selection.

Only a complete, nonempty set of documentation Markdown changes selects Chromium
alone. Accessibility assertions still execute with axe; Lighthouse still checks
performance, SEO and best-practice budgets against the inspected build. Firefox
and WebKit coverage for documentation-only changes moves to the weekly broad run
(Monday 07:41 UTC). Executable website changes retain all three browser projects.
Manual dispatch also runs broad validation. Schedules validate the default branch;
maintainers should investigate failed broad runs and use manual dispatch to verify
repairs. Neither event deploys; production deployment remains main-push-only.

The baseline successful website run spent 142 seconds on browser/accessibility and
147 seconds on Lighthouse. Documentation-only events now select one rather than
three browser projects (two thirds fewer project executions) and install only
Chromium. This is an execution-count reduction, not a measured runtime saving:
no post-change hosted run has been collected. Lighthouse is intentionally retained
because content can affect budgets and layout. The new impact job adds overhead,
but removes the old trigger filter's blind spot for shared/unknown inputs.

The production build is created once after source checks pass. Build validation,
browser tests and Lighthouse download that artifact; the Pages artifact comes from
the same build. Deployment waits for every applicable validation job, and deployed
smoke still checks routes, assets and mobile layout against the resulting URL.
Selection failure cannot release a build because all source jobs depend on selection.
The separate CMS candidate/native-save probes remain unchanged: prior focused
Chromium serialization coverage already avoided a redundant full CMS matrix.

Rollback is a code revert of this workflow and the matching impact-selector change.
No branch protection or environment settings change. To restore full browser coverage
without changing routing, run both browser branches with the existing full install
and `npm run test:e2e`. Local workflow contracts cover selection wiring, artifact
handoffs and main-only deployment; live provider execution and duration remain
unverified until the first scheduled or manually dispatched run.
