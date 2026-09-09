import type { NextConfig } from 'next';
import release from './deploy/release.json';
const nextConfig: NextConfig = {
  output: 'export',
  deploymentId: release.id,
  basePath: release.basePath,
};
export default nextConfig;
