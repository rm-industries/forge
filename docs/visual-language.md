# Forge visual language

Forge belongs to the RM Industries family while retaining its own product
identity. It shares Catppuccin colors, Fira typography, accessible interaction
rules, and DaisyUI primitives with the company website. Its imagery tells a
different story: content moving through a focused pipeline into an owned,
production-ready website.

This document applies the
[RM Industries visual language](https://github.com/rm-industries/rm-industries.github.io/blob/main/docs/visual-language.md)
to Forge-specific artwork.

## Identity and motif

- The anvil and sparks in `docs/assets/forge-logo.svg` are the canonical Forge
  mark. They represent durable generated source and the focused act of shaping
  it.
- Forge illustrations use a three-stage content pipeline: define the content,
  generate the website, and own every file.
- Directional lines, numbered stages, typed labels, and progressively finished
  surfaces can reinforce that sequence. Do not reuse the company site's
  friction-to-tool path or Etch's terminal and environment-composition imagery.
- Sparks may accent a transformation point but must not become generic
  decoration across every surface.

## Logo and favicon

- Preserve the complete `160 × 160` view box as clear space. Do not crop the
  anvil or sparks, redraw their geometry, or place the mark inside an opaque
  padded square.
- Keep the mark transparent on navigation, footer, favicon, and neutral project
  surfaces.
- Use the Latte text color for the anvil in light mode, the Mocha text color in
  dark mode, and Lavender for sparks in both modes.
- Render the mark square and at least `32 × 32` CSS pixels in navigation. The
  current header and footer size is `40 × 40`.
- `website/public/favicon.svg` must retain the canonical paths and view box.

## Interface graphics

- Use DaisyUI cards, mockups, badges, buttons, and semantic color tokens when a
  graphic represents an interface. Tailwind utilities may arrange those
  primitives.
- Reserve custom SVG or CSS illustration for Forge-specific pipeline
  storytelling that DaisyUI cannot express.
- Use Fira Sans for prose and interface labels. Use Fira Code for commands,
  stage numbers, metadata, and technical labels.
- Use semantic theme tokens in HTML and CSS. Hard-coded Catppuccin colors are
  limited to static assets that cannot consume the active theme.

## Social graphics

- Social cards use the Mocha palette because crawlers do not expose a visitor's
  theme preference.
- Keep the `1200 × 630` canvas, canonical Forge mark, Fira typography, and the
  three-stage content pipeline visible at preview size.
- Social graphics are intentionally opaque designed surfaces; the standalone
  logo and favicon remain transparent.

## Accessibility and responsive use

- Decorative graphics use `aria-hidden="true"` or an empty alternative when
  adjacent text communicates the same information.
- Informative standalone marks use a concise Forge alternative or accessible
  name.
- Never encode pipeline order or required meaning through color alone. Retain
  numbers and text labels.
- Verify logo loading, aspect ratio, narrow-width overflow, all supported
  Catppuccin themes, reduced motion, and the intrinsic favicon and social-card
  dimensions in automated checks.
