/**
 * Builds docker-compose.yml fragments for local development stacks.
 * Images and ports are opinionated defaults — users should adjust for production.
 */

export type ComposeCategory =
  | 'databases'
  | 'cache'
  | 'queues'
  | 'search'
  | 'storage'
  | 'proxy'
  | 'observability'
  | 'mail'
  | 'admin'

export interface ComposeServiceDefinition {
  id: string
  category: ComposeCategory
  /** Lowercase tokens for search (English; UI search is client-side). */
  search: string[]
  /** Named volumes this service uses (top-level `volumes:` merged). */
  volumes: string[]
}

export const COMPOSE_SERVICE_DEFINITIONS: ComposeServiceDefinition[] = [
  { id: 'postgres', category: 'databases', search: ['postgres', 'postgresql', 'sql', 'rdbms'], volumes: ['pgdata'] },
  { id: 'mysql', category: 'databases', search: ['mysql', 'sql', 'rdbms'], volumes: ['mysql_data'] },
  { id: 'mariadb', category: 'databases', search: ['mariadb', 'mysql', 'sql'], volumes: ['mariadb_data'] },
  { id: 'mongodb', category: 'databases', search: ['mongo', 'nosql', 'document'], volumes: ['mongo_data'] },
  { id: 'redis', category: 'cache', search: ['redis', 'cache', 'key value'], volumes: ['redis_data'] },
  { id: 'valkey', category: 'cache', search: ['valkey', 'redis', 'cache', 'fork'], volumes: ['valkey_data'] },
  { id: 'memcached', category: 'cache', search: ['memcached', 'cache'], volumes: [] },
  { id: 'rabbitmq', category: 'queues', search: ['rabbitmq', 'amqp', 'queue', 'message'], volumes: ['rabbitmq_data'] },
  { id: 'nats', category: 'queues', search: ['nats', 'jetstream', 'messaging'], volumes: ['nats_data'] },
  { id: 'kafka', category: 'queues', search: ['kafka', 'kraft', 'streaming', 'event'], volumes: [] },
  { id: 'redpanda', category: 'queues', search: ['redpanda', 'kafka', 'compatible', 'streaming'], volumes: ['redpanda_data'] },
  { id: 'elasticsearch', category: 'search', search: ['elasticsearch', 'elastic', 'search', 'logs'], volumes: ['es_data'] },
  { id: 'opensearch', category: 'search', search: ['opensearch', 'search', 'logs'], volumes: ['os_data'] },
  { id: 'meilisearch', category: 'search', search: ['meilisearch', 'search', 'typo tolerant'], volumes: ['meili_data'] },
  { id: 'typesense', category: 'search', search: ['typesense', 'search', 'instant'], volumes: ['typesense_data'] },
  { id: 'minio', category: 'storage', search: ['minio', 's3', 'object storage'], volumes: ['minio_data'] },
  { id: 'clickhouse', category: 'databases', search: ['clickhouse', 'olap', 'analytics', 'sql'], volumes: ['ch_data'] },
  { id: 'cockroachdb', category: 'databases', search: ['cockroach', 'cockroachdb', 'sql', 'distributed'], volumes: ['cockroach_data'] },
  { id: 'cassandra', category: 'databases', search: ['cassandra', 'nosql', 'wide column'], volumes: ['cassandra_data'] },
  { id: 'neo4j', category: 'databases', search: ['neo4j', 'graph', 'cypher'], volumes: ['neo4j_data'] },
  { id: 'influxdb', category: 'databases', search: ['influxdb', 'influx', 'timeseries', 'metrics'], volumes: ['influx_data'] },
  { id: 'couchdb', category: 'databases', search: ['couchdb', 'nosql', 'document'], volumes: ['couch_data'] },
  { id: 'dynamodb-local', category: 'databases', search: ['dynamodb', 'aws', 'local', 'amazon'], volumes: [] },
  { id: 'timescaledb', category: 'databases', search: ['timescaledb', 'timescale', 'postgres', 'timeseries'], volumes: ['tsdata'] },
  { id: 'nginx', category: 'proxy', search: ['nginx', 'reverse proxy', 'http', 'web'], volumes: [] },
  { id: 'traefik', category: 'proxy', search: ['traefik', 'reverse proxy', 'ingress', 'docker'], volumes: [] },
  {
    id: 'caddy',
    category: 'proxy',
    search: ['caddy', 'https', 'reverse proxy'],
    volumes: ['caddy_data', 'caddy_config'],
  },
  { id: 'prometheus', category: 'observability', search: ['prometheus', 'metrics', 'monitoring', 'promql'], volumes: ['prometheus_data'] },
  { id: 'grafana', category: 'observability', search: ['grafana', 'dashboards', 'metrics', 'visualization'], volumes: ['grafana_data'] },
  { id: 'jaeger', category: 'observability', search: ['jaeger', 'tracing', 'opentelemetry', 'otlp'], volumes: [] },
  { id: 'zipkin', category: 'observability', search: ['zipkin', 'tracing'], volumes: [] },
  { id: 'loki', category: 'observability', search: ['loki', 'logs', 'grafana'], volumes: ['loki_data'] },
  { id: 'mailpit', category: 'mail', search: ['mailpit', 'smtp', 'email', 'mailhog'], volumes: ['mailpit_data'] },
  { id: 'pgadmin', category: 'admin', search: ['pgadmin', 'postgres', 'gui'], volumes: ['pgadmin_data'] },
  { id: 'adminer', category: 'admin', search: ['adminer', 'sql', 'database', 'gui'], volumes: [] },
  { id: 'phpmyadmin', category: 'admin', search: ['phpmyadmin', 'mysql', 'gui'], volumes: [] },
  { id: 'vault', category: 'admin', search: ['hashicorp', 'vault', 'secrets'], volumes: [] },
  { id: 'keycloak', category: 'admin', search: ['keycloak', 'oauth', 'oidc', 'identity', 'sso'], volumes: [] },
  { id: 'portainer', category: 'admin', search: ['portainer', 'docker', 'ui', 'containers'], volumes: ['portainer_data'] },
  { id: 'metabase', category: 'admin', search: ['metabase', 'bi', 'analytics', 'sql'], volumes: ['metabase_data'] },
  { id: 'gotenberg', category: 'admin', search: ['gotenberg', 'pdf', 'chrome', 'documents'], volumes: [] },
]

