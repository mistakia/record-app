#!/usr/bin/env bash
# Checks that the bundled minimal ffmpeg (toolchain/bin/ffmpeg, from
# cli/build-toolchain.sh) tag-strips every container the app imports to the
# same bytes as a default-configured ffmpeg 7.1.1 built from the same
# tarball, on both slices (x86_64 under Rosetta). The stripped bytes are what record-node hashes into the content
# CID, so a difference would split one recording into two tracks across
# nodes. Builds the reference once into /private/tmp; makes the samples with
# the system ffmpeg (any version with the common encoders).
#
# Usage: test/toolchain/compare-ffmpeg.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MINIMAL="$ROOT/toolchain/bin/ffmpeg"
REFERENCE_DIR=/private/tmp/record-app-ffmpeg-reference
REFERENCE="$REFERENCE_DIR/ffmpeg"
SAMPLES="$(mktemp -d)"
trap 'rm -rf "$SAMPLES"' EXIT

# The reference build is reused across runs, so it must be ours: a 0700
# directory, not a symlink, owned by this user (/private/tmp is shared).
if [ -L "$REFERENCE_DIR" ] || { [ -e "$REFERENCE_DIR" ] && { [ ! -d "$REFERENCE_DIR" ] || [ "$(stat -f %u "$REFERENCE_DIR")" != "$(id -u)" ] || [ "$(stat -f %Lp "$REFERENCE_DIR")" != 700 ]; }; }; then
  echo "Refusing $REFERENCE_DIR: it is not a 0700 directory owned by $(id -un); remove it if it is yours" >&2
  exit 1
fi
if [ ! -x "$REFERENCE" ]; then
  [ -d "$REFERENCE_DIR" ] || mkdir -m 700 "$REFERENCE_DIR"
  tar -xJf "$ROOT/toolchain/cache/ffmpeg-7.1.1.tar.xz" -C "$REFERENCE_DIR" --strip-components 1
  (cd "$REFERENCE_DIR" && ./configure --disable-autodetect --disable-network --disable-doc > /dev/null && make -j"$(sysctl -n hw.ncpu)" ffmpeg > /dev/null 2>&1)
fi

# The tag strip record-node runs (dist/ingest/tag-strip.js STRIP_ARGS).
STRIP=(-map 0:a -codec:a copy -bitexact -map_metadata -1)
TAGS=(-metadata title=Sample -metadata artist=Someone -metadata album=Somewhere)
SOURCE=(-f lavfi -i "anoisesrc=d=4:c=pink:seed=3:a=0.3")
COVER=(-f lavfi -i "color=c=red:s=64x64:d=1")

make_sample() {
  local name="$1"; shift
  ffmpeg -v error -y "$@" "$SAMPLES/$name"
}
make_sample a.mp3 "${SOURCE[@]}" "${COVER[@]}" -map 0:a -map 1:v -frames:v 1 -c:a libmp3lame -c:v mjpeg -disposition:v attached_pic "${TAGS[@]}"
make_sample b.m4a "${SOURCE[@]}" "${COVER[@]}" -map 0:a -map 1:v -frames:v 1 -c:a aac -c:v mjpeg -disposition:v attached_pic "${TAGS[@]}"
make_sample c.m4a "${SOURCE[@]}" -c:a alac "${TAGS[@]}"
make_sample d.aac "${SOURCE[@]}" -c:a aac
make_sample e.flac "${SOURCE[@]}" "${COVER[@]}" -map 0:a -map 1:v -frames:v 1 -c:v mjpeg -disposition:v attached_pic "${TAGS[@]}"
make_sample f.ogg "${SOURCE[@]}" -c:a vorbis -strict experimental -ac 2 "${TAGS[@]}"
make_sample g.oga "${SOURCE[@]}" -c:a flac "${TAGS[@]}"
make_sample h.opus "${SOURCE[@]}" -c:a libopus "${TAGS[@]}"
make_sample i.wav "${SOURCE[@]}" "${TAGS[@]}"
make_sample j.aiff "${SOURCE[@]}" "${TAGS[@]}"
make_sample k.aif "${SOURCE[@]}" -c:a pcm_s24be "${TAGS[@]}"
make_sample l.wma "${SOURCE[@]}" -c:a wmav2 "${TAGS[@]}"
make_sample m.webm "${SOURCE[@]}" -c:a libopus "${TAGS[@]}"
make_sample n.mp4 "${SOURCE[@]}" "${COVER[@]}" -map 0:a -map 1:v -c:a aac -c:v mpeg4 -t 1 "${TAGS[@]}"

failures=0
for input in "$SAMPLES"/*.*; do
  name="$(basename "$input")"
  extension="${name##*.}"
  "$REFERENCE" -hide_banner -nostdin -loglevel error -y -i "$input" "${STRIP[@]}" "$SAMPLES/ref-$name.$extension"
  if ! "$MINIMAL" -hide_banner -nostdin -loglevel error -y -i "$input" "${STRIP[@]}" "$SAMPLES/min-$name.$extension"; then
    echo "FAIL $name: the minimal build could not strip it"
    failures=$((failures + 1))
    continue
  fi
  reference_hash="$(shasum -a 256 < "$SAMPLES/ref-$name.$extension" | cut -d' ' -f1)"
  minimal_hash="$(shasum -a 256 < "$SAMPLES/min-$name.$extension" | cut -d' ' -f1)"
  arch -x86_64 "$MINIMAL" -hide_banner -nostdin -loglevel error -y -i "$input" "${STRIP[@]}" "$SAMPLES/x64-$name.$extension"
  intel_hash="$(shasum -a 256 < "$SAMPLES/x64-$name.$extension" | cut -d' ' -f1)"
  probe="$("$MINIMAL" -hide_banner -nostdin -i "$SAMPLES/min-$name.$extension" 2>&1 | grep -cE '^\s*Stream #' || true)"
  if [ "$reference_hash" = "$minimal_hash" ] && [ "$intel_hash" = "$minimal_hash" ]; then
    echo "same  $name  ${minimal_hash:0:16}  streams=$probe"
  else
    echo "FAIL  $name  reference ${reference_hash:0:16} minimal ${minimal_hash:0:16} minimal x86_64 ${intel_hash:0:16}"
    failures=$((failures + 1))
  fi
done
[ "$failures" -eq 0 ] && echo "all containers strip identically" || { echo "$failures container(s) differ"; exit 1; }
