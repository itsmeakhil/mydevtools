/**
 * Adds JsonSchemaGenerator.editorLoading to every messages locale.
 * Run: node apps/web/scripts/patch-json-schema-editor-loading.cjs
 */
const fs = require('fs');
const path = require('path');

const messagesDir = path.join(__dirname, '../messages');

const editorLoading = {
  en: 'Loading editor…',
  fr: 'Chargement de l’éditeur…',
  es: 'Cargando el editor…',
  de: 'Editor wird geladen…',
  it: 'Caricamento editor…',
  pt: 'A carregar o editor…',
  'pt-BR': 'Carregando o editor…',
  nl: 'Editor laden…',
  sv: 'Läser in redigeraren…',
  nb: 'Laster inn redigeringsprogrammet…',
  da: 'Indlæser editor…',
  af: 'Laai redigeerder…',
  cs: 'Načítání editoru…',
  pl: 'Ładowanie edytora…',
  uk: 'Завантаження редактора…',
  ru: 'Загрузка редактора…',
  el: 'Φόρτωση επεξεργαστή…',
  tr: 'Editör yükleniyor…',
  ar: 'جاري تحميل المحرر…',
  fa: 'در حال بارگذاری ویرایشگر…',
  id: 'Memuat editor…',
  ms: 'Memuatkan editor…',
  vi: 'Đang tải trình soạn thảo…',
  ja: 'エディタを読み込み中…',
  ko: '편집기 로드 중…',
  zh: '正在加载编辑器…',
  ca: "S'està carregant l'editor…",
};

for (const file of fs.readdirSync(messagesDir)) {
  if (!file.endsWith('.json')) continue;
  const loc = file.replace(/\.json$/, '');
  const fp = path.join(messagesDir, file);
  const j = JSON.parse(fs.readFileSync(fp, 'utf8'));
  if (!j.JsonSchemaGenerator) continue;
  j.JsonSchemaGenerator.editorLoading =
    editorLoading[loc] || editorLoading.en;
  fs.writeFileSync(fp, JSON.stringify(j, null, 2) + '\n');
}

console.log('Patched editorLoading for', Object.keys(editorLoading).length, 'locales (+ defaults)');
