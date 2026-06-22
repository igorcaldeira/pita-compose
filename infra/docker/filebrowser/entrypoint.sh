#!/bin/sh
set -e

if [ ! -f /database/filebrowser.db ] && [ -n "$FB_PASSWORD" ]; then
  HASH=$(filebrowser hash "$FB_PASSWORD")
  set -- --password="$HASH" --username="${FB_USERNAME:-admin}" "$@"
fi

exec tini -- /init.sh "$@"
