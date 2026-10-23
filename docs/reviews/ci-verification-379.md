# Combined CI verification and migration evidence

This closes the local verification slice of spec 367 without changing the parent
spec, repository settings, production deployments, packages or existing consumers.
The [final standard](../continuous-integration.md) contains the trigger map and the
separately authorized protection migration/rollback procedure. The
[baseline](ci-baseline-367.md) remains the historical live observation.

## Combined contract

| Input/event                                         | Project and generator                                                         | Website/native/candidate coverage                                   |
| --------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Docs Markdown only                                  | Root source/docs quality; package/generator bodies no-op                      | Website build, Chromium/axe and Lighthouse                          |
| Website only                                        | Root quality; package/generator bodies no-op                                  | Full website browsers and budgets                                   |
| Content-model                                       | Local model plus frontmatter source consumers; no generated registry consumer | Explicit packed frontmatter and native CMS serialization candidates |
| Frontmatter                                         | Frontmatter package and explicit packed model compatibility                   | Independent website/generator remain unrelated                      |
| Browser/native                                      | Native package, Rust quality and package runtime checks                       | Reproducibility, packed browsers and CMS serialization              |
| Generator/template                                  | Packed CLI, generated source/build consumers and distinct behavior fixtures   | Template also reaches native CMS/browser candidate                  |
| Shared/unknown, missing revisions, empty change set | Broad validation                                                              | All selected; full website browser matrix                           |
| Mixed/deleted/renamed                               | Union of actual consumers, including both rename paths                        | Same ownership rules; no release inference                          |
| Weekly/manual                                       | Broad project, generator, native and website validation                       | No production deployment or publication                             |
| PR                                                  | Validation only                                                               | Website deployment/smoke intentionally skipped                      |
| Affected main push                                  | Required selected validation                                                  | Website deployment and deployed smoke must succeed                  |

GitLab reuses the same consumption selector and emits only selected native jobs.
Its mirror trigger waits for child status. Generated standalone/nested consumers
own their emitted YAML: site/shared inputs select validation; unrelated nested
repository changes can succeed without running the site. PRs retain Chromium/axe;
weekly/manual coverage includes full browsers and Lighthouse. Current committed
locks and primary-provider deployment restrictions remain intact.

Local contracts exercise uncertainty, mixed input, deletion/rename paths, actual
diff failure, selected workspace commands and mandatory producer/artifact edges.
Tool/Generator summaries reject unsuccessful prerequisite statuses. Website summary
also rejects cancellation, unexpected skips, failed selection and failed deployed
smoke, while accepting only unrelated site and non-push deployment skips.
Generated-provider execution tests cover the corresponding required-result policy.

## Evidence and limits

- Root: 90 tests; TypeScript; tracked formatting; code/Markdown lint, spelling and
  documentation validation. Three non-native package suites: 117 generator,
  32 content-model and 27 frontmatter tests; their type checks pass.
- Actionlint 1.7.12 parses native workflows with only narrow documented exceptions
  for supported same-repository action/workflow syntax. Shell/Python supplemental
  tools were unavailable. Zizmor 1.31.1 offline scan reports no findings.
- Packed generator evidence from ticket 377 covers 11 isolated scenarios plus
  default starter and customized consumer unit/build/validation/Chromium commands.
  Generated-provider syntax/security scans were also recorded in that slice.
- Packed frontmatter/model public declarations and consumer behavior passed in 373.
  Native serialization remains wired; the separate model-order browser probe times
  out behind a dialog and was not added as a new failing gate. These are different
  contracts; successful serialization does not prove the failed ordering probe.
- Rust validation cannot start locally because the Rust compiler is unavailable. No native
  source changed. Live GitLab CI Lint/runner/report behavior and protection migration remain
  unverified. Hosted checks at the later `ffe7351` revision establish native and
  runtime coverage as recorded below; each corrected revision still needs its own run.
- Reference assessments and proposed alignment issues are in
  [consumer alignment](consumer-alignment-367.md). No reference repository was
  mutated, deployed or migrated; its own custom scripts remain authoritative.

## Counts and timings

The 27 legacy required contexts remain. Conditional steps reduce expensive bodies,
not their compatibility runner jobs. Impact, summary and candidate jobs add runner
overhead; no reduction in total hosted runner-job count is claimed.

| Docs-only work                             | Baseline execution              | Selected execution                       |
| ------------------------------------------ | ------------------------------- | ---------------------------------------- |
| Local package builds                       | Four workspaces                 | None                                     |
| Package runtime lanes                      | Four                            | No-op bodies                             |
| Generator candidate/consumer runtime lanes | One package plus five consumers | No-op bodies                             |
| Root source/documentation quality          | Five jobs                       | Same five jobs                           |
| Website browser projects                   | Three                           | Chromium/axe; all three on weekly/manual |

This statically skips 23 historical project/generator job bodies for docs-only
changes, including Rust quality, while retaining their existing check names.
Generated consumer PRs also avoid two browser projects and defer Lighthouse to
push/weekly/manual runs. These are graph-derived counts, not hosted measurements.
Baseline samples were project 6m50s, generator 4m22s and website 5m26s on different
successful runs. No comparable post-change hosted timing or billed-minute evidence
exists, so no measured speedup is claimed. Publish only after approval, then inspect
actual check names, failures/cancellations, artifacts and timings before approving
any protection migration. GitLab requires a separately configured weekly schedule.

## Final review disposition

The standards review found a documentation mismatch: generated consumers use
Chromium on ordinary pushes as well as PRs, with full browsers weekly/manually.
The standard now states that policy without expanding execution.

The spec review found that navigation-only Lighthouse URLs omitted content-detail
performance, SEO, script and size budgets. Lighthouse now discovers one deterministic
nested public HTML route and its listing at invocation time, alongside the homepage. It excludes
CMS/404 output, accepts renamed content and maps nested deployment bases. Unit tests
use temporary build outputs; importing the module before a build performs no I/O.
This retains the original bounded homepage/listing/detail budgets without auditing
every navigation destination or article, or
reintroducing a starter-specific slug.

Review-fix verification passed template static/unused-code/type checks before a build,
38 template tests with full configured coverage, the public template build and
root/nested Lighthouse URL selection against its output. Root 90 and generator
117 tests plus root type checks, formatting and repository lint also pass. The
unchanged 11-scenario packed suite and full Lighthouse benchmark were not repeated.
Independent website core verification passed static checks, 35 tests with full
configured coverage, and its 53-page public build/validation. Hosted evidence and
the previously recorded native/CMS limitations remain unchanged.

## Hosted follow-up at `ffe7351`

[PR 396](https://github.com/rm-industries/forge/pull/396) passed native reproducibility,
packed browsers, CMS serialization, Tool Rust/build/pack/runtime lanes, candidate
frontmatter and consumer browser checks. Consumer Lighthouse failed on the newly
included About page (126,785 bytes against the unchanged 125,000-byte limit);
Generator validation correctly propagated that failure. The original budget sample
covered only homepage, listing and one detail. URL selection now preserves that
bounded scope dynamically, rather than expanding to incidental navigation pages.
Budgets and template styles remain unchanged. Local built-output URL checks cover
root and nested bases; the corrected hosted revision still requires a rerun.

The follow-up fix passed 39 template tests with full configured coverage, static
checks before build, public build and exact root/nested URL selection. A real local
`lighthouse:ci` run passed all unchanged assertions across three URLs and nine
runs. Root 90 tests, root types, formatting and repository lint also passed. The
11-scenario packed suite was not repeated for this bounded URL-selection correction.
