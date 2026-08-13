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

## Current status

The initial snapshot is based on the conservative Windows port branch. It is a
development build, not a supported release. The known blockers and milestone
plan remain documented in [Windows port audit](windows-port-audit.md),
[Windows port plan](windows-port-plan.md), and
[Windows support](windows-support.md).
