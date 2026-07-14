import * as yaml from 'js-yaml';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { parse as parseTOML, stringify as stringifyTOML } from 'smol-toml';

export type Format = 'json' | 'yaml' | 'toml' | 'xml';

export const FORMAT_LABELS: Record<Format, string> = {
  json: 'JSON',
  yaml: 'YAML',
  toml: 'TOML',
  xml: 'XML',
};

export const ALL_FORMATS: Format[] = ['json', 'yaml', 'toml', 'xml'];

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: true,
  parseTagValue: true,
  trimValues: true,
});

const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  format: true,
  indentBy: '  ',
  suppressEmptyNode: true,
});

function parseInput(input: string, format: Format): unknown {
  switch (format) {
    case 'json':
      return JSON.parse(input);
    case 'yaml':
      return yaml.load(input);
    case 'toml':
      return parseTOML(input);
    case 'xml': {
      const result = xmlParser.parse(input);
      return result;
    }
  }
}

function serializeOutput(value: unknown, format: Format): string {
  switch (format) {
    case 'json':
      return JSON.stringify(value, null, 2);
    case 'yaml':
      return yaml.dump(value, { indent: 2, lineWidth: -1, noRefs: true });
    case 'toml':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error('TOML requires a top-level object (table). Arrays and primitives are not supported as root values.');
      }
      return stringifyTOML(value as Record<string, unknown>);
    case 'xml': {
      const wrapped = typeof value === 'object' && value !== null && !Array.isArray(value) ? value : { root: value };
      return xmlBuilder.build(wrapped) as string;
    }
  }
}

export function convert(input: string, from: Format, to: Format): string {
  if (!input.trim()) return '';
  const parsed = parseInput(input.trim(), from);
  return serializeOutput(parsed, to);
}
