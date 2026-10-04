# Bundled ingest tools

Record runs two command-line programs to import audio files: `ffmpeg` and `fpcalc`. They are separate executables in `Record.app/Contents/Resources/bin`. Record starts them as their own processes and does not link them into itself.

## ffmpeg 7.1.1

This software uses code of [FFmpeg](https://ffmpeg.org), licensed under the [GNU Lesser General Public License (LGPL) version 2.1 or later](FFmpeg-COPYING.LGPLv2.1). FFmpeg is a trademark of Fabrice Bellard, originator of the FFmpeg project.

- The binary was built from the unmodified release tarball <https://ffmpeg.org/releases/ffmpeg-7.1.1.tar.xz> (SHA-256 `733984395e0dbbe5c046abda2dc49a5544e7e0e1e2366bba849222ae9e3a03b1`, signed by FFmpeg's release key `FCF9 86EA 15E6 E293 A564 4F10 B432 2F04 D676 58D8`, which the build verifies).
- It was configured with `--disable-gpl --disable-nonfree --disable-version3`, so no GPL or non-free component is included.
- The complete configure line is in `cli/build-toolchain.sh` in the Record app repository, at the commit this release was built from. `ffmpeg -buildconf` also prints it.

## fpcalc 1.5.1 (Chromaprint)

`fpcalc` is the unmodified universal release binary of [Chromaprint](https://acoustid.org/chromaprint) 1.5.1, <https://github.com/acoustid/chromaprint/releases/download/v1.5.1/chromaprint-fpcalc-1.5.1-macos-universal.tar.gz> (SHA-256 `d4d8faff4b5f7c558d9be053da47804f9501eaa6c2f87906a9f040f38d61c860`).

- Chromaprint's own code is under the MIT license.
- The binary statically includes FFmpeg 4.4.1's libavcodec, libavformat, libavutil, and libswresample, under the LGPL 2.1 or later. As a whole it is therefore under the LGPL 2.1. See [Chromaprint-LICENSE.md](Chromaprint-LICENSE.md).
- Chromaprint source: <https://github.com/acoustid/chromaprint/releases/download/v1.5.1/chromaprint-1.5.1.tar.gz> (SHA-256 `a1aad8fa3b8b18b78d3755b3767faff9abb67242e01b478ec9a64e190f335e1c`). Its release build script, `package/build.sh`, links FFmpeg 4.4.1 as built by `acoustid/ffmpeg-build` at tag `v4.4.1-1` (commit `f5a226a77e8dd24fa5546ded2f60330a4f3af62b`). That repository's `common.sh` and `build-macos.sh` hold the FFmpeg configure line.
- FFmpeg 4.4.1 source: <https://ffmpeg.org/releases/ffmpeg-4.4.1.tar.xz> (SHA-256 `eadbad9e9ab30b25f5520fbfde99fae4a92a1ae3c0257a8d68569a4651e30e02`, signed by FFmpeg's release key `FCF9 86EA 15E6 E293 A564 4F10 B432 2F04 D676 58D8`). `ffmpeg-build` downloads the same release as `ffmpeg-4.4.1.tar.bz2`.

## Source offer

You can get the complete corresponding source code of both programs from the links above. For three years after we distribute this version of Record, we will also provide a copy on request. It costs no more than the cost of physically performing the distribution. Ask at: [source-offer contact, named before release].

You may replace either program with your own build of the same version, for example to change it, by putting it in place of the file in `Resources/bin`. Record's ingest accepts only these exact versions.

## Maintainer notes

These notes are for whoever builds Record. They are not part of the notice above.

- The source-offer contact is a placeholder until the release owner names an address. Remove this note then; `cli/check-release-gate.ts` refuses a release while either remains.
- Follow-up: build fpcalc 1.5.1 from source against our own LGPL FFmpeg 4.4.1 in `cli/build-toolchain.sh`, as is already done for ffmpeg 7.1.1. The universal release binary is used until then.
