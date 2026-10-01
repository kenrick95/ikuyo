# Deployment hosting constraints

- Ikuyo runs on shared hosting with PHP 8.4 and limited disk space.
- Python is **not installed on the shared host**. Use PHP for migration and
  deployment data processing; do not add Python commands to host-side scripts.
- Keep the current single-copy rsync deployment. Do not introduce retained release
  artifact copies on the host without an explicit request.
- Short maintenance windows for database migrations are acceptable. Preserve the
  automatic deployment path for builds with no pending migrations, and the manual
  authorization gate for migrations and incomplete-deployment recovery.
- Python regression tests may run on GitHub Actions runners; they are not a
  production hosting requirement.
