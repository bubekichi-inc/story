# StoryCast AI - Instagramストーリーズ自動投稿アプリ

Instagram のストーリーズを自動でランダム投稿できる Web アプリケーションです。

## 主な機能

### 🔐 認証機能

- Supabase を使用したサーバーサイド認証
- メールアドレス + パスワード方式
- トップページからダイアログでログイン/新規登録

### 📸 画像管理機能

- ストーリーズ画像の一覧表示
- 複数枚同時アップロード対応
- 画像のプレビュー機能

### 🔄 投稿統合機能

- 複数の投稿を1つにまとめる機能
- ドラッグ&ドロップでの投稿統合
- 選択モードでの一括操作

## 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **認証**: Supabase Auth
- **データベース**: PostgreSQL (Prisma ORM)
- **UI**: shadcn/ui + Tailwind CSS
- **ファイルストレージ**: Supabase Storage
- **ドラッグ&ドロップ**: @dnd-kit

## Environment Setup

1. Copy the environment variables file:

```bash
cp .env.example .env
```

2. Update the `.env` file with your actual values:

   - `DATABASE_URL`: Your Supabase PostgreSQL connection string
   - `SENDGRID_API_KEY`: Your SendGrid API key
   - `ADMIN_EMAIL`: Email address for admin notifications

3. Generate the Prisma client:

```bash
npm run db:generate
```

4. Push the database schema (for development):

```bash
npm run db:push
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
