import type { Monaco } from '@monaco-editor/react';

let graphqlMonarchRegistered = false;

/** Minimal Monarch tokenizer so Monaco can highlight GraphQL (not bundled by default). */
export function registerGraphqlMonarch(monaco: Monaco) {
  if (graphqlMonarchRegistered) return;
  graphqlMonarchRegistered = true;

  monaco.languages.register({ id: 'graphql' });

  monaco.languages.setMonarchTokensProvider('graphql', {
    defaultToken: '',
    ignoreCase: false,
    tokenPostfix: '.graphql',

    keywords: [
      'query',
      'mutation',
      'subscription',
      'fragment',
      'on',
      'repeatable',
      'schema',
      'extend',
      'scalar',
      'type',
      'interface',
      'union',
      'enum',
      'input',
      'directive',
      'implements',
      'true',
      'false',
      'null',
    ],

    tokenizer: {
      root: [
        [/#.*$/, 'comment'],
        { include: '@whitespace' },
        [/@[_A-Za-z][_0-9A-Za-z]*/, 'annotation'],
        [/\$[_A-Za-z][_0-9A-Za-z]*/, 'variable.predefined'],
        [
          /[a-zA-Z_][\w$]*/,
          { cases: { '@keywords': 'keyword', '@default': 'type.identifier' } },
        ],
        [/[{}()\[\]]/, 'delimiter.bracket'],
        [/[!|&=]/, 'operator'],
        [/:/, 'operator'],
        [/-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/, 'number'],
        [/"/, 'string', '@stringDouble'],
      ],

      whitespace: [[/\s+/, 'white']],

      stringDouble: [
        [/[^\\"$]+/, 'string'],
        [/\$[_A-Za-z][_0-9A-Za-z]*/, 'variable.predefined'],
        [/\\./, 'string.escape'],
        [/"/, 'string', '@pop'],
      ],
    },
  });
}
