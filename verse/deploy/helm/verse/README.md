# Verse Helm chart

Deploys Verse to Kubernetes: the web client (nginx), the server (Spring Boot), an optional in-cluster PostgreSQL,
a nightly backup job and an ingress with TLS.

| Rendered | Notes |
|---|---|
| Secrets `<release>-verse-db`, `<release>-verse-app` | Database password; token secret and bootstrap admin. Generated on first install, kept on upgrades (`lookup`). |
| StatefulSet + Service `<release>-verse-postgres` | Only with `postgres.enabled=true`. Volume `data-<release>-verse-postgres-0`. |
| Deployment + Service `<release>-verse-server` | Port 8080. Waits for the database; Flyway migrates the schema at start. |
| Deployment + Service `<release>-verse-frontend` | Port 80 → nginx 8020, forwards `/api` to the server. |
| Ingress `<release>-verse` | Host from `publicUrl`, TLS secret `<release>-verse-tls` unless `ingress.tlsSecretName` is set. |
| CronJob + PVC `<release>-verse-backup(s)` | Only with `backup.enabled=true` and the in-cluster PostgreSQL. |

## Prerequisites

- Kubernetes 1.25+, Helm 3, `kubectl` pointed at the cluster.
- The two images in a registry the cluster can pull from (see below).
- For a public site: an ingress controller (the default `ingress.className` is `nginx`) and, for automatic TLS
  certificates, cert-manager with a cluster issuer.
- A default StorageClass (or set `postgres.storageClass`).

## Install

### 1. Images

From the repository root:

```bash
REGISTRY=registry.example.org/verse
TAG=2.0.0
docker build -f server/Dockerfile -t $REGISTRY/server:$TAG .
docker build -t $REGISTRY/frontend:$TAG client
docker push $REGISTRY/server:$TAG && docker push $REGISTRY/frontend:$TAG
```

For a private registry, create a pull secret and pass it as `image.pullSecrets`:

```bash
kubectl create namespace verse
kubectl -n verse create secret docker-registry regcred --docker-server=registry.example.org \
  --docker-username=… --docker-password=…
```

### 2. Values

Create a `my-values.yaml` (everything not set keeps its default from `values.yaml`):

```yaml
publicUrl: https://verse.example.org
image:
  registry: registry.example.org
  server: verse/server
  frontend: verse/frontend
  tag: "2.0.0"
  # pullSecrets: [ { name: regcred } ]
bootstrapAdmin:
  email: you@example.org          # password is generated, see the NOTES after install
ingress:
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt
```

### 3. Install or upgrade

```bash
helm upgrade --install verse deploy/helm/verse -n verse --create-namespace -f my-values.yaml
kubectl -n verse get pods -w
```

The first start creates the schema and imports the classics (a few seconds). Get the bootstrap admin password:

```bash
kubectl -n verse get secret verse-verse-app -o jsonpath='{.data.adminPassword}' | base64 -d; echo
```

Sign in, open **Members**, make your own account an admin, then remove `bootstrapAdmin.email` from your values and
upgrade again.

**Try it without DNS or an ingress:**

```bash
helm upgrade --install verse deploy/helm/verse -n verse --create-namespace \
  --set ingress.enabled=false --set publicUrl=http://localhost:8020 --set bootstrapAdmin.email=admin@example.org
kubectl -n verse port-forward svc/verse-verse-frontend 8020:80     # then http://localhost:8020
```

## Values

