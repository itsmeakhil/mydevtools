/**
 * Merges json-schema-i18n.json into apps/web/messages/<locale>.json
 * Run: node apps/web/scripts/apply-json-schema-i18n.cjs
 */
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'json-schema-i18n.json');
const messagesDir = path.join(__dirname, '../messages');

const byLocale = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

for (const file of fs.readdirSync(messagesDir)) {
  if (!file.endsWith('.json')) continue;
  const loc = file.replace(/\.json$/, '');
  const patch = byLocale[loc];
  if (!patch) continue;

  const fp = path.join(messagesDir, file);
  const j = JSON.parse(fs.readFileSync(fp, 'utf8'));

  if (patch.Navigation?.jsonSchemaGenerator) {
    j.Navigation.jsonSchemaGenerator = patch.Navigation.jsonSchemaGenerator;
  }
  if (patch.Dashboard?.tools?.jsonSchemaGenerator) {
    j.Dashboard.tools.jsonSchemaGenerator = patch.Dashboard.tools.jsonSchemaGenerator;
  }
  if (patch.JsonSchemaGenerator) {
    j.JsonSchemaGenerator = patch.JsonSchemaGenerator;
  }

  fs.writeFileSync(fp, JSON.stringify(j, null, 2) + '\n');
}

console.log('Updated locales:', Object.keys(byLocale).join(', '));
