FROM portainer/portainer-ce@sha256:d27f76194b719bfe2a34779d51798a7adf02510cfba69ebcb538267f75aa4f47 AS portainer
FROM alpine@sha256:28bd5fe8b56d1bd048e5babf5b10710ebe0bae67db86916198a6eec434943f8b
RUN apk add --no-cache curl
COPY --from=portainer /portainer /portainer
# The web UI (/public) and email templates (/mustache-templates) live alongside
# the binary in the official image. Without /public the API works but every UI
# route returns 404. Portainer serves assets from / by default, so keep paths.
COPY --from=portainer /public /public
COPY --from=portainer /mustache-templates /mustache-templates
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
