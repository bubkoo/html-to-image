module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'body-max-line-length': [2, 'always', 300],
    'footer-max-line-length': [2, 'always', 300],
  },
}
