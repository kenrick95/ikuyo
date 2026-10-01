#!/usr/bin/env bash
set -euo pipefail

: "${DEPLOY_HOST:?}" "${DEPLOY_PORT:?}" "${DEPLOY_USER:?}" "${DEPLOY_TARGET:?}"
: "${DEPLOY_HEALTH_URL:?Set the HTTPS URL of /api/trips/public}"
: "${GITHUB_SHA:?}" "${GITHUB_REPOSITORY:?}" "${DEPLOY_SSH_KEY:?}"
ALLOW_MIGRATIONS=${ALLOW_MIGRATIONS:-false}
[[ $ALLOW_MIGRATIONS == true || $ALLOW_MIGRATIONS == false ]]
[[ $DEPLOY_TARGET == /* && $DEPLOY_TARGET != / ]]
[[ $DEPLOY_HEALTH_URL == https://*/api/trips/public ]]

# Quote each argument for the remote login shell; never interpolate raw variables.
remote() {
    local command
    printf -v command '%q ' "$@"
    ssh "${ssh_args[@]}" "$DEPLOY_USER@$DEPLOY_HOST" "$command"
}
backend="$DEPLOY_TARGET/backend"
lock="$DEPLOY_TARGET/.ikuyo-deploy-lock"
locked=false
maintenance=false
key=$(mktemp)
health_response=$(mktemp)
cleanup() {
    local status=$?
    trap - EXIT
    if [[ $status != 0 && $maintenance == true ]]; then
        echo 'Deployment failed. Maintenance remains enabled; rerun manually after inspecting the failure.' >&2
        # If the final HTTP check failed after up, block traffic again.
        remote bash -se -- "$backend" <<'REMOTE' || true
cd "$1"
php artisan down --retry=60
REMOTE
        remote bash -c 'cd "$1" && cat > storage/framework/maintenance.php' bash "$backend" < scripts/deploy/maintenance.php || true
    fi
    if [[ $locked == true ]]; then
        if ! remote rmdir -- "$lock"; then
            echo 'Could not release deployment lock; manual cleanup required.' >&2
            status=1
        fi
    fi
    rm -f "$key" "$health_response"
    exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
printf '%s\n' "$DEPLOY_SSH_KEY" > "$key"
chmod 600 "$key"
unset DEPLOY_SSH_KEY
ssh_args=(-i "$key" -p "$DEPLOY_PORT" -o BatchMode=yes -o ConnectTimeout=20
    -o ServerAliveInterval=15 -o ServerAliveCountMax=3
    -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no)

# One host lock spans the state check, upload, migration, and verification.
remote mkdir -- "$lock"
locked=true
# An older waiting/rerun build must never overwrite a newer main commit.
latest=$(gh api "repos/$GITHUB_REPOSITORY/git/ref/heads/main" --jq '.object.sha')
if [[ $latest != "$GITHUB_SHA" ]]; then
    echo 'Skipping stale build: deploy the latest main workflow instead.'
    exit 0
fi
manifest=$(php scripts/deploy/runner.php manifest)
state=$(remote php /dev/stdin "$backend" "$manifest" < scripts/deploy/state.php)
needs_manual=$(php scripts/deploy/runner.php gate "$state")
if [[ $needs_manual == true && $ALLOW_MIGRATIONS != true ]]; then
    echo 'Production unchanged: pending migrations or an incomplete deployment require a manual run.'
    if [[ -n ${GITHUB_STEP_SUMMARY:-} ]]; then
        {
            echo '### Manual deployment required'
            echo 'Production has not been changed. Run **Testing → Run workflow** on **main**, with **Authorize migrations / recovery** checked.'
            echo 'This authorization covers the complete incoming build, including migrations from earlier merges.'
            php scripts/deploy/runner.php summary "$state"
        } >> "$GITHUB_STEP_SUMMARY"
    fi
    exit 0
fi
if [[ $needs_manual == true ]]; then
    php scripts/deploy/runner.php check-maintenance "$state"
    maintenance=true
    remote bash -se -- "$backend" <<'REMOTE'
cd "$1"
php artisan down --render="errors::503" --retry=60
REMOTE
    remote bash -c 'cd "$1" && cat > storage/framework/maintenance.php' bash "$backend" < scripts/deploy/maintenance.php
    # Conservative drain window; increase to exceed the host's longest request.
    sleep "${DEPLOY_DRAIN_SECONDS:-30}"
fi
remote touch -- "$backend/storage/framework/ikuyo-deploy-incomplete"
# rsync invokes this shell locally, and protects remote paths with --protect-args.
printf -v rsync_shell '%q ' ssh "${ssh_args[@]}"
rsync -avz --protect-args --delay-updates \
    --exclude-from=.gitignore --exclude=/.git/ --exclude=/.github/ \
    --exclude=/backend/.env --exclude=/backend/storage/ \
    --exclude='/backend/bootstrap/cache/*.php' \
    --exclude='/backend/database/*.sqlite*' --exclude=/.ikuyo-deploy-lock/ \
    -e "$rsync_shell" ./dist/ "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_TARGET/"
remote bash -se -- "$backend" <<'REMOTE'
cd "$1"
php artisan optimize:clear
php artisan package:discover --ansi
REMOTE
if [[ $maintenance == true ]]; then
    remote bash -se -- "$backend" <<'REMOTE'
cd "$1"
php artisan migrate --force
REMOTE
fi
remote bash -se -- "$backend" <<'REMOTE'
cd "$1"
php artisan optimize
REMOTE
# Boot the uploaded code and query the DB while still in maintenance.
state=$(remote php /dev/stdin "$backend" "$manifest" < scripts/deploy/state.php)
php scripts/deploy/runner.php verify "$state"
if [[ $maintenance == true ]]; then
    remote bash -se -- "$backend" <<'REMOTE'
cd "$1"
php artisan up
REMOTE
fi
# Test an actual DB-backed API route, not the SPA fallback or Laravel liveness alone.
curl --fail --silent --show-error --max-time 30 -H 'Accept: application/json' \
    --output "$health_response" "$DEPLOY_HEALTH_URL"
php scripts/deploy/runner.php health "$health_response"
remote rm -- "$backend/storage/framework/ikuyo-deploy-incomplete"
echo "Deployed $GITHUB_SHA successfully."
