#!/usr/bin/env bash
# Builds the bundled node's ingest toolchain into toolchain/ (spec §6.1.5,
# §6.2.4 pins): ffmpeg 7.1.1 from FFmpeg's release tarball, configured LGPL
# with only what the tag strip needs, built for arm64 and x86_64 and merged
# with lipo; and chromaprint's universal fpcalc 1.5.1 release binary. Every
# download is pinned by SHA-256. electron-builder ships toolchain/bin and
# toolchain/licenses as Resources/bin and Resources/licenses.
#
# The tag strip (`-i` probe, then `-map 0:a -codec:a copy -bitexact
# -map_metadata -1`) copies streams, so no encoder is built. The containers
# are the app's import set (src/main/import-files.ts AUDIO_EXTENSIONS); the
# decoders and parsers fill in stream parameters while probing, as a full
# build would, so the copy comes out byte-identical to one (checked by
# test/toolchain/compare-ffmpeg.sh).
#
# Usage: cli/build-toolchain.sh   (macOS with Xcode command line tools)
# Writes toolchain/BUILD-INFO.txt with the configure line and output hashes.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/toolchain"
CACHE="$OUT/cache"
WORK="$OUT/work"
# ffmpeg records its configure line, paths included, in the binary, so it
# builds at a fixed path: the same commit gives the same bytes in any checkout
# (with the same Xcode clang, which -version also names). /private/tmp is
# shared, so the root is created fresh, 0700 and ours, and refused if another
# user or a symlink got there first.
BUILD_ROOT=/private/tmp/record-app-ffmpeg-build

FFMPEG_VERSION=7.1.1
FFMPEG_URL="https://ffmpeg.org/releases/ffmpeg-$FFMPEG_VERSION.tar.xz"
FFMPEG_SHA256=733984395e0dbbe5c046abda2dc49a5544e7e0e1e2366bba849222ae9e3a03b1
# FFmpeg's release signing key; the tarball's signature must verify against
# exactly this key, in a throwaway keyring, as well as match the SHA-256.
FFMPEG_KEY_URL=https://ffmpeg.org/ffmpeg-devel.asc
FFMPEG_KEY_FINGERPRINT=FCF986EA15E6E293A5644F10B4322F04D67658D8
FPCALC_VERSION=1.5.1
FPCALC_URL="https://github.com/acoustid/chromaprint/releases/download/v$FPCALC_VERSION/chromaprint-fpcalc-$FPCALC_VERSION-macos-universal.tar.gz"
FPCALC_SHA256=d4d8faff4b5f7c558d9be053da47804f9501eaa6c2f87906a9f040f38d61c860
CHROMAPRINT_SOURCE_URL="https://github.com/acoustid/chromaprint/releases/download/v$FPCALC_VERSION/chromaprint-$FPCALC_VERSION.tar.gz"
CHROMAPRINT_SOURCE_SHA256=a1aad8fa3b8b18b78d3755b3767faff9abb67242e01b478ec9a64e190f335e1c
MACOS_MIN=12.0

DEMUXERS=mp3,mov,aac,flac,ogg,wav,aiff,asf,matroska
MUXERS=mp3,ipod,mp4,adts,flac,ogg,oga,opus,wav,aiff,asf,webm,pcm_s16le
PARSERS=mpegaudio,aac,flac,vorbis,opus
DECODERS=mp3,mp3float,aac,aac_fixed,alac,flac,vorbis,opus,wmav1,wmav2,pcm_s16le,pcm_s16be,pcm_s24le,pcm_s24be,pcm_s32le,pcm_s32be,pcm_f32le,pcm_f32be,pcm_f64le,pcm_f64be,pcm_u8,pcm_s8
BSFS=aac_adtstoasc
# record-node decodes every file to mono 16-bit PCM on a pipe to measure its
# duration (-ac 1 -c:a pcm_s16le -f s16le), which needs the encoder, the raw
# muxer, and the filters ffmpeg inserts to downmix and convert.
ENCODERS=pcm_s16le
FILTERS=aresample,aformat,anull

