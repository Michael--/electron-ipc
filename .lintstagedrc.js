const config = {
  '*.{ts,tsx,js,jsx}': ['eslint --fix', 'prettier --write'],
  '*.{json,md,yml,yaml}': ['prettier --write'],
  '*.{ts,tsx,js,jsx,json,md}': ['cspell --no-must-find-files'],
};

export default config;
