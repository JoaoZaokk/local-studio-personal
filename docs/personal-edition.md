# Personal edition

This repository is an independent, public edition of
[Local Studio](https://github.com/sybil-solutions/local-studio) maintained by
[JoaoZaokk](https://github.com/JoaoZaokk).

## Purpose

- Build a reliable Local Studio installation for the maintainer's real Windows
  11 and NVIDIA systems.
- Keep Windows, macOS, Linux, native, WSL2, and remote-controller capabilities
  explicit instead of presenting experimental paths as equivalent.
- Make incremental improvements that other users and contributors can inspect,
  test, reuse, or propose upstream when appropriate.
- Preserve the existing Local Studio product identity, acknowledgements, and
  Apache-2.0 licensing.

This edition is not a rewrite and does not use upstream mergeability as its
product boundary. A useful personal or community improvement can remain here
even when it is too specialized or moves at a different pace from upstream.

## Relationship to upstream

The GitHub repository is standalone rather than a GitHub fork. The local clone
keeps the following remotes:

- `origin`: this personal edition;
- `upstream`: `sybil-solutions/local-studio` for comparison and selective
  synchronization;
- `port-fork`: the earlier contribution fork and Windows port PR history.

Changes from upstream are reviewed and incorporated selectively. Upstream
macOS and Linux behavior remains valuable reference behavior, but this edition
can retain additional tests, Windows adapters, WSL2 lifecycle controls, and
personal workflow improvements independently.

## Development policy

- Keep changes small and commit independently testable milestones.
- Fix confirmed failures before adding more inference engines.
- Run existing tests and add focused regression tests for changed behavior.
- Never stop or terminate an entire WSL2 environment to manage one Local Studio
  engine.
- Do not publish releases, installers, or packages until their exact artifacts
  have passed the relevant platform acceptance checks.
- Preserve credentials, licensing, attribution, and existing platform-specific
  implementations.

## Upstream base

This edition tracks the upstream `dev` lineage, frozen at the 2026-08-19 state, and
treats upstream `main` as a source of optional cherry-picks rather than a merge target.

The decision is forced by what upstream did on 2026-08-25. PR #443 ("registry-backed
recipes, docker-only engine roster, unified passthrough proxy") deleted
`controller/src/modules/compute/launchers/process.ts`,
`controller/src/modules/compute/launchers/wsl2.ts`,
`controller/src/core/process-platform.ts`, `controller/src/modules/compute/wsl-platform.ts`
and `controller/src/modules/compute/engines/llamacpp.ts`, dropped `wsl2` from
`RuntimeKind`, and reduced `EngineRuntimeKind` to a single member:

    export type EngineRuntimeKind = "docker";

That is not code that was removed and could be restored. It is the removal of the
polymorphism the native and WSL2 launch paths are expressed in. Rebasing this edition on
`main` would mean reintroducing a runtime dimension upstream deliberately collapsed, and
then defending it against a branch that has decided it is not wanted. Upstream `dev` is
the last upstream state in which this edition's premise is a first-class citizen.

The cost is named rather than hidden. Staying on the `dev` lineage gives up, for now,
everything upstream landed after 2026-08-19: transcript subagents and the live status
panel (#442), the unified passthrough proxy and registry-backed recipes (#443), the
Responses and Anthropic passthrough (#428), first-party plugins and agent-run automations
(#427), click-to-connect OAuth (#432), and the packaged-size reductions (#425). None of
those are why this edition exists, and each remains available as an individual
cherry-pick if it later earns the cost of carrying it.

Contributions back to upstream are unaffected and follow the opposite rule: they target
`main`, and they carry only the portable pieces -- automation, packaging, CI -- never the
native process, WSL2, or llama.cpp stacks, which have no home there any more.
## Current status

The initial snapshot is based on the conservative Windows port branch. It is a
development build, not a supported release. The known blockers and milestone
plan remain documented in [Windows port audit](windows-port-audit.md),
[Windows port plan](windows-port-plan.md), and
[Windows support](windows-support.md).