# Reproducible across checkouts: no build path reaches the binary.
CONFIGURE_FLAGS=(
  --disable-gpl --disable-nonfree --disable-version3
  --disable-autodetect --disable-network --disable-doc --disable-debug
  --disable-shared --enable-static --disable-everything
  --disable-avdevice --disable-swscale --disable-postproc
  --disable-ffplay --disable-ffprobe
  --enable-protocol=file,pipe
  --enable-demuxer="$DEMUXERS" --enable-muxer="$MUXERS" --enable-parser="$PARSERS"
  --enable-decoder="$DECODERS" --enable-bsf="$BSFS"
  --enable-encoder="$ENCODERS" --enable-filter="$FILTERS"
)

fetch() {
  local url="$1" sha="$2" file="$CACHE/$(basename "$1")"
  if [ ! -f "$file" ] || ! echo "$sha  $file" | shasum -a 256 -c - > /dev/null 2>&1; then
    curl -fsSL "$url" -o "$file.part"
    mv "$file.part" "$file"
  fi
  echo "$sha  $file" | shasum -a 256 -c - > /dev/null || { echo "SHA-256 mismatch: $file" >&2; exit 1; }
}

# Refuses a pre-existing root that is a symlink, not a directory, not ours, or
# not 0700; then recreates it. mkdir without -p fails if anyone recreates it
# in between, and /private/tmp's sticky bit keeps others from removing ours.
fresh_private_dir() {
  local dir="$1"
  if [ -L "$dir" ]; then echo "Refusing $dir: it is a symlink" >&2; exit 1; fi
  if [ -e "$dir" ]; then
    if [ ! -d "$dir" ] || [ "$(stat -f %u "$dir")" != "$(id -u)" ] || [ "$(stat -f %Lp "$dir")" != 700 ]; then
      echo "Refusing $dir: it exists and is not a 0700 directory owned by $(id -un)" >&2
      exit 1
    fi
    rm -rf "$dir"
  fi
  mkdir -m 700 "$dir"
  if [ -L "$dir" ] || [ "$(stat -f %u "$dir")" != "$(id -u)" ] || [ "$(stat -f %Lp "$dir")" != 700 ]; then
    echo "Refusing $dir: it changed while being created" >&2
    exit 1
  fi
}

# Fails closed: no gpg, a key with another fingerprint, or any signature but
# a good one from that key stops the build.
verify_ffmpeg_signature() {
  command -v gpg > /dev/null || { echo "gpg is required to verify the FFmpeg tarball" >&2; exit 1; }
  local keyring
  keyring="$(mktemp -d)"
  chmod 700 "$keyring"
  curl -fsSL "$FFMPEG_KEY_URL" -o "$keyring/key.asc"
  curl -fsSL "$FFMPEG_URL.asc" -o "$keyring/tarball.asc"
  gpg --homedir "$keyring" --batch --quiet --import "$keyring/key.asc" 2> /dev/null
  local imported
  imported="$(gpg --homedir "$keyring" --batch --with-colons --fingerprint 2> /dev/null | awk -F: '$1 == "fpr" { print $10 }')"
  if ! grep -qx "$FFMPEG_KEY_FINGERPRINT" <<< "$imported"; then
    rm -rf "$keyring"
    echo "The FFmpeg signing key does not have the pinned fingerprint" >&2
    exit 1
  fi
  local status
  status="$(gpg --homedir "$keyring" --batch --status-fd 1 --verify "$keyring/tarball.asc" "$CACHE/ffmpeg-$FFMPEG_VERSION.tar.xz" 2> /dev/null || true)"
  rm -rf "$keyring"
  if ! grep -q "^\[GNUPG:\] VALIDSIG .* $FFMPEG_KEY_FINGERPRINT\$" <<< "$status"; then
    echo "The FFmpeg tarball's signature does not verify against $FFMPEG_KEY_FINGERPRINT" >&2
    exit 1
  fi
}

build_ffmpeg() {
  local arch="$1"
  local dir="$BUILD_ROOT/ffmpeg-$arch"
  # One array, never an empty one: macOS's /bin/bash 3.2 treats "${empty[@]}"
  # as unbound under set -u.
  local flags=("${CONFIGURE_FLAGS[@]}")
  [ "$arch" = "$(uname -m)" ] || flags+=(--enable-cross-compile)
  rm -rf "$dir"
  mkdir -p "$dir"
  tar -xJf "$CACHE/ffmpeg-$FFMPEG_VERSION.tar.xz" -C "$dir" --strip-components 1
  (
    cd "$dir"
    ./configure "${flags[@]}" --arch="$arch" --target-os=darwin \
      --cc="clang -arch $arch" \
      --extra-cflags="-mmacosx-version-min=$MACOS_MIN -ffile-prefix-map=$dir=ffmpeg-$FFMPEG_VERSION" \
      --extra-ldflags="-mmacosx-version-min=$MACOS_MIN" \
      $([ "$arch" = x86_64 ] && echo --disable-x86asm) > "$WORK/configure-$arch.log"
    make -j"$(sysctl -n hw.ncpu)" ffmpeg > "$WORK/make-$arch.log" 2>&1
    strip -S ffmpeg
  )
}

