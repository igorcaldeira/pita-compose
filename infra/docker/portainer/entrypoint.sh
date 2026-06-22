#!/bin/sh
echo "$PORTAINER_ADMIN_PASSWORD" > /tmp/portainer_password
exec /portainer --admin-password-file /tmp/portainer_password
