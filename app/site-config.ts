import release from '../deploy/release.json';
export const basePath = release.basePath;
export const sitePath = (path: string) => `${basePath}${path}`;
