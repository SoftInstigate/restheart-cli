import globals from 'globals'
import pluginJs from '@eslint/js'

export default [
    { files: ['**/*.js'], languageOptions: { sourceType: 'module' } },
    { languageOptions: { globals: globals.node } },
    pluginJs.configs.recommended,
    {
        rules: {
            'no-unused-vars': 'warn',
        },
    },
]
