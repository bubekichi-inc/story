import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between">
          <div>
            <Link href="/" className="inline-block">
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 text-transparent bg-clip-text">
                StoryCastAI
              </span>
            </Link>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900 mb-4">
              会社情報
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="https://bubekichi.com" className="text-gray-600 hover:text-gray-900">
                  会社概要
                </Link>
              </li>
              <li>
                <Link href="https://x.com/bubekichi" className="text-gray-600 hover:text-gray-900">
                  お問い合わせ
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-gray-500 text-xs text-center">
            &copy; {new Date().getFullYear()} StoryCastAI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
