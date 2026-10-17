import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // The scheduler is shipped as TypeScript source from the workspace.
  transpilePackages: ['@studesk/engine'],
  // Tailwind CSS v4 is compiled by its Turbopack loader in current Next.js apps.
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
