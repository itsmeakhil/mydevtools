/**
 * One-off / maintenance: merge localized Docker Compose Generator strings into every messages/*.json (except en).
 * Run from apps/web: node scripts/update-docker-compose-all-locales.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const messagesDir = path.join(__dirname, '../messages')

function deepMerge(target, source) {
  if (!source || typeof source !== 'object') return target
  for (const key of Object.keys(source)) {
    const sv = source[key]
    const tv = target[key]
    if (sv && typeof sv === 'object' && !Array.isArray(sv) && tv && typeof tv === 'object' && !Array.isArray(tv)) {
      deepMerge(tv, sv)
    } else {
      target[key] = sv
    }
  }
  return target
}

const enPath = path.join(messagesDir, 'en.json')
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'))
const enDcg = en.DockerComposeGenerator
const enDash = en.Dashboard.tools.dockerComposeGenerator

/** @type {Record<string, { nav: string; dashTitle: string; dashDesc: string; dcg: Record<string, unknown> }>} */
const L = {
  fr: {
    nav: 'Générateur Docker Compose',
    dashTitle: 'Générateur Docker Compose',
    dashDesc:
      'Choisissez bases de données, caches, files, proxys et observabilité ; exportez un docker-compose.yml pour le dev local.',
    dcg: {
      title: 'Générateur Docker Compose',
      subtitle:
        'Sélectionnez bases de données, caches, files d’attente, proxys inverses et observabilité — copiez un docker-compose.yml prêt pour le développement local.',
      searchPlaceholder: 'Rechercher (postgres, redis, kafka, nginx, grafana…)',
      selectedLabel: 'Services',
      selectedCount: '{count, plural, one {# service} other {# services}}',
      copy: 'Copier',
      copied: 'Copié !',
      download: 'Télécharger',
      emptyState: 'Sélectionnez un ou plusieurs services pour générer le YAML Compose.',
      hintPorts:
        'Les ports hôte par défaut limitent les conflits ; modifiez-les si Docker signale un port déjà utilisé. Remplacez les mots de passe de démo avant tout environnement partagé.',
      categories: {
        databases: 'Bases de données et stockages',
        cache: 'Cache et mémoire',
        queues: 'Files d’attente et messagerie',
        search: 'Recherche et journaux',
        storage: 'Stockage objet',
        proxy: 'Proxys inverses et entrée',
        observability: 'Métriques et traçage',
        mail: 'E-mail (dev local)',
        admin: 'Interfaces d’admin et BI',
      },
      presets: {
        stackWeb: 'Postgres + Redis + Nginx',
        stackMern: 'MongoDB + Redis + Nginx',
        stackObserve: 'Prometheus + Grafana + Loki',
        stackMessaging: 'RabbitMQ + Redis',
        stackSearch: 'Meilisearch + Postgres',
        clear: 'Effacer',
      },
      services: {
        valkey: 'Valkey (compatible Redis)',
        redpanda: 'Redpanda (compatible Kafka)',
        minio: 'MinIO (compatible S3)',
        'dynamodb-local': 'Amazon DynamoDB Local',
        mailpit: 'Mailpit (capture SMTP)',
        vault: 'HashiCorp Vault (mode dev)',
        gotenberg: 'Gotenberg (Chromium / PDF)',
      },
    },
  },
  de: {
    nav: 'Docker-Compose-Generator',
    dashTitle: 'Docker-Compose-Generator',
    dashDesc:
      'Datenbanken, Caches, Warteschlangen, Proxys und Observability wählen; docker-compose.yml für lokale Stacks exportieren.',
    dcg: {
      title: 'Docker-Compose-Generator',
      subtitle:
        'Beliebte Datenbanken, Caches, Messaging, Reverse Proxys und Observability auswählen — fertiges docker-compose.yml für die lokale Entwicklung kopieren.',
      searchPlaceholder: 'Suchen (postgres, redis, kafka, nginx, grafana…)',
      selectedLabel: 'Dienste',
      selectedCount: '{count, plural, one {# Dienst} other {# Dienste}}',
      copy: 'Kopieren',
      copied: 'Kopiert!',
      download: 'Herunterladen',
      emptyState: 'Wählen Sie einen oder mehrere Dienste, um Compose-YAML zu erzeugen.',
      hintPorts:
        'Standard-Hostports sind verteilt, um Kollisionen zu vermeiden; bei Bind-Fehlern anpassen. Demo-Passwörter vor geteilten Umgebungen ersetzen.',
      categories: {
        databases: 'Datenbanken & Speicher',
        cache: 'Cache & In-Memory',
        queues: 'Warteschlangen & Messaging',
        search: 'Suche & Logs',
        storage: 'Objektspeicher',
        proxy: 'Reverse Proxys & Ingress',
        observability: 'Metriken & Tracing',
        mail: 'E-Mail (lokal)',
        admin: 'Admin- & BI-Oberflächen',
      },
      presets: {
        stackWeb: 'Postgres + Redis + Nginx',
        stackMern: 'MongoDB + Redis + Nginx',
        stackObserve: 'Prometheus + Grafana + Loki',
        stackMessaging: 'RabbitMQ + Redis',
        stackSearch: 'Meilisearch + Postgres',
        clear: 'Leeren',
      },
      services: {
        valkey: 'Valkey (Redis-kompatibel)',
        redpanda: 'Redpanda (Kafka-kompatibel)',
        minio: 'MinIO (S3-kompatibel)',
        'dynamodb-local': 'Amazon DynamoDB Local',
        mailpit: 'Mailpit (SMTP-Mitschnitt)',
        vault: 'HashiCorp Vault (Dev-Server)',
        gotenberg: 'Gotenberg (Chromium / PDF)',
      },
    },
  },
  es: {
    nav: 'Generador Docker Compose',
    dashTitle: 'Generador Docker Compose',
    dashDesc:
      'Elige bases de datos, cachés, colas, proxies e imágenes de observabilidad; exporta un docker-compose.yml para entornos locales.',
    dcg: {
      title: 'Generador Docker Compose',
      subtitle:
        'Selecciona bases de datos, cachés, colas, proxies inversos y observabilidad — copia un docker-compose.yml listo para desarrollo local.',
      searchPlaceholder: 'Buscar (postgres, redis, kafka, nginx, grafana…)',
      selectedLabel: 'Servicios',
      selectedCount: '{count, plural, one {# servicio} other {# servicios}}',
      copy: 'Copiar',
      copied: '¡Copiado!',
      download: 'Descargar',
      emptyState: 'Selecciona uno o más servicios para generar el YAML de Compose.',
      hintPorts:
        'Los puertos del host por defecto reducen conflictos; cámbialos si Docker indica un puerto en uso. Sustituye las contraseñas de demostración antes de entornos compartidos.',
      categories: {
        databases: 'Bases de datos y almacenes',
        cache: 'Caché y en memoria',
        queues: 'Colas y mensajería',
        search: 'Búsqueda y registros',
        storage: 'Almacenamiento de objetos',
        proxy: 'Proxies inversos e ingress',
        observability: 'Métricas y trazas',
        mail: 'Correo (desarrollo local)',
        admin: 'Interfaces de administración y BI',
      },
      presets: {
        stackWeb: 'Postgres + Redis + Nginx',
        stackMern: 'MongoDB + Redis + Nginx',
        stackObserve: 'Prometheus + Grafana + Loki',
        stackMessaging: 'RabbitMQ + Redis',
        stackSearch: 'Meilisearch + Postgres',
        clear: 'Limpiar',
      },
      services: {
        valkey: 'Valkey (compatible con Redis)',
        redpanda: 'Redpanda (compatible con Kafka)',
        minio: 'MinIO (compatible con S3)',
        'dynamodb-local': 'Amazon DynamoDB Local',
        mailpit: 'Mailpit (captura SMTP)',
        vault: 'HashiCorp Vault (servidor de desarrollo)',
        gotenberg: 'Gotenberg (Chromium / PDF)',
      },
    },
  },
  it: {
    nav: 'Generatore Docker Compose',
    dashTitle: 'Generatore Docker Compose',
    dashDesc:
      'Scegli database, cache, code, proxy e immagini di osservabilità; esporta un docker-compose.yml per stack locali.',
    dcg: {
      title: 'Generatore Docker Compose',
      subtitle:
        'Seleziona database, cache, code di messaggi, reverse proxy e osservabilità — copia un docker-compose.yml pronto per lo sviluppo locale.',
      searchPlaceholder: 'Cerca (postgres, redis, kafka, nginx, grafana…)',
      selectedLabel: 'Servizi',
      selectedCount: '{count, plural, one {# servizio} other {# servizi}}',
      copy: 'Copia',
      copied: 'Copiato!',
      download: 'Scarica',
      emptyState: 'Seleziona uno o più servizi per generare lo YAML Compose.',
      hintPorts:
        'Le porte host predefinite riduono i conflitti; modifiale se Docker segnala un bind in uso. Sostituisci le password demo prima di ambienti condivisi.',
      categories: {
        databases: 'Database e archivi',
        cache: 'Cache e in-memory',
        queues: 'Code e messaggistica',
        search: 'Ricerca e log',
        storage: 'Object storage',
        proxy: 'Reverse proxy e ingress',
        observability: 'Metriche e tracing',
        mail: 'E-mail (sviluppo locale)',
        admin: 'Interfacce admin e BI',
      },
      presets: {
        stackWeb: 'Postgres + Redis + Nginx',
        stackMern: 'MongoDB + Redis + Nginx',
        stackObserve: 'Prometheus + Grafana + Loki',
        stackMessaging: 'RabbitMQ + Redis',
        stackSearch: 'Meilisearch + Postgres',
        clear: 'Cancella',
      },
      services: {
        valkey: 'Valkey (compatibile Redis)',
        redpanda: 'Redpanda (compatibile Kafka)',
        minio: 'MinIO (compatibile S3)',
        'dynamodb-local': 'Amazon DynamoDB Local',
        mailpit: 'Mailpit (cattura SMTP)',
        vault: 'HashiCorp Vault (server di sviluppo)',
        gotenberg: 'Gotenberg (Chromium / PDF)',
      },
    },
  },
  pt: {
    nav: 'Gerador Docker Compose',
    dashTitle: 'Gerador Docker Compose',
    dashDesc:
      'Escolha bases de dados, caches, filas, proxies e imagens de observabilidade; exporte um docker-compose.yml para stacks locais.',
    dcg: {
      title: 'Gerador Docker Compose',
      subtitle:
        'Selecione bases de dados, caches, filas de mensagens, proxies inversos e observabilidade — copie um docker-compose.yml pronto para desenvolvimento local.',
      searchPlaceholder: 'Pesquisar (postgres, redis, kafka, nginx, grafana…)',
      selectedLabel: 'Serviços',
      selectedCount: '{count, plural, one {# serviço} other {# serviços}}',
      copy: 'Copiar',
      copied: 'Copiado!',
      download: 'Transferir',
      emptyState: 'Selecione um ou mais serviços para gerar o YAML do Compose.',
      hintPorts:
        'As portas predefinidas reduzem conflitos; ajuste se o Docker reportar porta em uso. Substitua palavras-passe de demonstração antes de ambientes partilhados.',
      categories: {
        databases: 'Bases de dados e armazenamento',
        cache: 'Cache e em memória',
        queues: 'Filas e mensagens',
        search: 'Pesquisa e registos',
        storage: 'Armazenamento de objetos',
        proxy: 'Proxies inversos e ingress',
        observability: 'Métricas e tracing',
        mail: 'E-mail (dev local)',
        admin: 'Interfaces de administração e BI',
      },
      presets: {
        stackWeb: 'Postgres + Redis + Nginx',
        stackMern: 'MongoDB + Redis + Nginx',
        stackObserve: 'Prometheus + Grafana + Loki',
        stackMessaging: 'RabbitMQ + Redis',
        stackSearch: 'Meilisearch + Postgres',
        clear: 'Limpar',
      },
      services: {
        valkey: 'Valkey (compatível com Redis)',
        redpanda: 'Redpanda (compatível com Kafka)',
        minio: 'MinIO (compatível com S3)',
        'dynamodb-local': 'Amazon DynamoDB Local',
        mailpit: 'Mailpit (captura SMTP)',
        vault: 'HashiCorp Vault (servidor de desenvolvimento)',
        gotenberg: 'Gotenberg (Chromium / PDF)',
      },
    },
  },
  'pt-BR': {
    nav: 'Gerador Docker Compose',
    dashTitle: 'Gerador Docker Compose',
    dashDesc:
      'Escolha bancos de dados, caches, filas, proxies e imagens de observabilidade; exporte um docker-compose.yml para stacks locais.',
    dcg: {
      title: 'Gerador Docker Compose',
      subtitle:
        'Selecione bancos de dados, caches, filas, proxies reversos e observabilidade — copie um docker-compose.yml pronto para desenvolvimento local.',
      searchPlaceholder: 'Buscar (postgres, redis, kafka, nginx, grafana…)',
      selectedLabel: 'Serviços',
      selectedCount: '{count, plural, one {# serviço} other {# serviços}}',
      copy: 'Copiar',
      copied: 'Copiado!',
      download: 'Baixar',
      emptyState: 'Selecione um ou mais serviços para gerar o YAML do Compose.',
      hintPorts:
        'As portas padrão reduzem conflitos; ajuste se o Docker acusar porta em uso. Troque senhas de demonstração antes de ambientes compartilhados.',
      categories: {
        databases: 'Bancos de dados e armazenamento',
        cache: 'Cache e em memória',
        queues: 'Filas e mensageria',
        search: 'Busca e logs',
        storage: 'Armazenamento de objetos',
        proxy: 'Proxies reversos e ingress',
        observability: 'Métricas e tracing',
        mail: 'E-mail (dev local)',
        admin: 'Interfaces de administração e BI',
      },
      presets: {
        stackWeb: 'Postgres + Redis + Nginx',
        stackMern: 'MongoDB + Redis + Nginx',
        stackObserve: 'Prometheus + Grafana + Loki',
        stackMessaging: 'RabbitMQ + Redis',
        stackSearch: 'Meilisearch + Postgres',
        clear: 'Limpar',
      },
      services: {
        valkey: 'Valkey (compatível com Redis)',
        redpanda: 'Redpanda (compatível com Kafka)',
        minio: 'MinIO (compatível com S3)',
        'dynamodb-local': 'Amazon DynamoDB Local',
        mailpit: 'Mailpit (captura SMTP)',
        vault: 'HashiCorp Vault (servidor de desenvolvimento)',
        gotenberg: 'Gotenberg (Chromium / PDF)',
      },
    },
  },
  nl: {
    nav: 'Docker Compose-generator',
    dashTitle: 'Docker Compose-generator',
    dashDesc:
      'Kies databases, caches, wachtrijen, proxy’s en observability-images; exporteer een docker-compose.yml voor lokale stacks.',
    dcg: {
      title: 'Docker Compose-generator',
      subtitle:
        'Kies populaire databases, caches, messaging, reverse proxy’s en observability — kopieer een werkend docker-compose.yml voor lokale ontwikkeling.',
      searchPlaceholder: 'Zoeken (postgres, redis, kafka, nginx, grafana…)',
      selectedLabel: 'Services',
      selectedCount: '{count, plural, one {# service} other {# services}}',
      copy: 'Kopiëren',
      copied: 'Gekopieerd!',
      download: 'Downloaden',
      emptyState: 'Selecteer een of meer services om Compose-YAML te genereren.',
      hintPorts:
        'Standaard hostpoorten beperken conflicten; pas aan als Docker een poortfout meldt. Vervang demowachtwoorden vóór gedeelde omgevingen.',
      categories: {
        databases: "Databases & opslag",
        cache: 'Cache & in-memory',
        queues: 'Wachtrijen & messaging',
        search: 'Zoeken & logs',
        storage: 'Objectopslag',
        proxy: 'Reverse proxy’s & ingress',
        observability: 'Metrics & tracing',
        mail: 'E-mail (lokaal)',
        admin: 'Admin- & BI-interfaces',
      },
      presets: {
        stackWeb: 'Postgres + Redis + Nginx',
        stackMern: 'MongoDB + Redis + Nginx',
        stackObserve: 'Prometheus + Grafana + Loki',
        stackMessaging: 'RabbitMQ + Redis',
        stackSearch: 'Meilisearch + Postgres',
        clear: 'Wissen',
      },
      services: {
        valkey: 'Valkey (Redis-compatibel)',
        redpanda: 'Redpanda (Kafka-compatibel)',
        minio: 'MinIO (S3-compatibel)',
        'dynamodb-local': 'Amazon DynamoDB Local',
        mailpit: 'Mailpit (SMTP-vangst)',
        vault: 'HashiCorp Vault (dev-server)',
        gotenberg: 'Gotenberg (Chromium / PDF)',
      },
    },
  },
  pl: {
    nav: 'Generator Docker Compose',
    dashTitle: 'Generator Docker Compose',
    dashDesc:
      'Wybierz bazy danych, pamięć podręczną, kolejki, proxy i obserwowalność; eksportuj docker-compose.yml dla lokalnych stacków.',
    dcg: {
      title: 'Generator Docker Compose',
      subtitle:
        'Wybierz popularne bazy, cache, kolejki komunikatów, reverse proxy i obserwowalność — skopiuj działający docker-compose.yml na lokalny development.',
      searchPlaceholder: 'Szukaj (postgres, redis, kafka, nginx, grafana…)',
      selectedLabel: 'Usługi',
      selectedCount: '{count, plural, one {# usługa} few {# usługi} many {# usług} other {# usługi}}',
      copy: 'Kopiuj',
      copied: 'Skopiowano!',
      download: 'Pobierz',
      emptyState: 'Wybierz jedną lub więcej usług, aby wygenerować YAML Compose.',
      hintPorts:
        'Domyślne porty hosta ograniczają konflikty; zmień je, jeśli Docker zgłosi zajęty port. Zamień hasła demonstracyjne przed środowiskami współdzielonymi.',
      categories: {
        databases: 'Bazy danych i magazyny',
        cache: 'Cache i pamięć operacyjna',
        queues: 'Kolejki i messaging',
        search: 'Wyszukiwanie i logi',
        storage: 'Magazyn obiektów',
        proxy: 'Reverse proxy i ingress',
        observability: 'Metryki i śledzenie',
        mail: 'E-mail (lokalny dev)',
        admin: 'Interfejsy administracyjne i BI',
      },
      presets: {
        stackWeb: 'Postgres + Redis + Nginx',
        stackMern: 'MongoDB + Redis + Nginx',
        stackObserve: 'Prometheus + Grafana + Loki',
        stackMessaging: 'RabbitMQ + Redis',
        stackSearch: 'Meilisearch + Postgres',
        clear: 'Wyczyść',
      },
      services: {
        valkey: 'Valkey (zgodny z Redis)',
        redpanda: 'Redpanda (zgodny z Kafka)',
        minio: 'MinIO (zgodny z S3)',
        'dynamodb-local': 'Amazon DynamoDB Local',
        mailpit: 'Mailpit (przechwytywanie SMTP)',
        vault: 'HashiCorp Vault (serwer developerski)',
        gotenberg: 'Gotenberg (Chromium / PDF)',
      },
    },
  },
  ru: {
    nav: 'Генератор Docker Compose',
    dashTitle: 'Генератор Docker Compose',
    dashDesc:
      'Выберите СУБД, кэши, очереди, прокси и образы наблюдаемости; экспортируйте docker-compose.yml для локальных стеков.',
    dcg: {
      title: 'Генератор Docker Compose',
      subtitle:
        'Выберите популярные базы данных, кэши, брокеры сообщений, обратные прокси и наблюдаемость — скопируйте готовый docker-compose.yml для локальной разработки.',
      searchPlaceholder: 'Поиск (postgres, redis, kafka, nginx, grafana…)',
      selectedLabel: 'Сервисы',
      selectedCount: '{count, plural, one {# сервис} few {# сервиса} many {# сервисов} other {# сервисов}}',
      copy: 'Копировать',
      copied: 'Скопировано!',
      download: 'Скачать',
      emptyState: 'Выберите один или несколько сервисов, чтобы сгенерировать YAML Compose.',
      hintPorts:
        'Порты хоста подобраны, чтобы реже конфликтовать; измените при ошибке занятого порта. Замените демо-пароли перед общими средами.',
      categories: {
        databases: 'Базы данных и хранилища',
        cache: 'Кэш и in-memory',
        queues: 'Очереди и обмен сообщениями',
        search: 'Поиск и журналы',
        storage: 'Объектное хранилище',
        proxy: 'Обратные прокси и ingress',
        observability: 'Метрики и трассировка',
        mail: 'Почта (локальная разработка)',
        admin: 'Админ-интерфейсы и BI',
      },
      presets: {
        stackWeb: 'Postgres + Redis + Nginx',
        stackMern: 'MongoDB + Redis + Nginx',
        stackObserve: 'Prometheus + Grafana + Loki',
        stackMessaging: 'RabbitMQ + Redis',
        stackSearch: 'Meilisearch + Postgres',
        clear: 'Очистить',
      },
      services: {
        valkey: 'Valkey (совместим с Redis)',
        redpanda: 'Redpanda (совместим с Kafka)',
        minio: 'MinIO (совместим с S3)',
        'dynamodb-local': 'Amazon DynamoDB Local',
        mailpit: 'Mailpit (перехват SMTP)',
        vault: 'HashiCorp Vault (режим разработки)',
        gotenberg: 'Gotenberg (Chromium / PDF)',
      },
    },
  },
  uk: {
    nav: 'Генератор Docker Compose',
    dashTitle: 'Генератор Docker Compose',
    dashDesc:
      'Оберіть бази даних, кеші, черги, проксі та образи спостережуваності; експортуйте docker-compose.yml для локальних стеків.',
    dcg: {
      title: 'Генератор Docker Compose',
      subtitle:
        'Оберіть популярні бази даних, кеші, брокери повідомлень, зворотні проксі та спостережуваність — скопіюйте готовий docker-compose.yml для локальної розробки.',
      searchPlaceholder: 'Пошук (postgres, redis, kafka, nginx, grafana…)',
      selectedLabel: 'Сервіси',
      selectedCount: '{count, plural, one {# сервіс} few {# сервіси} many {# сервісів} other {# сервісів}}',
      copy: 'Копіювати',
      copied: 'Скопійовано!',
      download: 'Завантажити',
      emptyState: 'Оберіть один або кілька сервісів, щоб згенерувати YAML Compose.',
      hintPorts:
        'Порти хоста підібрані, щоб рідше конфліктували; змініть за потреби. Замініть демо-паролі перед спільними середовищами.',
      categories: {
        databases: 'Бази даних і сховища',
        cache: 'Кеш і in-memory',
        queues: 'Черги та обмін повідомленнями',
        search: 'Пошук і журнали',
        storage: 'Об’єктне сховище',
        proxy: 'Зворотні проксі та ingress',
        observability: 'Метрики та трасування',
        mail: 'Пошта (локальна розробка)',
        admin: 'Адмін-інтерфейси та BI',
      },
      presets: {
        stackWeb: 'Postgres + Redis + Nginx',
        stackMern: 'MongoDB + Redis + Nginx',
        stackObserve: 'Prometheus + Grafana + Loki',
        stackMessaging: 'RabbitMQ + Redis',
        stackSearch: 'Meilisearch + Postgres',
        clear: 'Очистити',
      },
      services: {
        valkey: 'Valkey (сумісний з Redis)',
        redpanda: 'Redpanda (сумісна з Kafka)',
        minio: 'MinIO (сумісний з S3)',
        'dynamodb-local': 'Amazon DynamoDB Local',
        mailpit: 'Mailpit (перехоплення SMTP)',
        vault: 'HashiCorp Vault (режим розробки)',
        gotenberg: 'Gotenberg (Chromium / PDF)',
      },
    },
  },
  cs: {
    nav: 'Generátor Docker Compose',
    dashTitle: 'Generátor Docker Compose',
    dashDesc:
      'Vyberte databáze, cache, fronty, proxy a observabilitu; exportujte docker-compose.yml pro lokální stacky.',
    dcg: {
      title: 'Generátor Docker Compose',
      subtitle:
        'Vyberte populární databáze, cache, fronty zpráv, reverzní proxy a observabilitu — zkopírujte funkční docker-compose.yml pro lokální vývoj.',
      searchPlaceholder: 'Hledat (postgres, redis, kafka, nginx, grafana…)',
      selectedLabel: 'Služby',
      selectedCount: '{count, plural, one {# služba} few {# služby} many {# služeb} other {# služeb}}',
      copy: 'Kopírovat',
      copied: 'Zkopírováno!',
      download: 'Stáhnout',
      emptyState: 'Vyberte jednu nebo více služeb pro vygenerování Compose YAML.',
      hintPorts:
        'Výchozí porty hostitele snižují konflikty; upravte je, pokud Docker nahlásí obsazený port. Před sdílenými prostředími nahraďte demo hesla.',
      categories: {
        databases: 'Databáze a úložiště',
        cache: 'Cache a in-memory',
        queues: 'Fronty a messaging',
        search: 'Vyhledávání a logy',
        storage: 'Objektové úložiště',
        proxy: 'Reverzní proxy a ingress',
        observability: 'Metriky a trasování',
        mail: 'E-mail (lokální vývoj)',
        admin: 'Admin a BI rozhraní',
      },
      presets: {
        stackWeb: 'Postgres + Redis + Nginx',
        stackMern: 'MongoDB + Redis + Nginx',
        stackObserve: 'Prometheus + Grafana + Loki',
        stackMessaging: 'RabbitMQ + Redis',
        stackSearch: 'Meilisearch + Postgres',
        clear: 'Vymazat',
      },
      services: {
        valkey: 'Valkey (kompatibilní s Redis)',
        redpanda: 'Redpanda (kompatibilní s Kafka)',
        minio: 'MinIO (kompatibilní se S3)',
        'dynamodb-local': 'Amazon DynamoDB Local',
        mailpit: 'Mailpit (zachycení SMTP)',
        vault: 'HashiCorp Vault (dev server)',
        gotenberg: 'Gotenberg (Chromium / PDF)',
      },
    },
  },
  da: {
    nav: 'Docker Compose-generator',
    dashTitle: 'Docker Compose-generator',
    dashDesc:
      'Vælg databaser, caches, køer, proxyer og observabilitets-images; eksporter docker-compose.yml til lokale stacks.',
    dcg: {
      title: 'Docker Compose-generator',
      subtitle:
        'Vælg populære databaser, caches, beskedkøer, reverse proxyer og observabilitet — kopiér en docker-compose.yml klar til lokal udvikling.',
      searchPlaceholder: 'Søg (postgres, redis, kafka, nginx, grafana…)',
      selectedLabel: 'Tjenester',
      selectedCount: '{count, plural, one {# tjeneste} other {# tjenester}}',
      copy: 'Kopiér',
      copied: 'Kopieret!',
      download: 'Download',
      emptyState: 'Vælg én eller flere tjenester for at generere Compose-YAML.',
      hintPorts:
        'Standardværtsporte minimerer konflikter; justér hvis Docker melder port i brug. Udskift demo-adgangskoder før delte miljøer.',
      categories: {
        databases: 'Databaser og lagring',
        cache: 'Cache og in-memory',
        queues: 'Køer og messaging',
        search: 'Søgning og logs',
        storage: 'Objektlager',
        proxy: 'Reverse proxy og ingress',
        observability: 'Metrics og tracing',
        mail: 'E-mail (lokal udvikling)',
        admin: 'Admin- og BI-grænseflader',
      },
      presets: {
        stackWeb: 'Postgres + Redis + Nginx',
        stackMern: 'MongoDB + Redis + Nginx',
        stackObserve: 'Prometheus + Grafana + Loki',
        stackMessaging: 'RabbitMQ + Redis',
        stackSearch: 'Meilisearch + Postgres',
        clear: 'Ryd',
      },
      services: {
        valkey: 'Valkey (Redis-kompatibel)',
        redpanda: 'Redpanda (Kafka-kompatibel)',
        minio: 'MinIO (S3-kompatibel)',
        'dynamodb-local': 'Amazon DynamoDB Local',
        mailpit: 'Mailpit (SMTP-optagelse)',
        vault: 'HashiCorp Vault (dev-server)',
        gotenberg: 'Gotenberg (Chromium / PDF)',
      },
    },
  },
  sv: {
    nav: 'Docker Compose-generator',
    dashTitle: 'Docker Compose-generator',
    dashDesc:
      'Välj databaser, cache, köer, proxys och observabilitetsbilder; exportera docker-compose.yml för lokala stackar.',
    dcg: {
      title: 'Docker Compose-generator',
      subtitle:
        'Välj populära databaser, cache, meddelandeköer, omvända proxys och observabilitet — kopiera en docker-compose.yml redo för lokal utveckling.',
      searchPlaceholder: 'Sök (postgres, redis, kafka, nginx, grafana…)',
      selectedLabel: 'Tjänster',
      selectedCount: '{count, plural, one {# tjänst} other {# tjänster}}',
      copy: 'Kopiera',
      copied: 'Kopierat!',
      download: 'Ladda ner',
      emptyState: 'Välj en eller flera tjänster för att generera Compose-YAML.',
      hintPorts:
        'Standardvärdportar minskar krockar; ändra om Docker rapporterar upptagen port. Byt ut demolösenord före delade miljöer.',
      categories: {
        databases: 'Databaser och lagring',
        cache: 'Cache och in-memory',
        queues: 'Köer och meddelanden',
        search: 'Sökning och loggar',
        storage: 'Objektlagring',
        proxy: 'Omvända proxys och ingress',
        observability: 'Mätvärden och spårning',
        mail: 'E-post (lokal utveckling)',
        admin: 'Admin- och BI-gränssnitt',
      },
      presets: {
        stackWeb: 'Postgres + Redis + Nginx',
        stackMern: 'MongoDB + Redis + Nginx',
        stackObserve: 'Prometheus + Grafana + Loki',
        stackMessaging: 'RabbitMQ + Redis',
        stackSearch: 'Meilisearch + Postgres',
        clear: 'Rensa',
      },
      services: {
        valkey: 'Valkey (Redis-kompatibel)',
        redpanda: 'Redpanda (Kafka-kompatibel)',
        minio: 'MinIO (S3-kompatibel)',
        'dynamodb-local': 'Amazon DynamoDB Local',
        mailpit: 'Mailpit (SMTP-insamling)',
        vault: 'HashiCorp Vault (dev-server)',
        gotenberg: 'Gotenberg (Chromium / PDF)',
      },
    },
  },
  nb: {
    nav: 'Docker Compose-generator',
    dashTitle: 'Docker Compose-generator',
    dashDesc:
      'Velg databaser, hurtigminne, køer, proxyer og observabilitetsbilder; eksporter docker-compose.yml for lokale stakk.',
    dcg: {
      title: 'Docker Compose-generator',
      subtitle:
        'Velg populære databaser, cache, meldingskøer, omvendte proxyer og observabilitet — kopier en docker-compose.yml klar for lokal utvikling.',
      searchPlaceholder: 'Søk (postgres, redis, kafka, nginx, grafana…)',
      selectedLabel: 'Tjenester',
      selectedCount: '{count, plural, one {# tjeneste} other {# tjenester}}',
      copy: 'Kopier',
      copied: 'Kopiert!',
      download: 'Last ned',
      emptyState: 'Velg én eller flere tjenester for å generere Compose-YAML.',
      hintPorts:
        'Standardvertsporter reduserer konflikter; endre hvis Docker melder opptatt port. Bytt demopassord før delte miljøer.',
      categories: {
        databases: 'Databaser og lagring',
        cache: 'Cache og in-memory',
        queues: 'Køer og meldinger',
        search: 'Søk og logger',
        storage: 'Objektlagring',
        proxy: 'Omvendte proxyer og ingress',
        observability: 'Målinger og sporing',
        mail: 'E-post (lokal utvikling)',
        admin: 'Admin- og BI-grensesnitt',
      },
      presets: {
        stackWeb: 'Postgres + Redis + Nginx',
        stackMern: 'MongoDB + Redis + Nginx',
        stackObserve: 'Prometheus + Grafana + Loki',
        stackMessaging: 'RabbitMQ + Redis',
        stackSearch: 'Meilisearch + Postgres',
        clear: 'Tøm',
      },
      services: {
        valkey: 'Valkey (Redis-kompatibel)',
        redpanda: 'Redpanda (Kafka-kompatibel)',
        minio: 'MinIO (S3-kompatibel)',
        'dynamodb-local': 'Amazon DynamoDB Local',
        mailpit: 'Mailpit (SMTP-fangst)',
        vault: 'HashiCorp Vault (dev-server)',
        gotenberg: 'Gotenberg (Chromium / PDF)',
      },
    },
  },
  el: {
    nav: 'Δημιουργός Docker Compose',
    dashTitle: 'Δημιουργός Docker Compose',
    dashDesc:
      'Επιλέξτε βάσεις δεδομένων, cache, ουρές, proxy και εικόνες παρατηρησιμότητας· εξάγετε docker-compose.yml για τοπικές στοίβες.',
    dcg: {
      title: 'Δημιουργός Docker Compose',
      subtitle:
        'Επιλέξτε δημοφιλείς βάσεις δεδομένων, cache, ουρές μηνυμάτων, reverse proxy και παρατηρησιμότητα — αντιγράψτε ένα docker-compose.yml έτοιμο για τοπική ανάπτυξη.',
      searchPlaceholder: 'Αναζήτηση (postgres, redis, kafka, nginx, grafana…)',
      selectedLabel: 'Υπηρεσίες',
      selectedCount: '{count, plural, one {# υπηρεσία} other {# υπηρεσίες}}',
      copy: 'Αντιγραφή',
      copied: 'Αντιγράφηκε!',
      download: 'Λήψη',
      emptyState: 'Επιλέξτε μία ή περισσότερες υπηρεσίες για δημιουργία YAML Compose.',
      hintPorts:
        'Οι προεπιλεγμένες θύρες μειώνουν συγκρούσεις· αλλάξτε τις αν το Docker αναφέρει δέσμευση. Αντικαταστήστε κωδικούς επίδειξης πριν από κοινά περιβάλλοντα.',
      categories: {
        databases: 'Βάσεις δεδομένων και αποθήκευση',
        cache: 'Cache και in-memory',
        queues: 'Ουρές και ανταλλαγή μηνυμάτων',
        search: 'Αναζήτηση και αρχεία καταγραφής',
        storage: 'Αποθήκευση αντικειμένων',
        proxy: 'Reverse proxy και ingress',
        observability: 'Μετρήσεις και ιχνηλάτηση',
        mail: 'Ηλεκτρονικό ταχυδρομείο (τοπική ανάπτυξη)',
        admin: 'Διαχειριστικές και BI διεπαφές',
      },
      presets: {
        stackWeb: 'Postgres + Redis + Nginx',
        stackMern: 'MongoDB + Redis + Nginx',
        stackObserve: 'Prometheus + Grafana + Loki',
        stackMessaging: 'RabbitMQ + Redis',
        stackSearch: 'Meilisearch + Postgres',
        clear: 'Εκκαθάριση',
      },
      services: {
        valkey: 'Valkey (συμβατό με Redis)',
        redpanda: 'Redpanda (συμβατό με Kafka)',
        minio: 'MinIO (συμβατό με S3)',
        'dynamodb-local': 'Amazon DynamoDB Local',
        mailpit: 'Mailpit (καταγραφή SMTP)',
        vault: 'HashiCorp Vault (διακομιστής ανάπτυξης)',
        gotenberg: 'Gotenberg (Chromium / PDF)',
      },
    },
  },
  tr: {
    nav: 'Docker Compose Oluşturucu',
    dashTitle: 'Docker Compose Oluşturucu',
    dashDesc:
      'Veritabanları, önbellek, kuyruklar, proxy ve gözlemlenebilirlik görüntülerini seçin; yerel yığınlar için docker-compose.yml dışa aktarın.',
    dcg: {
      title: 'Docker Compose Oluşturucu',
      subtitle:
        'Popüler veritabanları, önbellek, mesaj kuyrukları, ters proxy ve gözlemlenebilirlik seçin — yerel geliştirme için hazır docker-compose.yml kopyalayın.',
      searchPlaceholder: 'Ara (postgres, redis, kafka, nginx, grafana…)',
      selectedLabel: 'Hizmetler',
      selectedCount: '{count, plural, one {# hizmet} other {# hizmet}}',
      copy: 'Kopyala',
      copied: 'Kopyalandı!',
      download: 'İndir',
      emptyState: 'Compose YAML üretmek için bir veya daha fazla hizmet seçin.',
      hintPorts:
        'Varsayılan ana bilgisayar bağlantı noktaları çakışmaları azaltır; Docker bağlama hatası verirse değiştirin. Paylaşılan ortamlardan önce demo parolalarını değiştirin.',
      categories: {
        databases: 'Veritabanları ve depolar',
        cache: 'Önbellek ve bellek içi',
        queues: 'Kuyruklar ve mesajlaşma',
        search: 'Arama ve günlükler',
        storage: 'Nesne depolama',
        proxy: 'Ters proxy ve ingress',
        observability: 'Metrikler ve izleme',
        mail: 'E-posta (yerel geliştirme)',
        admin: 'Yönetim ve BI arayüzleri',
      },
      presets: {
        stackWeb: 'Postgres + Redis + Nginx',
        stackMern: 'MongoDB + Redis + Nginx',
        stackObserve: 'Prometheus + Grafana + Loki',
        stackMessaging: 'RabbitMQ + Redis',
        stackSearch: 'Meilisearch + Postgres',
        clear: 'Temizle',
      },
      services: {
        valkey: 'Valkey (Redis uyumlu)',
        redpanda: 'Redpanda (Kafka uyumlu)',
        minio: 'MinIO (S3 uyumlu)',
        'dynamodb-local': 'Amazon DynamoDB Local',
        mailpit: 'Mailpit (SMTP yakalama)',
        vault: 'HashiCorp Vault (geliştirme sunucusu)',
        gotenberg: 'Gotenberg (Chromium / PDF)',
      },
    },
  },
  vi: {
    nav: 'Trình tạo Docker Compose',
    dashTitle: 'Trình tạo Docker Compose',
    dashDesc:
      'Chọn cơ sở dữ liệu, bộ nhớ đệm, hàng đợi, proxy và image quan sát; xuất docker-compose.yml cho stack cục bộ.',
    dcg: {
      title: 'Trình tạo Docker Compose',
      subtitle:
        'Chọn cơ sở dữ liệu, cache, hàng đợi tin nhắn, reverse proxy và quan sát — sao chép docker-compose.yml sẵn sàng cho phát triển cục bộ.',
      searchPlaceholder: 'Tìm (postgres, redis, kafka, nginx, grafana…)',
      selectedLabel: 'Dịch vụ',
      selectedCount: '{count, plural, other {# dịch vụ}}',
      copy: 'Sao chép',
      copied: 'Đã sao chép!',
      download: 'Tải xuống',
      emptyState: 'Chọn một hoặc nhiều dịch vụ để tạo YAML Compose.',
      hintPorts:
        'Cổng máy chủ mặc định giảm xung đột; chỉnh nếu Docker báo cổng đã dùng. Đổi mật khẩu demo trước môi trường dùng chung.',
      categories: {
        databases: 'Cơ sở dữ liệu & lưu trữ',
        cache: 'Cache & trong bộ nhớ',
        queues: 'Hàng đợi & tin nhắn',
        search: 'Tìm kiếm & nhật ký',
        storage: 'Lưu trữ đối tượng',
        proxy: 'Reverse proxy & ingress',
        observability: 'Số liệu & tracing',
        mail: 'Email (phát triển cục bộ)',
        admin: 'Giao diện quản trị & BI',
      },
      presets: {
        stackWeb: 'Postgres + Redis + Nginx',
        stackMern: 'MongoDB + Redis + Nginx',
        stackObserve: 'Prometheus + Grafana + Loki',
        stackMessaging: 'RabbitMQ + Redis',
        stackSearch: 'Meilisearch + Postgres',
        clear: 'Xóa',
      },
      services: {
        valkey: 'Valkey (tương thích Redis)',
        redpanda: 'Redpanda (tương thích Kafka)',
        minio: 'MinIO (tương thích S3)',
        'dynamodb-local': 'Amazon DynamoDB Local',
        mailpit: 'Mailpit (bắt SMTP)',
        vault: 'HashiCorp Vault (máy chủ dev)',
        gotenberg: 'Gotenberg (Chromium / PDF)',
      },
    },
  },
  id: {
    nav: 'Generator Docker Compose',
    dashTitle: 'Generator Docker Compose',
    dashDesc:
      'Pilih basis data, cache, antrean, proxy, dan image observabilitas; ekspor docker-compose.yml untuk stack lokal.',
    dcg: {
      title: 'Generator Docker Compose',
      subtitle:
        'Pilih basis data populer, cache, antrean pesan, reverse proxy, dan observabilitas — salin docker-compose.yml siap pakai untuk pengembangan lokal.',
      searchPlaceholder: 'Cari (postgres, redis, kafka, nginx, grafana…)',
      selectedLabel: 'Layanan',
      selectedCount: '{count, plural, other {# layanan}}',
      copy: 'Salin',
      copied: 'Disalin!',
      download: 'Unduh',
      emptyState: 'Pilih satu atau lebih layanan untuk menghasilkan YAML Compose.',
      hintPorts:
        'Port host bawaan mengurangi bentrok; ubah jika Docker melaporkan port terpakai. Ganti kata sandi demo sebelum lingkungan bersama.',
      categories: {
        databases: 'Basis data & penyimpanan',
        cache: 'Cache & dalam memori',
        queues: 'Antrean & perpesanan',
        search: 'Pencarian & log',
        storage: 'Penyimpanan objek',
        proxy: 'Reverse proxy & ingress',
        observability: 'Metrik & pelacakan',
        mail: 'Email (pengembangan lokal)',
        admin: 'Antarmuka admin & BI',
      },
      presets: {
        stackWeb: 'Postgres + Redis + Nginx',
        stackMern: 'MongoDB + Redis + Nginx',
        stackObserve: 'Prometheus + Grafana + Loki',
        stackMessaging: 'RabbitMQ + Redis',
        stackSearch: 'Meilisearch + Postgres',
        clear: 'Bersihkan',
      },
      services: {
        valkey: 'Valkey (kompatibel Redis)',
        redpanda: 'Redpanda (kompatibel Kafka)',
        minio: 'MinIO (kompatibel S3)',
        'dynamodb-local': 'Amazon DynamoDB Local',
        mailpit: 'Mailpit (tangkap SMTP)',
        vault: 'HashiCorp Vault (server dev)',
        gotenberg: 'Gotenberg (Chromium / PDF)',
      },
    },
  },
  ms: {
    nav: 'Penjana Docker Compose',
    dashTitle: 'Penjana Docker Compose',
    dashDesc:
      'Pilih pangkalan data, cache, baris gilir, proksi dan imej kebolehcerapan; eksport docker-compose.yml untuk setempat.',
    dcg: {
      title: 'Penjana Docker Compose',
      subtitle:
        'Pilih pangkalan data popular, cache, baris gilir mesej, proksi songsang dan kebolehcerapan — salin docker-compose.yml untuk pembangunan setempat.',
      searchPlaceholder: 'Cari (postgres, redis, kafka, nginx, grafana…)',
      selectedLabel: 'Perkhidmatan',
      selectedCount: '{count, plural, other {# perkhidmatan}}',
      copy: 'Salin',
      copied: 'Disalin!',
      download: 'Muat turun',
      emptyState: 'Pilih satu atau lebih perkhidmatan untuk menjana YAML Compose.',
      hintPorts:
        'Port hos lalai mengurangkan konflik; ubah jika Docker melaporkan port digunakan. Ganti kata laluan demo sebelum persekitaran dikongsi.',
      categories: {
        databases: 'Pangkalan data & storan',
        cache: 'Cache & dalam memori',
        queues: 'Baris gilir & pemesejan',
        search: 'Carian & log',
        storage: 'Storan objek',
        proxy: 'Proksi songsang & ingress',
        observability: 'Metrik & penjejakan',
        mail: 'E-mel (pembangunan setempat)',
        admin: 'Antara muka pentadbir & BI',
      },
      presets: {
        stackWeb: 'Postgres + Redis + Nginx',
        stackMern: 'MongoDB + Redis + Nginx',
        stackObserve: 'Prometheus + Grafana + Loki',
        stackMessaging: 'RabbitMQ + Redis',
        stackSearch: 'Meilisearch + Postgres',
        clear: 'Kosongkan',
      },
      services: {
        valkey: 'Valkey (serasi Redis)',
        redpanda: 'Redpanda (serasi Kafka)',
        minio: 'MinIO (serasi S3)',
        'dynamodb-local': 'Amazon DynamoDB Local',
        mailpit: 'Mailpit (tangkap SMTP)',
        vault: 'HashiCorp Vault (pelayan dev)',
        gotenberg: 'Gotenberg (Chromium / PDF)',
      },
    },
  },
  ja: {
    nav: 'Docker Compose ジェネレーター',
    dashTitle: 'Docker Compose ジェネレーター',
    dashDesc:
      'データベース、キャッシュ、キュー、プロキシ、可観測性イメージを選び、ローカル用の docker-compose.yml を出力します。',
    dcg: {
      title: 'Docker Compose ジェネレーター',
      subtitle:
        '代表的なデータベース、キャッシュ、メッセージキュー、リバースプロキシ、可観測性を選んで、ローカル開発向けの docker-compose.yml をコピーできます。',
      searchPlaceholder: '検索（postgres, redis, kafka, nginx, grafana…）',
      selectedLabel: 'サービス',
      selectedCount: '{count, plural, other {# 件のサービス}}',
      copy: 'コピー',
      copied: 'コピーしました',
      download: 'ダウンロード',
      emptyState: 'Compose YAML を生成するサービスを 1 つ以上選んでください。',
      hintPorts:
        'デフォルトのホストポートは衝突を避ける配置です。バインドエラー時は変更してください。共有環境ではデモ用パスワードを必ず置き換えてください。',
      categories: {
        databases: 'データベースとストア',
        cache: 'キャッシュ・インメモリ',
        queues: 'キューとメッセージング',
        search: '検索とログ',
        storage: 'オブジェクトストレージ',
        proxy: 'リバースプロキシと Ingress',
        observability: 'メトリクスとトレース',
        mail: 'メール（ローカル開発）',
        admin: '管理画面と BI',
      },
      presets: {
        stackWeb: 'Postgres + Redis + Nginx',
        stackMern: 'MongoDB + Redis + Nginx',
        stackObserve: 'Prometheus + Grafana + Loki',
        stackMessaging: 'RabbitMQ + Redis',
        stackSearch: 'Meilisearch + Postgres',
        clear: 'クリア',
      },
      services: {
        valkey: 'Valkey（Redis 互換）',
        redpanda: 'Redpanda（Kafka 互換）',
        minio: 'MinIO（S3 互換）',
        'dynamodb-local': 'Amazon DynamoDB Local',
        mailpit: 'Mailpit（SMTP キャプチャ）',
        vault: 'HashiCorp Vault（開発サーバー）',
        gotenberg: 'Gotenberg（Chromium / PDF）',
      },
    },
  },
  ko: {
    nav: 'Docker Compose 생성기',
    dashTitle: 'Docker Compose 생성기',
    dashDesc:
      '데이터베이스, 캐시, 큐, 프록시, 관측 가능성 이미지를 선택하고 로컬 스택용 docker-compose.yml을 보냅니다.',
    dcg: {
      title: 'Docker Compose 생성기',
      subtitle:
        '인기 있는 데이터베이스, 캐시, 메시지 큐, 리버스 프록시, 관측 가능성을 선택해 로컬 개발용 docker-compose.yml 을 복사하세요.',
      searchPlaceholder: '검색 (postgres, redis, kafka, nginx, grafana…)',
      selectedLabel: '서비스',
      selectedCount: '{count, plural, other {#개 서비스}}',
      copy: '복사',
      copied: '복사됨!',
      download: '다운로드',
      emptyState: 'Compose YAML 을 생성할 서비스를 하나 이상 선택하세요.',
      hintPorts:
        '기본 호스트 포트는 충돌을 줄이도록 배치되어 있습니다. 바인드 오류 시 변경하세요. 공유 환경 전에 데모 비밀번호를 교체하세요.',
      categories: {
        databases: '데이터베이스 및 저장소',
        cache: '캐시 및 인메모리',
        queues: '큐 및 메시징',
        search: '검색 및 로그',
        storage: '오브젝트 스토리지',
        proxy: '리버스 프록시 및 Ingress',
        observability: '메트릭 및 추적',
        mail: '이메일(로컬 개발)',
        admin: '관리 및 BI UI',
      },
      presets: {
        stackWeb: 'Postgres + Redis + Nginx',
        stackMern: 'MongoDB + Redis + Nginx',
        stackObserve: 'Prometheus + Grafana + Loki',
        stackMessaging: 'RabbitMQ + Redis',
        stackSearch: 'Meilisearch + Postgres',
        clear: '지우기',
      },
      services: {
        valkey: 'Valkey(Redis 호환)',
        redpanda: 'Redpanda(Kafka 호환)',
        minio: 'MinIO(S3 호환)',
        'dynamodb-local': 'Amazon DynamoDB Local',
        mailpit: 'Mailpit(SMTP 캡처)',
        vault: 'HashiCorp Vault(개발 서버)',
        gotenberg: 'Gotenberg(Chromium / PDF)',
      },
    },
  },
  zh: {
    nav: 'Docker Compose 生成器',
    dashTitle: 'Docker Compose 生成器',
    dashDesc: '选择数据库、缓存、队列、代理与可观测性镜像；导出用于本地栈的 docker-compose.yml。',
    dcg: {
      title: 'Docker Compose 生成器',
      subtitle:
        '选择常用数据库、缓存、消息队列、反向代理与可观测性组件——复制即可用于本地开发的 docker-compose.yml。',
      searchPlaceholder: '搜索（postgres、redis、kafka、nginx、grafana…）',
      selectedLabel: '服务',
      selectedCount: '{count, plural, other {# 个服务}}',
      copy: '复制',
      copied: '已复制！',
      download: '下载',
      emptyState: '请选择一个或多个服务以生成 Compose YAML。',
      hintPorts:
        '默认主机端口已错开以降低冲突；若 Docker 提示端口占用请修改。在共享环境前务必替换演示密码。',
      categories: {
        databases: '数据库与存储',
        cache: '缓存与内存',
        queues: '队列与消息',
        search: '搜索与日志',
        storage: '对象存储',
        proxy: '反向代理与入口',
        observability: '指标与追踪',
        mail: '邮件（本地开发）',
        admin: '管理与 BI 界面',
      },
      presets: {
        stackWeb: 'Postgres + Redis + Nginx',
        stackMern: 'MongoDB + Redis + Nginx',
        stackObserve: 'Prometheus + Grafana + Loki',
        stackMessaging: 'RabbitMQ + Redis',
        stackSearch: 'Meilisearch + Postgres',
        clear: '清空',
      },
      services: {
        valkey: 'Valkey（兼容 Redis）',
        redpanda: 'Redpanda（兼容 Kafka）',
        minio: 'MinIO（兼容 S3）',
        'dynamodb-local': 'Amazon DynamoDB Local',
        mailpit: 'Mailpit（SMTP 捕获）',
        vault: 'HashiCorp Vault（开发模式）',
        gotenberg: 'Gotenberg（Chromium / PDF）',
      },
    },
  },
  ar: {
    nav: 'مولّد Docker Compose',
    dashTitle: 'مولّد Docker Compose',
    dashDesc:
      'اختر قواعد البيانات والتخزين المؤقت والطوابير والوكلاء وصور المراقبة؛ صدّر docker-compose.yml للمكدسات المحلية.',
    dcg: {
      title: 'مولّد Docker Compose',
      subtitle:
        'اختر قواعد بيانات شائعة وتخزينًا مؤقتًا وطوابير رسائل ووكلاء عكسيين ومراقبة — انسخ docker-compose.yml جاهزًا للتطوير المحلي.',
      searchPlaceholder: 'بحث (postgres، redis، kafka، nginx، grafana…)',
      selectedLabel: 'الخدمات',
      selectedCount: '{count, plural, one {خدمة واحدة} other {# خدمات}}',
      copy: 'نسخ',
      copied: 'تم النسخ!',
      download: 'تنزيل',
      emptyState: 'اختر خدمة واحدة أو أكثر لإنشاء YAML لـ Compose.',
      hintPorts:
        'تم تباعد منافذ المضيف الافتراضية لتقليل التعارض؛ غيّرها إذا أبلغ Docker عن تعارض. استبدل كلمات مرور العرض قبل البيئات المشتركة.',
      categories: {
        databases: 'قواعد البيانات والتخزين',
        cache: 'التخزين المؤقت والذاكرة',
        queues: 'الطوابير والمراسلة',
        search: 'البحث والسجلات',
        storage: 'تخزين الكائنات',
        proxy: 'الوكلاء العكسيون والدخول',
        observability: 'المقاييس والتتبع',
        mail: 'البريد (تطوير محلي)',
        admin: 'واجهات الإدارة وذكاء الأعمال',
      },
      presets: {
        stackWeb: 'Postgres + Redis + Nginx',
        stackMern: 'MongoDB + Redis + Nginx',
        stackObserve: 'Prometheus + Grafana + Loki',
        stackMessaging: 'RabbitMQ + Redis',
        stackSearch: 'Meilisearch + Postgres',
        clear: 'مسح',
      },
      services: {
        valkey: 'Valkey (متوافق مع Redis)',
        redpanda: 'Redpanda (متوافق مع Kafka)',
        minio: 'MinIO (متوافق مع S3)',
        'dynamodb-local': 'Amazon DynamoDB Local',
        mailpit: 'Mailpit (التقاط SMTP)',
        vault: 'HashiCorp Vault (خادم تطوير)',
        gotenberg: 'Gotenberg (Chromium / PDF)',
      },
    },
  },
  fa: {
    nav: 'تولیدکننده Docker Compose',
    dashTitle: 'تولیدکننده Docker Compose',
    dashDesc:
      'پایگاه‌داده، کش، صف، پروکسی و تصاویر قابلیت مشاهده را انتخاب کنید؛ docker-compose.yml را برای پشته‌های محلی صادر کنید.',
    dcg: {
      title: 'تولیدکننده Docker Compose',
      subtitle:
        'پایگاه‌داده‌های رایج، کش، صف پیام، پروکسی معکوس و قابلیت مشاهده را انتخاب کنید — docker-compose.yml آماده توسعه محلی را کپی کنید.',
      searchPlaceholder: 'جستجو (postgres، redis، kafka، nginx، grafana…)',
      selectedLabel: 'سرویس‌ها',
      selectedCount: '{count, plural, one {# سرویس} other {# سرویس}}',
      copy: 'کپی',
      copied: 'کپی شد!',
      download: 'دانلود',
      emptyState: 'برای تولید YAML Compose یک یا چند سرویس انتخاب کنید.',
      hintPorts:
        'پورت‌های میزبان پیش‌فرض برای کاهش تداخل فاصله دارند؛ در صورت خطای اتصال تغییر دهید. قبل از محیط‌های اشتراکی رمزهای نمایشی را عوض کنید.',
      categories: {
        databases: 'پایگاه‌داده و ذخیره‌سازی',
        cache: 'کش و درون‌حافظه',
        queues: 'صف و پیام‌رسانی',
        search: 'جستجو و گزارش‌ها',
        storage: 'ذخیره‌سازی شیء',
        proxy: 'پروکسی معکوس و ingress',
        observability: 'معیارها و ردیابی',
        mail: 'ایمیل (توسعه محلی)',
        admin: 'رابط‌های مدیریت و BI',
      },
      presets: {
        stackWeb: 'Postgres + Redis + Nginx',
        stackMern: 'MongoDB + Redis + Nginx',
        stackObserve: 'Prometheus + Grafana + Loki',
        stackMessaging: 'RabbitMQ + Redis',
        stackSearch: 'Meilisearch + Postgres',
        clear: 'پاک کردن',
      },
      services: {
        valkey: 'Valkey (سازگار با Redis)',
        redpanda: 'Redpanda (سازگار با Kafka)',
        minio: 'MinIO (سازگار با S3)',
        'dynamodb-local': 'Amazon DynamoDB Local',
        mailpit: 'Mailpit (ضبط SMTP)',
        vault: 'HashiCorp Vault (سرور توسعه)',
        gotenberg: 'Gotenberg (Chromium / PDF)',
      },
    },
  },
  af: {
    nav: 'Docker Compose-Generator',
    dashTitle: 'Docker Compose-Generator',
    dashDesc:
      "Kies databasisse, kasse, toue, proxy's en waarneembaarheidbeelde; voer docker-compose.yml uit vir plaaslike stapel.",
    dcg: {
      title: 'Docker Compose-Generator',
      subtitle:
        "Kies gewilde databasisse, kasse, boodskaptoue, omgekeerde proxy's en waarneembaarheid — kopieer 'n docker-compose.yml vir plaaslike ontwikkeling.",
      searchPlaceholder: 'Soek (postgres, redis, kafka, nginx, grafana…)',
      selectedLabel: 'Dienste',
      selectedCount: '{count, plural, one {# diens} other {# dienste}}',
      copy: 'Kopieer',
      copied: 'Gekopieer!',
      download: 'Aflaai',
      emptyState: "Kies een of meer dienste om Compose-YAML te genereer.",
      hintPorts:
        "Verstek gasheerpoorte verminder botsings; verander as Docker 'n bindingfout meld. Vervang demo-wagwoorde voor gedeelde omgewings.",
      categories: {
        databases: 'Databasisse en berging',
        cache: 'Kas en in-geheue',
        queues: 'Toue en boodskappe',
        search: 'Soek en logs',
        storage: 'Voorwerpherging',
        proxy: "Omgekeerde proxy's en ingress",
        observability: 'Metrieke en nasporing',
        mail: 'E-pos (plaaslike ontwikkeling)',
        admin: 'Admin- en BI-koppelvlakke',
      },
      presets: {
        stackWeb: 'Postgres + Redis + Nginx',
        stackMern: 'MongoDB + Redis + Nginx',
        stackObserve: 'Prometheus + Grafana + Loki',
        stackMessaging: 'RabbitMQ + Redis',
        stackSearch: 'Meilisearch + Postgres',
        clear: 'Maak skoon',
      },
      services: {
        valkey: 'Valkey (Redis-versoenbaar)',
        redpanda: 'Redpanda (Kafka-versoenbaar)',
        minio: 'MinIO (S3-versoenbaar)',
        'dynamodb-local': 'Amazon DynamoDB Local',
        mailpit: 'Mailpit (SMTP-vangs)',
        vault: 'HashiCorp Vault (ontwikkelaarbediener)',
        gotenberg: 'Gotenberg (Chromium / PDF)',
      },
    },
  },
  ca: {
    nav: 'Generador Docker Compose',
    dashTitle: 'Generador Docker Compose',
    dashDesc:
      'Trieu bases de dades, memòries cau, cues, proxies i imatges d’observabilitat; exporteu un docker-compose.yml per a piles locals.',
    dcg: {
      title: 'Generador Docker Compose',
      subtitle:
        'Trieu bases de dades populars, memòries cau, cues de missatges, proxies inversos i observabilitat — copieu un docker-compose.yml llest per al desenvolupament local.',
      searchPlaceholder: 'Cerca (postgres, redis, kafka, nginx, grafana…)',
      selectedLabel: 'Serveis',
      selectedCount: '{count, plural, one {# servei} other {# serveis}}',
      copy: 'Copia',
      copied: 'Copiat!',
      download: 'Baixa',
      emptyState: 'Seleccioneu un o més serveis per generar el YAML de Compose.',
      hintPorts:
        'Els ports per defecte redueixen conflictes; canvieu-los si Docker informa d’un port en ús. Substituïu les contrasenyes de demostració abans d’entorns compartits.',
      categories: {
        databases: 'Bases de dades i emmagatzematge',
        cache: 'Memòria cau i en memòria',
        queues: 'Cues i missatgeria',
        search: 'Cerca i registres',
        storage: 'Emmagatzematge d’objectes',
        proxy: 'Proxies inversos i ingress',
        observability: 'Mètriques i traçat',
        mail: 'Correu (desenvolupament local)',
        admin: 'Interfícies d’administració i BI',
      },
      presets: {
        stackWeb: 'Postgres + Redis + Nginx',
        stackMern: 'MongoDB + Redis + Nginx',
        stackObserve: 'Prometheus + Grafana + Loki',
        stackMessaging: 'RabbitMQ + Redis',
        stackSearch: 'Meilisearch + Postgres',
        clear: 'Neteja',
      },
      services: {
        valkey: 'Valkey (compatible amb Redis)',
        redpanda: 'Redpanda (compatible amb Kafka)',
        minio: 'MinIO (compatible amb S3)',
        'dynamodb-local': 'Amazon DynamoDB Local',
        mailpit: 'Mailpit (captura SMTP)',
        vault: 'HashiCorp Vault (servidor de desenvolupament)',
        gotenberg: 'Gotenberg (Chromium / PDF)',
      },
    },
  },
}

for (const [locale, pack] of Object.entries(L)) {
  const file = path.join(messagesDir, `${locale}.json`)
  if (!fs.existsSync(file)) {
    console.warn('skip missing', locale)
    continue
  }
  const data = JSON.parse(fs.readFileSync(file, 'utf8'))
  data.Navigation = data.Navigation ?? {}
  data.Navigation.dockerComposeGenerator = pack.nav
  data.Dashboard = data.Dashboard ?? {}
  data.Dashboard.tools = data.Dashboard.tools ?? {}
  data.Dashboard.tools.dockerComposeGenerator = {
    title: pack.dashTitle,
    description: pack.dashDesc,
  }
  const merged = structuredClone(enDcg)
  deepMerge(merged, pack.dcg)
  data.DockerComposeGenerator = merged
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8')
  console.log('updated', locale)
}

console.log('done (en unchanged)')
