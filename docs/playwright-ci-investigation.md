# Playwright CI environment investigation

<!-- cspell:ignore rustup -->

This investigation supports [#398](https://github.com/rm-industries/forge/issues/398)
and its tickets [#444](https://github.com/rm-industries/forge/issues/444) and
[#445](https://github.com/rm-industries/forge/issues/445). It evaluates setup
reliability and complete job duration while preserving Node 26 and browser
coverage. It does not change the repository's CI environments.

## Historical GitHub evidence

The following selected successful Template jobs use GitHub-hosted Ubuntu runners.
Durations are job execution and individual step times from the Actions API, not
workflow elapsed time or queue delay. These four runs are illustrative samples,
not a random sample or a stall-frequency estimate.

| Run                                                                                | Browser job | Browser installation | Browser tests | Lighthouse job | Chromium installation |
| ---------------------------------------------------------------------------------- | ----------: | -------------------: | ------------: | -------------: | --------------------: |
| [Oct 26 stall](https://github.com/rm-industries/forge/actions/runs/40392433059)    |      53m29s |               48m57s |         3m55s |          2m39s |                   23s |
| [Oct 27 stall](https://github.com/rm-industries/forge/actions/runs/40502381077)    |      57m42s |               52m55s |         4m03s |          2m46s |                   27s |
| [Oct 27 ordinary](https://github.com/rm-industries/forge/actions/runs/40603869085) |       6m09s |                  43s |         4m51s |          2m41s |                   23s |
| [Oct 28 ordinary](https://github.com/rm-industries/forge/actions/runs/40673443255) |       5m39s |                  51s |         4m12s |          3m15s |                   37s |

The Oct 27 stalled job's installation log records four retried Ubuntu package
requests and 110 MB fetched in 52m06s from the Ubuntu mirror. Browser archive
downloads completed in approximately 11 seconds. The main observed stall was
Linux dependency installation, not the Playwright browser CDN. Browser setup
consumed about 92% of that job's execution time; this is a useful reliability
baseline even if ordinary-run savings are modest.

## Candidate and reproducibility

On October 28, 2026, the Microsoft registry returned the official
`v1.64.1-noble` OCI index successfully. Its digest was
`sha256:47b510dd9230bf0b9bfc9b20102241e577ea7a99334ab4c3ca19f19770e9b8ea`.
The index contains Linux AMD64 and ARM64 manifests. AMD64 compressed layers total
983,886,837 bytes, which is transfer size metadata rather than measured traffic.

The [versioned upstream Dockerfile](https://github.com/microsoft/playwright/blob/v1.64.1/utils/docker/Dockerfile.noble)
sets Node 24 by default, provides all three browsers and Linux dependencies, and
sets `PLAYWRIGHT_BROWSERS_PATH=/ms-playwright`. Project packages still require
installation. The experiment retains the existing Node 26 setup action and
locked package installation rather than using the image's default Node.

Keep a readable version tag plus an immutable digest, and update the image pin
with the resolved Playwright dependency. A version mismatch must fail explicitly;
re-running browser installation would conceal an invalid comparison and restore
the network dependence being evaluated.

## Controlled GitHub experiment

[Experiment run](https://github.com/rm-industries/forge/actions/runs/40715679472)
uses [the isolated benchmark commit](https://github.com/rm-industries/forge/commit/0fd4fed)
on the same repository revision for host and image jobs. The temporary workflow
is manual-only and does not deploy. It preserves default-denied permissions,
read-only checkout, immutable action pins, and existing test commands.

A single Node 26 preparation job resolves a canonical consumer lockfile and builds
the production artifact. Both environments replay that same source and build.
Browser and Lighthouse categories each have two host and two image repetitions.
The image jobs replace browser installation with an explicit Playwright version
check. The browser tests retain Chromium, Firefox, and WebKit coverage; report
uploads and Lighthouse budgets remain intact. Image jobs use `--ipc=host`, as
recommended for trusted Playwright test workloads.

Job totals must include container initialization/image pulls and Node setup,
while excluding the shared upstream preparation job and queue time consistently
for both environments. GitHub-hosted runner image-layer cache state is unknown;
separate jobs are not proof of controlled cold versus warm pulls. Two repetitions
cannot establish a long-term stall rate.

### Matched-run results

| Category                  | Repetition | Result | Total job | Container initialization | Dependency setup | Browser installation | Test or audit |
| ------------------------- | ---------: | ------ | --------: | -----------------------: | ---------------: | -------------------: | ------------: |
| Browser host              |          1 | Passed |     6m58s |                     None |              24s |                  69s |         5m11s |
| Browser host              |          2 | Passed |     6m29s |                     None |              21s |                  52s |         5m07s |
| Browser image             |          1 | Failed |     6m25s |                      27s |              24s |              Omitted |         5m24s |
| Browser image             |          2 | Failed |     6m36s |                      29s |              21s |              Omitted |         5m25s |
| Lighthouse host           |          1 | Passed |     3m19s |                     None |              21s |                  28s |         2m21s |
| Lighthouse host           |          2 | Passed |     2m25s |                     None |              16s |                  16s |         1m42s |
| Lighthouse image, initial |          1 | Failed |     1m12s |                      29s |              22s |              Omitted |            2s |
| Lighthouse image, initial |          2 | Failed |       58s |                      25s |              20s |              Omitted |            2s |

Totals include container cleanup, artifact transfer, and setup overhead. Dependency
setup includes the existing Node setup action and npm installation. Failed jobs
are compatibility evidence, not faster equivalent executions. Host browser jobs
passed all 159 tests across three engines. Image repetition 1 reported 108 passed,
40 Firefox failures, and 11 tests not run; it did not preserve passing coverage.

### Compatibility probes

Both browser image repetitions failed because Firefox refused to launch as root
when GitHub supplied `/github/home` owned by the image's regular user. The observed
error was "Running Nightly as root in a regular user's session is not supported."
This is a container identity/home compatibility issue, not evidence that the
template's Firefox assertions regressed. Changing the test process home was
considered but not executed; no corrected full-suite result is claimed. Retain
the host setup for full-browser jobs pending a separately validated identity and
home configuration that keeps all three engines passing.

Both initial image Lighthouse repetitions failed at the existing CLI health check
with `Chrome installation not found`. Node 26.12.1 and Playwright 1.64.1 were
verified successfully first. The default image is therefore not a transparent
replacement for the hosted runner's Chrome discovery.

An [adapted Lighthouse run](https://github.com/rm-industries/forge/actions/runs/40716231773)
replays the original run's canonical source/build artifacts. It uses the existing
GitLab template settings: explicit Playwright Chromium `CHROME_PATH` and
`--no-sandbox --disable-dev-shm-usage --disable-gpu`. Both adapted repetitions
passed the existing audit budgets and retained the Lighthouse reports.

| Adapted image repetition | Total job | Container initialization | Dependency setup | Audit |
| ------------------------ | --------: | -----------------------: | ---------------: | ----: |
| 1                        |     3m11s |                      28s |              47s | 1m46s |
| 2                        |     2m57s |                      29s |              21s | 1m48s |

These totals include setup and artifact handling; the step columns are not an
exhaustive breakdown of every second. The rerun adds only `actions: read` for cross-run artifact
access. Root execution and disabled
Chromium sandboxing follow upstream's trusted-test-container guidance; this is
not a general recommendation for browsing untrusted sites.

The [packaged browser-oxfmt probe](https://github.com/rm-industries/forge/actions/runs/40716116941/job/122914157050)
retained the existing native setup and package verification sequence in the
candidate image, omitting browser installation. Node 26.12.1 setup succeeded,
but native setup failed with `rustup: command not found` (exit 127). Packaged
browser tests did not run. Retain the existing combined native/package job until
Rust bootstrap overhead and package tests are evaluated separately; moving only
the image would break its current prerequisites.

A [second package probe](https://github.com/rm-industries/forge/actions/runs/40718757466/job/122923566775)
reused the current GitLab checksum-verified Rust bootstrap. Its SHA-256 check
passed, but invoking the installer as `/tmp/forge-rustup-init` failed with
`unknown proxy name: 'forge-rustup-init'`. This exposes a basename-sensitive
invocation in the reused GitLab setup; it is not a browser-image compatibility
result. Production GitLab configuration was not changed. The final bounded
package probe uses the same verified bytes under the standard `rustup-init`
basename to separate that prerequisite issue from image compatibility.

A separate [website Chromium integration and public-smoke probe](https://github.com/rm-industries/forge/actions/runs/40718852488/job/122923911310)
passed with Node 26.12.1 and Playwright 1.64.1. It built and validated the current
website, then passed all 88 existing Chromium integration/accessibility tests
(46.1s reported by Playwright). The existing smoke test passed against the public
`https://www.rm-industries.com/forge/` deployment (one test, 1.3s), checking the
page, generator metadata, assets, and mobile overflow without deploying or
mutating the site. Both integration and smoke report artifacts were retained.

This single probe took 113s in total, including container initialization (25s),
Node/dependency setup (22s), build (4s), integration step (48s), and smoke step
(2s). It establishes Chromium compatibility for these existing checks, not a
performance comparison with an equivalent host job. Website Firefox/WebKit were
not included in this Chromium-specific probe; full-browser adoption still requires
preserving all three engines. The public smoke result validates the currently
published site, not a newly deployed candidate build.

## GitHub recommendations

| Category                                               | Recommendation                          | Evidence and remaining gate                                                                                                                                                                                                                 |
| ------------------------------------------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full three-browser suites                              | Retain host setup; defer image adoption | Both image repetitions failed Firefox launch while both host repetitions passed 159 tests. Validate container identity/home configuration before claiming equivalent coverage.                                                              |
| Chromium-only Lighthouse                               | Retain current setup for now            | Explicit executable discovery and launch flags made both image audits pass. Successful image totals were 177s and 191s against host 145s and 199s. There is no demonstrated large ordinary-run gain; only two observations per environment. |
| Combined native browser-oxfmt package job              | Retain current setup                    | Candidate failed at missing Rust bootstrap tooling before packaged browser checks. Include its replacement setup cost and run the package checks before reconsidering.                                                                      |
| Deployment smoke and website-specific integration jobs | Retain pending performance evidence     | The existing website Chromium integration and public smoke checks passed in one image probe; no matched host timing or new deployment was tested.                                                                                           |

For Lighthouse, the descriptive two-run median was 184s in the image versus 172s
on the host. This small selected sample cannot establish a material regression,
equivalence, or a stall-rate reduction. Observed image initialization took 25–29s,
comparable to ordinary Chromium installation in the sampled jobs. Larger image
transfers can offset installation savings for Chromium-only work.

Avoiding repeated Ubuntu package downloads remains valuable given the confirmed
48–53 minute installation stalls. The image experiment omits both the per-job
package installer and browser archive installer, but replaces them with registry
pulls. Successful full-browser compatibility is a prerequisite to realizing that
benefit without losing coverage. A separate reviewed follow-on can validate a
suitable container identity, then repeat the full suite and complete-job timing
comparison. No environment switch, custom image, or caching system is introduced
by this report.

To reproduce the historical evidence, query the Actions run jobs API for the
linked run IDs and subtract each job's `started_at` from `completed_at`; apply the
same calculation to installation and test steps. Fetch the Oct 27 stalled job's
logs to attribute its package downloads. The benchmark commits and run links
preserve the exact experimental commands and artifacts without changing the
normal workflows on the integration branch.

## GitLab assessment

GitLab compatibility is assessed from official documentation and the current
configuration, not a GitLab benchmark. GitHub results do not establish GitLab
job duration or stall frequency. The [GitLab image documentation](https://docs.gitlab.com/ci/docker/using_docker_images/)
supports a digest-pinned job image on a Docker executor. The destination runner
must support that executor, the selected architecture, registry access, and an
appropriate image pull policy. Its shell and entrypoint must accept the runner's
scripts; working directories and build-artifact paths must remain unchanged.

The upstream image defaults to Node 24. GitLab's current `node:26` job image
cannot simply be replaced: explicitly install and verify Node 26 before `npm ci`,
using a verified runtime distribution and accounting for that download and setup
cost. GitHub's setup action cannot be copied into a GitLab script. Retain the
image's `PLAYWRIGHT_BROWSERS_PATH=/ms-playwright` and align its immutable digest
with the project's resolved Playwright version. Avoid an unnoticed fallback to
browser or Linux dependency installation, which would restore the stalled path.

Existing GitLab Lighthouse jobs already derive `CHROME_PATH` through Playwright
and scope `--no-sandbox --disable-dev-shm-usage --disable-gpu` to their root-run
audits. These settings made the GitHub image audits pass, providing useful
compatibility evidence for those commands rather than proof of GitLab runtime.
Preserve those scoped settings, browser executable discovery, preview-server
readiness and shutdown, report paths, and existing audit budgets. Full-browser
jobs still need validation of user/home ownership and all three engine launches;
GitHub's Firefox failure must not be assumed to occur identically on GitLab.

Retain GitLab build-artifact dependencies, browser HTML reports and test results,
JUnit report locations, always-upload behavior, and seven-day retention. The
combined browser-oxfmt job also needs its existing checksum-verified Rust
bootstrap, pinned toolchain, repeated native-build identity checks, package
contents checks, and runtime-matrix artifacts. The reused bootstrap's installer
basename failed in the GitHub probe above; do not assume checksum verification
alone establishes a working bootstrap invocation. Its Node image has different
prerequisites from a GitHub-hosted runner; neither GitHub's missing-tool failure
nor its timings can be transferred directly to that job.

**Recommendation: retain the current GitLab setup and defer an image switch.**
Documentation supports a later implementation based on the GitHub findings, but
Node 26 setup, runner behavior, browser identity, native/package checks, preview
lifecycle, and reports remain destination-specific verification gates. Server-side
CI Lint and an eventual runner check are useful follow-on validation, not required
measurements for this investigation. Any avoided package-mirror requests or
reduced stalls on GitLab remain inferred benefits.

## Generated consumer CI

Generated YAML belongs to the consumer after bootstrap; there is no regeneration
command or automatic update of existing projects. Consumers select Node 22, 24,
or 26 (default 26), so a later change must preserve that selected major rather
than apply the website's Node 26 rule to every consumer.

Fresh consumers resolve their own dependency graph. A fixed image matching
Forge's root Playwright version can therefore fail to locate their browsers.
The job image is selected before its script runs: reading the installed version
inside that script is too late to change the current job's image. A viable later
design must select a matching version and digest before execution, coordinate
consumer dependency and image upgrades, and reject mismatches explicitly. A
browser-install fallback would reintroduce the network dependence and cannot be
counted as successful image adoption.

Preserve scheduled/manual full-browser coverage and ordinary Chromium-only
coverage, deployment/smoke primary-provider gates, scoped Lighthouse launch flags,
preview lifecycle, and artifacts/reports. Keep immutable action/image pins and
default-denied workflow permissions. The consumer's independently maintained YAML
and supported Node choices add maintenance cost beyond Forge's own workflows.

**Recommendation: defer generated-CI image adoption.** The demonstrated Ubuntu
package stalls justify a focused follow-on if full-browser compatibility is
resolved, even without a median speedup. That follow-on must first establish
version/digest coordination and selected-Node setup, then verify the generated
jobs' existing contracts. Do not automatically emit a repository-version image
or change consumer-owned YAML as part of this investigation.

## Consolidated decision

| Provider and category                                 | Decision                          | Basis and next gate                                                                                                                                                 |
| ----------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub full-browser suites                            | Retain; defer image adoption      | Large historical installation stalls justify further work, but image Firefox coverage failed. Validate identity/home settings and repeat complete-suite timings.    |
| GitHub Chromium-only Lighthouse                       | Retain                            | Adapted image audits pass; two samples show no established total-duration or reliability advantage. Keep explicit discovery and scoped root flags in any follow-on. |
| GitHub native/package, smoke, and website integration | Retain or defer as detailed above | Native setup failed; website Chromium integration and public smoke passed. Retain until the remaining package and performance gates are verified.                   |
| GitLab categories                                     | Retain; defer image adoption      | Documentation-based equivalence only. Node setup, runner configuration, and preserved checks remain unverified; performance benefits are inferred.                  |
| Generated consumer CI                                 | Defer                             | Independent versions, image selection timing, supported Node choices, and consumer ownership need a coordinated upgrade approach.                                   |

This decision does not reject the image because typical jobs are already fast.
Removing a repeated package-mirror stall remains a valuable outcome. The current
evidence instead identifies compatibility gates that prevent claiming equivalent
coverage today. A separate reviewed change can resolve those gates and remeasure
complete jobs without reducing coverage; it should report remaining uncertainty
rather than invent a numerical adoption threshold. No rollout, custom image,
shared permission change, or broad caching project is included here.

## Remaining acceptance

This report provides investigation evidence and recommendations; it does not
complete every acceptance check. [#444](https://github.com/rm-industries/forge/issues/444)
and [#398](https://github.com/rm-industries/forge/issues/398) remain open: packaged
browser-oxfmt browser checks were not reached. Website Chromium integration and
public deployment smoke checks passed in the candidate environment, with no
matched host timing for that probe and no newly deployed candidate.
Runner cache state was unknown, so controlled cold/warm behavior also remains
unverified. These are explicit limits on the evidence, not successful checks.
The documentation-based GitLab and generated-CI consolidation in
[#445](https://github.com/rm-industries/forge/issues/445) is complete. No environment
rollout is included or implied by completing that assessment.

## Sources

- [Playwright Docker guidance](https://playwright.dev/docs/docker)
- [Playwright CI guidance](https://playwright.dev/docs/ci)
- [GitLab job images](https://docs.gitlab.com/ci/docker/using_docker_images/)
- [GitHub job containers](https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/run-jobs-in-a-container)

The image moves browser and Linux dependency acquisition into registry layers;
it does not eliminate network transfers. Registry pulls, Node setup, npm package
installation, and artifact downloads remain. Potential reduction in package
mirror requests is an inference until corroborated by execution logs; it is not
a measured count of all underlying HTTP requests.
