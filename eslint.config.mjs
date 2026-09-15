import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/out-tsc',
      '**/test-output',
      '**/vitest.config.*.timestamp*',
      '**/generated/**',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            // type:util (constants, formatting helpers) can be depended on by anything
            {
              sourceTag: 'type:util',
              onlyDependOnLibsWithTags: ['type:util'],
            },
            // domain contracts sit under everything except util
            {
              sourceTag: 'type:domain',
              onlyDependOnLibsWithTags: ['type:domain', 'type:util'],
            },
            // feature libs (connectors, auth, rules-engine, notifications) never depend on
            // each other directly -- only on domain and util
            {
              sourceTag: 'type:feature',
              onlyDependOnLibsWithTags: ['type:domain', 'type:util'],
            },
            // shared data/ui libs may use domain + util
            {
              sourceTag: 'type:data',
              onlyDependOnLibsWithTags: ['type:domain', 'type:util'],
            },
            {
              sourceTag: 'type:ui',
              onlyDependOnLibsWithTags: ['type:domain', 'type:util'],
            },
            // apps may depend on anything in their own scope, plus shared
            {
              sourceTag: 'scope:web',
              onlyDependOnLibsWithTags: ['scope:web', 'scope:shared'],
            },
            {
              sourceTag: 'scope:api',
              onlyDependOnLibsWithTags: ['scope:api', 'scope:shared'],
            },
            {
              sourceTag: 'scope:worker',
              onlyDependOnLibsWithTags: ['scope:worker', 'scope:shared'],
            },
            {
              sourceTag: 'scope:bot',
              onlyDependOnLibsWithTags: ['scope:bot', 'scope:shared'],
            },
            {
              sourceTag: 'scope:shared',
              onlyDependOnLibsWithTags: ['scope:shared'],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
];
