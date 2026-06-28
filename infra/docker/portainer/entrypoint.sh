#!/bin/sh
set -e

if [ -z "$PORTAINER_ADMIN_PASSWORD" ]; then
  echo "ERROR: PORTAINER_ADMIN_PASSWORD is not set." >&2
  exit 1
fi

# Portainer enforces a minimum admin password length of 12 characters. Fail loud
# instead of silently falling back to the manual onboarding screen.
if [ "$(printf '%s' "$PORTAINER_ADMIN_PASSWORD" | wc -c)" -lt 12 ]; then
  echo "ERROR: PORTAINER_ADMIN_PASSWORD must be at least 12 characters." >&2
  exit 1
fi

PW_FILE=/tmp/portainer_password
printf '%s' "$PORTAINER_ADMIN_PASSWORD" > "$PW_FILE"   # no trailing newline
chmod 600 "$PW_FILE"

# On a fresh database this creates the 'admin' user with the password above
# (once an admin exists, Portainer keeps it and ignores the flag), and -H
# auto-connects the local Docker socket as the default environment so the
# post-login "connect an environment" wizard is skipped entirely.
exec /portainer \
  --admin-password-file "$PW_FILE" \
  -H unix:///var/run/docker.sock