| Key | Default | Meaning |
|---|---|---|
| `publicUrl` | `https://verse.example.org` | Public address: ingress host and allowed CORS origin. |
| `image.registry` | `""` | Registry prefix; empty uses the plain image names. |
| `image.server` / `image.frontend` | `verse/server` / `verse/frontend` | Image names. |
| `image.tag` | `2.0.0` | Tag for both images. |
| `image.pullPolicy` / `image.pullSecrets` | `IfNotPresent` / `[]` | |
| `auth.jwtSecret` | `""` (generated) | Token signing key, 32+ characters. Changing it signs everyone out. |
| `auth.tokenTtl` | `7d` | How long a sign-in lasts. |
| `bootstrapAdmin.email` | `""` (off) | Admin account made sure of at every start. |
| `bootstrapAdmin.password` | `""` (generated) | Its password, only used when the account is created. |
| `bootstrapAdmin.displayName` | `Admin` | |
| `seed.classics` | `true` | Import the classics into an empty database. |
| `postgres.enabled` | `true` | In-cluster PostgreSQL. `false` = use `postgres.external.*`. |
| `postgres.image` | `postgres:16.4` | |
| `postgres.storage` / `postgres.storageClass` | `5Gi` / `""` | Database volume. |
| `postgres.database` / `postgres.username` | `verse` / `verse` | |
| `postgres.password` | `""` (generated) | Required for an external database. |
| `postgres.external.host` / `.port` | `""` / `5432` | Managed database. |
| `postgres.resources` | 100m / 256Mi, limit 1Gi | |
| `backup.enabled` | `true` | Nightly `pg_dump` (in-cluster PostgreSQL only). |
| `backup.schedule` / `backup.storage` / `backup.keepDays` | `0 3 * * *` / `10Gi` / `14` | |
| `server.replicas` | `1` | More than one works; replicas see each other's changes at once. |
| `server.javaOpts` | `-XX:MaxRAMPercentage=70` | |
| `server.resources` | 200m / 512Mi, limit 1Gi | |
| `server.extraEnv` | `[]` | Extra environment variables for the server, e.g. `VERSE_SEED_CLASSICS`. |
| `frontend.replicas` / `frontend.resources` | `1` / 20m / 32Mi, limit 128Mi | |
| `ingress.enabled` / `ingress.className` | `true` / `nginx` | |
| `ingress.annotations` | `{}` | e.g. `cert-manager.io/cluster-issuer: letsencrypt`. |
| `ingress.tls` / `ingress.tlsSecretName` | `true` / `""` | |

## Using a managed database

Create the database and a user that owns it, then:

```yaml
postgres:
  enabled: false
  external: { host: verse-db.example.internal, port: 5432 }
  database: verse
  username: verse
  password: "…"
```

The backup CronJob is not rendered in this mode; use your provider's backups.

## Backups and restore

With the in-cluster PostgreSQL, a CronJob writes `verse_<date>.dump` (custom format) to the `<release>-verse-backups`
volume every night and deletes dumps older than `backup.keepDays`. The database pod mounts that volume read-only at
`/backups`, so listing and restoring are a `kubectl exec` (here release `verse`, namespace `verse`):

```bash
# a backup now, outside the schedule
kubectl -n verse create job --from=cronjob/verse-verse-backup backup-now

# list the dumps
kubectl -n verse exec verse-verse-postgres-0 -- ls -lt /backups

# restore one: stop the server, restore, start it again
kubectl -n verse scale deploy verse-verse-server --replicas=0
kubectl -n verse exec verse-verse-postgres-0 -- sh -c \
  'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists /backups/verse_2026-11-12_0300.dump'
kubectl -n verse scale deploy verse-verse-server --replicas=1
```

To keep copies off the cluster: `kubectl -n verse cp verse-verse-postgres-0:/backups/<file>.dump ./<file>.dump`.

## Upgrades

- **New Verse version:** push images with a new tag, `helm upgrade verse deploy/helm/verse -n verse --reuse-values
  --set image.tag=<tag>`. Schema migrations run when the new server starts.
- **Secrets** are never rotated by an upgrade. To rotate the token secret, delete the `jwtSecret` key from
  `<release>-verse-app` (or pass `auth.jwtSecret`) and upgrade; everyone has to sign in again.
- **From the 1.x chart:** the data model changed and is not migrated. Install 2.0 as a new release, or
  uninstall 1.x and delete its PVCs first.

## Uninstall

```bash
helm uninstall verse -n verse
kubectl -n verse get pvc        # database and backups are kept; delete them to remove the data for good
```