mkdir -p "$CACHE" "$WORK" "$OUT/bin" "$OUT/licenses"
fresh_private_dir "$BUILD_ROOT"
fetch "$FFMPEG_URL" "$FFMPEG_SHA256"
verify_ffmpeg_signature
fetch "$FPCALC_URL" "$FPCALC_SHA256"
fetch "$CHROMAPRINT_SOURCE_URL" "$CHROMAPRINT_SOURCE_SHA256"

build_ffmpeg arm64
build_ffmpeg x86_64
lipo -create "$BUILD_ROOT/ffmpeg-arm64/ffmpeg" "$BUILD_ROOT/ffmpeg-x86_64/ffmpeg" -output "$OUT/bin/ffmpeg"
codesign --force --sign - "$OUT/bin/ffmpeg"

tar -xzf "$CACHE/chromaprint-fpcalc-$FPCALC_VERSION-macos-universal.tar.gz" -C "$WORK"
cp "$WORK/chromaprint-fpcalc-$FPCALC_VERSION-macos-universal/fpcalc" "$OUT/bin/fpcalc"

cp "$BUILD_ROOT/ffmpeg-arm64/COPYING.LGPLv2.1" "$OUT/licenses/FFmpeg-COPYING.LGPLv2.1"
cp "$BUILD_ROOT/ffmpeg-arm64/LICENSE.md" "$OUT/licenses/FFmpeg-LICENSE.md"
tar -xzf "$CACHE/chromaprint-$FPCALC_VERSION.tar.gz" -C "$WORK" "chromaprint-$FPCALC_VERSION/LICENSE.md"
cp "$WORK/chromaprint-$FPCALC_VERSION/LICENSE.md" "$OUT/licenses/Chromaprint-LICENSE.md"
cp "$ROOT/resources/TOOLCHAIN-NOTICE.md" "$OUT/licenses/TOOLCHAIN-NOTICE.md"

# The pins the bundled node checks.
"$OUT/bin/ffmpeg" -version | head -1 | grep -q "^ffmpeg version $FFMPEG_VERSION " || { echo "ffmpeg reports the wrong version" >&2; exit 1; }
"$OUT/bin/fpcalc" -version | grep -q "^fpcalc version $FPCALC_VERSION " || { echo "fpcalc reports the wrong version" >&2; exit 1; }

{
  echo "ffmpeg $FFMPEG_VERSION: $FFMPEG_URL"
  echo "  source sha256 $FFMPEG_SHA256, signature verified against $FFMPEG_KEY_FINGERPRINT"
  echo "  configure (each arch adds --arch, --target-os=darwin, --cc='clang -arch <arch>', and -mmacosx-version-min=$MACOS_MIN; x86_64 adds --enable-cross-compile on arm64 hosts and --disable-x86asm):"
  echo "    ${CONFIGURE_FLAGS[*]}"
  echo "  $("$OUT/bin/ffmpeg" -version | sed -n 2p)"
  echo "fpcalc $FPCALC_VERSION: $FPCALC_URL"
  echo "  archive sha256 $FPCALC_SHA256"
  echo "chromaprint source: $CHROMAPRINT_SOURCE_URL"
  echo "  sha256 $CHROMAPRINT_SOURCE_SHA256"
  echo "outputs:"
  (cd "$OUT" && shasum -a 256 bin/ffmpeg bin/fpcalc | sed 's/^/  /')
  for arch in arm64 x86_64; do
    echo "  ffmpeg $arch slice: $(shasum -a 256 "$BUILD_ROOT/ffmpeg-$arch/ffmpeg" | cut -d' ' -f1)"
  done
} > "$OUT/BUILD-INFO.txt"
cat "$OUT/BUILD-INFO.txt"
