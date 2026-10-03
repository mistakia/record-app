# Bundled ingest tools

Record runs two command-line programs to import audio files: `ffmpeg` and `fpcalc`. They are separate executables in `Record.app/Contents/Resources/bin`. Record starts them as their own processes and does not link them into itself.

## ffmpeg 7.1.1

This software uses code of [FFmpeg](https://ffmpeg.org), licensed under the [GNU Lesser General Public License (LGPL) version 2.1 or later](FFmpeg-COPYING.LGPLv2.1). FFmpeg is a trademark of Fabrice Bellard, originator of the FFmpeg project.

- The binary was built from the unmodified release tarball <https://ffmpeg.org/releases/ffmpeg-7.1.1.tar.xz> (SHA-256 `733984395e0dbbe5c046abda2dc49a5544e7e0e1e2366bba849222ae9e3a03b1`).
- It was configured with `--disable-gpl --disable-nonfree --disable-version3`, so no GPL or non-free component is included.
- The complete configure line is in `cli/build-toolchain.sh` in the Record app repository, at the commit this release was built from. `ffmpeg -buildconf` also prints it.

## fpcalc 1.5.1 (Chromaprint)

`fpcalc` is the unmodified universal release binary of [Chromaprint](https://acoustid.org/chromaprint) 1.5.1, <https://github.com/acoustid/chromaprint/releases/download/v1.5.1/chromaprint-fpcalc-1.5.1-macos-universal.tar.gz>.

- Chromaprint's own code is under the MIT license.
- The binary includes parts of FFmpeg 4.4 under the LGPL 2.1 or later, so as a whole it is under the LGPL 2.1. See [Chromaprint-LICENSE.md](Chromaprint-LICENSE.md).
- Its source is <https://github.com/acoustid/chromaprint/releases/download/v1.5.1/chromaprint-1.5.1.tar.gz>. The FFmpeg 4.4 source it builds against is at <https://ffmpeg.org/releases/>.

## Source offer

You can get the complete corresponding source code of both programs from the links above. For three years after we distribute this version of Record, we will also provide a copy on request. It costs no more than the cost of physically performing the distribution. Ask through the Record app repository's maintainers.

You may replace either program with your own build of the same version, for example to change it, by putting it in place of the file in `Resources/bin`. Record's ingest accepts only these exact versions.
