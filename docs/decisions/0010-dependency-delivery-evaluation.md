# 0010: Adopt fresh dependency delivery in create-forge 2.0

- Status: Accepted
- Date: 2026-10-25
- Roadmap: [411](https://github.com/rm-industries/forge/issues/411)

## Context

The earlier proposed non-adoption conclusion is superseded by the approved
[delivery design](../superpowers/specs/2026-10-25-create-forge-fresh-dependency-delivery-design.md).
The [combined experiment](../reviews/projen-lockless-combined.md) remains historical
evidence, with its original limitations; it is not final 2.0 acceptance.

## Decision

Version template source, ranges and pins with the generator, while resolving new
projects' dependencies freshly through npm. Omit the delivered template lock;
retain root and website locks. Following the 2026-10-26 maintainer decision, the
template authoring lock and its refresh automation are removed. Normal creation
must install and validate a consumer lock before Git initialization or success. Ordinary no-install
output requires `npm install` before `npm ci`; Cloudflare retains its networked
lockfile-only preflight. Consumer CI continues to replay its own committed lock.

Use bounded model/CMS and browser/CLI formatter ranges with tested package-owned
peer compatibility. npm peer resolution can fail without backtracking to an older
compatible package; do not hide failure or claim all permitted combinations work.
A formatter package owns its exact engine/options/assets contract even when the
consumer permits compatible package updates. Preserve ADR 0003 installation
isolation and ADR 0004 path safety, collision checks and rollback.

Compatible resolutions inside unchanged ranges need no generator commit,
changelog release intent or automatic publication. Dependabot npm updates for the
lockless template are disabled; fresh-install CI and monitoring cover its graph.
Source, range, pin, runtime and compatibility changes still require release review.
Removing the ordinary no-install lock and raising Node 22 to 22.23.4 require 2.0.0.
Independent unchanged library release contracts keep their existing engines.

## Operating responsibilities

Test the actual packed candidate in isolated consumers. Daily and weekly checks
resolve and verify the published stable artifact once, becoming active at the
first 2.0 publication. Rahul owns failure triage; native failure notification
channel delivery is verified, while the first active scheduled result remains a
post-publication handoff. See [monitoring](../fresh-consumer-monitoring.md).
GitLab remains a backup source with local generated CI contracts, without a new
hosted acceptance gate or schedule.

Correct a confirmed upstream incompatibility through a reviewed generator release,
including a temporary known-working pin when necessary. Old generators retain
old metadata; existing sites choose their own updates. No automatic publication,
dist-tag changes or consumer rewrites follow. A reviewed bundled-lock release is
the rollback option; retain and test the known locked release as evidence.

Required audits remain blocking. Previous waivers do not carry forward and no
global allowlist or threshold is relaxed. Acceptance of this architecture does
not authorize publication: the [2.0 readiness report](../reviews/create-forge-2.0-readiness.md)
records evidence and remaining gates.

## Consequences

New sites can receive compatible dependencies without a source-only generator
release. Their first installation depends on registry availability and permitted
upstream behavior. Subsequent installs replay their own lock; maintenance,
monitoring and corrective releases remain necessary. Existing source is never
upgraded by rerunning the generator. No new authoring or CI framework is introduced.
