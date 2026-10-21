# Changelog

## 0.1.0

- Derive serializable browser policy at build time from the installed Oxfmt
  configuration and EditorConfig, with explicit unsupported-policy diagnostics.

- Add asynchronous native Oxfmt 0.72.0 Markdown formatting in a reusable browser
  worker with precompiled WASM, typed options, and structured errors.
- Support native YAML, JavaScript, TypeScript, CSS, and nested Markdown embeds.
- Preserve Tailwind class order under the documented maintainer-approved
  exception; browser and repository sorting are not identical.
