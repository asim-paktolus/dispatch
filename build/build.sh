#!/usr/bin/env sh
set -eu

target="${1:-}"
if [ "$target" != "scorm12" ] && [ "$target" != "scorm2004" ]; then
  echo "Usage: ./build.sh scorm12|scorm2004" >&2
  exit 1
fi

here="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
root="$(CDPATH= cd -- "$here/.." && pwd)"
out="$root/dist"
mkdir -p "$out"

staging="$out/staging-$target"
rm -rf "$staging"
mkdir -p "$staging/js"

cp -R "$root/js/" "$staging/"
cp "$root/index.html" "$staging/index.html"

if [ "$target" = "scorm12" ]; then
  cp "$root/manifests/imsmanifest.scorm12.xml" "$staging/imsmanifest.xml"
  zipname="scorm-dispatch-unified-scorm12.zip"
else
  cp "$root/manifests/imsmanifest.scorm2004.xml" "$staging/imsmanifest.xml"
  zipname="scorm-dispatch-unified-scorm2004.zip"
fi

cd "$staging"
zip -r "$out/$zipname" .
echo "Built: $out/$zipname"
