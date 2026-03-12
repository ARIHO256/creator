interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_LOCAL_API_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
