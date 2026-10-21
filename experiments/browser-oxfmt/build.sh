#!/bin/sh
set -eu
cd "$(dirname "$0")"
revision=2bd08ebe8f36fcf1954a675ffdeb4c6d0129f609
archive_sha=0581446634d6ce5a59947bf87d720a3b85ede4a5e7c831eb02ba82d3223a9584
if [ ! -d source ]; then
  curl --fail --location "https://api.github.com/repos/oxc-project/oxc/tarball/$revision" --output upstream.tar.gz
  printf '%s  upstream.tar.gz\n' "$archive_sha" | shasum -a 256 -c -
  mkdir source
  tar -xzf upstream.tar.gz -C source --strip-components=1
fi
# Run from wrapper to avoid upstream's newer rust-toolchain.toml.
cd wrapper
cargo +1.97.0 build --locked --release --target wasm32-unknown-unknown
cp target/wasm32-unknown-unknown/release/oxfmt_markdown_wasm_spike.wasm ../formatter.wasm