const DEF_BY_ID = Object.fromEntries(COMPOSE_SERVICE_DEFINITIONS.map((d) => [d.id, d])) as Record<
  string,
  ComposeServiceDefinition
>

export const COMPOSE_SERVICE_ORDER = COMPOSE_SERVICE_DEFINITIONS.map((d) => d.id)

export function isComposeServiceId(id: string): boolean {
  return id in DEF_BY_ID
}

export interface ComposeSelectionContext {
  hasPostgres: boolean
  hasTimescaledb: boolean
  hasMysql: boolean
  hasMariadb: boolean
}

function serviceYaml(id: string, ctx: ComposeSelectionContext): string {
  switch (id) {
    case 'postgres':
      return `  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5`

    case 'mysql':
      return `  mysql:
    image: mysql:8.4
    restart: unless-stopped
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: app
      MYSQL_USER: app
      MYSQL_PASSWORD: app
    volumes:
      - mysql_data:/var/lib/mysql`

    case 'mariadb':
      return `  mariadb:
    image: mariadb:11
    restart: unless-stopped
    ports:
      - "3307:3306"
    environment:
      MARIADB_ROOT_PASSWORD: root
      MARIADB_DATABASE: app
      MARIADB_USER: app
      MARIADB_PASSWORD: app
    volumes:
      - mariadb_data:/var/lib/mysql`

    case 'mongodb':
      return `  mongodb:
    image: mongo:7
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: root
    volumes:
      - mongo_data:/data/db`

    case 'redis':
      return `  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "6379:6379"
    command: ["redis-server", "--appendonly", "yes"]
    volumes:
      - redis_data:/data`

    case 'valkey':
      return `  valkey:
    image: valkey/valkey:7-alpine
    restart: unless-stopped
    ports:
      - "6380:6379"
    command: ["valkey-server", "--appendonly", "yes"]
    volumes:
      - valkey_data:/data`

    case 'memcached':
      return `  memcached:
    image: memcached:alpine
    restart: unless-stopped
    ports:
      - "11211:11211"`

    case 'rabbitmq':
      return `  rabbitmq:
    image: rabbitmq:3-management-alpine
    restart: unless-stopped
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq`

    case 'nats':
      return `  nats:
    image: nats:2-alpine
    restart: unless-stopped
    ports:
      - "4222:4222"
      - "8222:8222"
    command: ["-js", "-m", "8222"]
    volumes:
      - nats_data:/data/jetstream`

    case 'kafka':
      return `  kafka:
    image: apache/kafka:3.8.0
    restart: unless-stopped
    hostname: kafka
    ports:
      - "9092:9092"
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: "CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT"
      KAFKA_ADVERTISED_LISTENERS: "PLAINTEXT_HOST://localhost:9092,PLAINTEXT://kafka:19092"
      KAFKA_PROCESS_ROLES: "broker,controller"
      KAFKA_CONTROLLER_QUORUM_VOTERS: "1@kafka:29093"
      KAFKA_LISTENERS: "PLAINTEXT_HOST://0.0.0.0:9092,PLAINTEXT://0.0.0.0:19092,CONTROLLER://0.0.0.0:29093"
      KAFKA_INTER_BROKER_LISTENER_NAME: "PLAINTEXT"
      KAFKA_CONTROLLER_LISTENER_NAMES: "CONTROLLER"
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1
      KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0
      KAFKA_NUM_PARTITIONS: 1`

    case 'redpanda':
      return `  redpanda:
    image: docker.redpanda.com/redpandadata/redpanda:v24.2.4
    restart: unless-stopped
    command:
      - redpanda
      - start
      - --smp
      - "1"
      - --reserve-memory
      - 0M
      - --overprovisioned
      - --node-id
      - "0"
      - --kafka-addr
      - INTERNAL://0.0.0.0:29092,EXTERNAL://0.0.0.0:9092
      - --advertise-kafka-addr
      - INTERNAL://redpanda:29092,EXTERNAL://localhost:19092
    ports:
      - "19092:9092"
      - "9644:9644"
    volumes:
      - redpanda_data:/var/lib/redpanda/data`

    case 'elasticsearch':
      return `  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.15.0
    restart: unless-stopped
    ports:
      - "9200:9200"
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - es_data:/usr/share/elasticsearch/data`

    case 'opensearch':
      return `  opensearch:
    image: opensearchproject/opensearch:2
    restart: unless-stopped
    ports:
      - "9201:9200"
      - "9600:9600"
    environment:
      - discovery.type=single-node
      - plugins.security.disabled=true
      - "OPENSEARCH_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - os_data:/usr/share/opensearch/data`

    case 'meilisearch':
      return `  meilisearch:
    image: getmeili/meilisearch:v1.11
    restart: unless-stopped
    ports:
      - "7700:7700"
    environment:
      MEILI_MASTER_KEY: dev_master_key_change_me
    volumes:
      - meili_data:/meili_data`

    case 'typesense':
      return `  typesense:
    image: typesense/typesense:27.1
    restart: unless-stopped
    ports:
      - "8108:8108"
    environment:
      TYPESENSE_DATA_DIR: /data
      TYPESENSE_API_KEY: dev_key_change_me
      TYPESENSE_ENABLE_CORS: "true"
    volumes:
      - typesense_data:/data`

    case 'minio':
      return `  minio:
    image: minio/minio:latest
    restart: unless-stopped
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data`

    case 'clickhouse':
      return `  clickhouse:
    image: clickhouse/clickhouse-server:24.8
    restart: unless-stopped
    ports:
      - "8123:8123"
      - "9009:9000"
    ulimits:
      nofile:
        soft: 262144
        hard: 262144
    volumes:
      - ch_data:/var/lib/clickhouse`

    case 'cockroachdb':
      return `  cockroachdb:
    image: cockroachdb/cockroach:v24.2.4
    restart: unless-stopped
    command: start-single-node --insecure
    ports:
      - "26257:26257"
      - "9089:8080"
    volumes:
      - cockroach_data:/cockroach/cockroach-data`

    case 'cassandra':
      return `  cassandra:
    image: cassandra:5
    restart: unless-stopped
    ports:
      - "9042:9042"
    environment:
      MAX_HEAP_SIZE: 512M
      HEAP_NEWSIZE: 128M
    volumes:
      - cassandra_data:/var/lib/cassandra`

    case 'neo4j':
      return `  neo4j:
    image: neo4j:5
    restart: unless-stopped
    ports:
      - "7474:7474"
      - "7687:7687"
    environment:
      NEO4J_AUTH: neo4j/devpassword
    volumes:
      - neo4j_data:/data`

    case 'influxdb':
      return `  influxdb:
    image: influxdb:2
    restart: unless-stopped
    ports:
      - "8086:8086"
    environment:
      DOCKER_INFLUXDB_INIT_MODE: setup
      DOCKER_INFLUXDB_INIT_USERNAME: admin
      DOCKER_INFLUXDB_INIT_PASSWORD: adminadminadmin
      DOCKER_INFLUXDB_INIT_ORG: dev
      DOCKER_INFLUXDB_INIT_BUCKET: app
    volumes:
      - influx_data:/var/lib/influxdb2`

    case 'couchdb':
      return `  couchdb:
    image: couchdb:3
    restart: unless-stopped
    ports:
      - "5984:5984"
    environment:
      COUCHDB_USER: admin
      COUCHDB_PASSWORD: admin
    volumes:
      - couch_data:/opt/couchdb/data`

    case 'dynamodb-local':
      return `  dynamodb-local:
    image: amazon/dynamodb-local:latest
    restart: unless-stopped
    ports:
      - "8765:8000"`

    case 'timescaledb':
      return `  timescaledb:
    image: timescale/timescaledb:latest-pg16
    restart: unless-stopped
    ports:
      - "5433:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app
    volumes:
      - tsdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5`

    case 'nginx':
      return `  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "8088:80"`

    case 'traefik':
      return `  traefik:
    image: traefik:v3.1
    restart: unless-stopped
    ports:
      - "9080:80"
      - "9081:8080"
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro`

    case 'caddy':
      return `  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "8889:80"
      - "8899:443"
    volumes:
      - caddy_data:/data
      - caddy_config:/config`

    case 'prometheus':
      return `  prometheus:
    image: prom/prometheus:v2.54.1
    restart: unless-stopped
    ports:
      - "9090:9090"
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.path=/prometheus"
      - "--web.enable-lifecycle"
    volumes:
      - prometheus_data:/prometheus`

    case 'grafana':
      return `  grafana:
    image: grafana/grafana:11.2.0
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_USER: admin
      GF_SECURITY_ADMIN_PASSWORD: admin
      GF_USERS_DEFAULT_THEME: dark
    volumes:
      - grafana_data:/var/lib/grafana`

    case 'jaeger':
      return `  jaeger:
    image: jaegertracing/all-in-one:1.60
    restart: unless-stopped
    ports:
      - "16686:16686"
      - "4317:4317"
      - "4318:4318"
      - "14268:14268"`

    case 'zipkin':
      return `  zipkin:
    image: openzipkin/zipkin:3
    restart: unless-stopped
    ports:
      - "9411:9411"`

    case 'loki':
      return `  loki:
    image: grafana/loki:3.1.0
    restart: unless-stopped
    ports:
      - "3100:3100"
    command:
      - -config.file=/etc/loki/local-config.yaml
    volumes:
      - loki_data:/loki`

    case 'mailpit':
      return `  mailpit:
    image: axllent/mailpit:latest
    restart: unless-stopped
    ports:
      - "8025:8025"
      - "1025:1025"
    volumes:
      - mailpit_data:/data`

    case 'pgadmin': {
      let depends = ''
      if (ctx.hasPostgres) {
        depends = `    depends_on:
      postgres:
        condition: service_healthy
`
      } else if (ctx.hasTimescaledb) {
        depends = `    depends_on:
      timescaledb:
        condition: service_healthy
`
      }
      const env = `    environment:
      PGADMIN_CONFIG_SERVER_MODE: "False"
      PGADMIN_DEFAULT_EMAIL: admin@local.dev
      PGADMIN_DEFAULT_PASSWORD: admin
`
      return `  pgadmin:
    image: dpage/pgadmin4:latest
    restart: unless-stopped
    ports:
      - "5050:80"
${env}${depends}    volumes:
      - pgadmin_data:/var/lib/pgadmin`
    }

    case 'adminer':
      return `  adminer:
    image: adminer:latest
    restart: unless-stopped
    ports:
      - "8089:8080"`

    case 'phpmyadmin': {
      const dep = ctx.hasMysql
        ? `    depends_on:
      - mysql
`
        : ctx.hasMariadb
          ? `    depends_on:
      - mariadb
`
          : ''
      const env =
        ctx.hasMysql && !ctx.hasMariadb
          ? `    environment:
      PMA_HOST: mysql
      PMA_USER: root
      PMA_PASSWORD: root
`
          : ctx.hasMariadb && !ctx.hasMysql
            ? `    environment:
      PMA_HOST: mariadb
      PMA_USER: root
      PMA_PASSWORD: root
`
            : ctx.hasMysql && ctx.hasMariadb
              ? `    environment:
      PMA_HOSTS: mysql,mariadb
      PMA_USER: root
      PMA_PASSWORD: root
`
              : `    environment:
      PMA_ARBITRARY: 1
`
      return `  phpmyadmin:
    image: phpmyadmin:latest
    restart: unless-stopped
    ports:
      - "8081:80"
${env}${dep}`
    }

    case 'vault':
      return `  vault:
    image: hashicorp/vault:1.17
    restart: unless-stopped
    cap_add:
      - IPC_LOCK
    ports:
      - "8200:8200"
    environment:
      VAULT_DEV_ROOT_TOKEN_ID: root
      VAULT_DEV_LISTEN_ADDRESS: 0.0.0.0:8200`

    case 'keycloak':
      return `  keycloak:
    image: quay.io/keycloak/keycloak:26.0
    restart: unless-stopped
    command: start-dev
    ports:
      - "8180:8080"
    environment:
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: admin`

    case 'portainer':
      return `  portainer:
    image: portainer/portainer-ce:2.21.0
    restart: unless-stopped
    ports:
      - "9443:9443"
      - "9876:9000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data`

    case 'metabase':
      return `  metabase:
    image: metabase/metabase:latest
    restart: unless-stopped
    ports:
      - "3030:3000"
    volumes:
      - metabase_data:/metabase-data`

    case 'gotenberg':
      return `  gotenberg:
    image: gotenberg/gotenberg:8
    restart: unless-stopped
    ports:
      - "3040:3000"`

    default:
      return ''
  }
}

