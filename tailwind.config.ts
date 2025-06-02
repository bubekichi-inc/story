import type { Config } from 'tailwindcss';

export default {
  content: ['./src/app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {},
      boxShadow: {
        card: '0px 10px 30px rgba(0, 0, 0, 0.03)',
      },
    },
  },
} satisfies Config;