export function buildDockerComposeYaml(selectedIds: string[]): string {
  const unique = [...new Set(selectedIds.filter((id) => id in DEF_BY_ID))]
  unique.sort((a, b) => COMPOSE_SERVICE_ORDER.indexOf(a) - COMPOSE_SERVICE_ORDER.indexOf(b))

  if (unique.length === 0) {
    return '# Pick one or more services in MyDevTools to generate docker-compose.yml.'
  }

  const ctx: ComposeSelectionContext = {
    hasPostgres: unique.includes('postgres'),
    hasTimescaledb: unique.includes('timescaledb'),
    hasMysql: unique.includes('mysql'),
    hasMariadb: unique.includes('mariadb'),
  }

  const blocks = unique.map((id) => serviceYaml(id, ctx)).filter((s) => s.length > 0)
  const volumeNames = new Set<string>()
  for (const id of unique) {
    for (const v of DEF_BY_ID[id]!.volumes) {
      volumeNames.add(v)
    }
  }

  const header = `# Generated for local development — change passwords and published ports before production.
# See each image's documentation for tuning JVM heap, replication, and security.

services:
`
  const services = blocks.join('\n\n')
  const volSection =
    volumeNames.size > 0
      ? `\n\nvolumes:\n${[...volumeNames].sort().map((v) => `  ${v}:`).join('\n')}`
      : ''

  return header + services + volSection
}
