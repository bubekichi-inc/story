'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { FadeAnimation } from './FadeAnimation';

interface HeroSectionProps {
  onOpenModal: () => void;
}

export default function HeroSection({ onOpenModal }: HeroSectionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [displayedTextThreads, setDisplayedTextThreads] = useState('');
  const [displayedTitle, setDisplayedTitle] = useState('');
  const fullTextThreads =
    '朝食にぴったりの絶景スポットを発見 😍 スムージーボウルが信じられないほど美味しい - 新鮮な食材と完璧なバランスの味。朝一番で訪れる価値アリ！#朝活 #カフェ巡り';
  const fullTitle = 'ストーリーズ芸人に朗報';
  const titleChars = [...fullTitle]; // 文字を配列に変換

  const animationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // タイトルアニメーションは即座に開始
    setIsVisible(true);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (animationRef.current) {
      observer.observe(animationRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // タイトルのタイピングアニメーション - 即座に開始
    let titleIndex = 0;
    const titleInterval = setInterval(() => {
      if (titleIndex < titleChars.length) {
        const nextChar = titleChars[titleIndex];
        setDisplayedTitle((prev) => prev + nextChar);
        titleIndex++;
      } else {
        clearInterval(titleInterval);
      }
    }, 100);

    return () => {
      clearInterval(titleInterval);
    };
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let indexThreads = 0;

    const threadsTimeout = setTimeout(() => {
      const intervalThreads = setInterval(() => {
        if (indexThreads < fullTextThreads.length) {
          setDisplayedTextThreads((prev) => prev + fullTextThreads.charAt(indexThreads));
          indexThreads++;
        } else {
          clearInterval(intervalThreads);
        }
      }, 50);

      return () => clearInterval(intervalThreads);
    }, 1000);

    return () => {
      clearTimeout(threadsTimeout);
    };
  }, [isVisible]);

  return (
    <section className="py-10 pb-16 md:py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ">
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-20 space-y-6 md:space-y-10">
          <h1 className="text-3xl md:text-5xl flex justify-center lg:text-6xl font-black tracking-tight relative">
            <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 text-transparent bg-clip-text relative z-10 flex items-center">
              {displayedTitle}
              <span
                className={`inline-block h-10 md:h-16 w-1 bg-gradient-to-b from-purple-600 to-pink-500 ml-2 ${displayedTitle.length === titleChars.length ? 'opacity-0' : 'opacity-100'} animate-pulse`}
              ></span>
            </span>
          </h1>
          <div className="text-base md:text-lg text-gray-600">
            <p>
              {' '}
              大量に溜まっている <br className="block md:hidden" />
              ポエムを書いたストーリーズ画像、
            </p>
            <p>
              ランダム投稿 ＋ AIで各SNSに横展して
              <br className="block md:hidden" />
              <span className="font-bold mx-0.5">インプを倍増</span>
              できます。
            </p>
          </div>
          <button
            onClick={onOpenModal}
            className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-full px-8 py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 active:scale-95 relative overflow-hidden group"
          >
            <span className="relative z-10 font-bold">事前登録する</span>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-700 to-pink-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
        </div>

        <FadeAnimation>
          <div ref={animationRef} className="relative max-w-5xl mx-auto mt-16 flex justify-center">
            {/* アニメーションコンテナ */}
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Instagram Story */}
              <div className="w-64 h-96 md:w-72 md:h-[30rem] bg-white rounded-xl shadow-lg overflow-hidden border-2 border-gray-200 z-10">
                <Image
                  src="https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg"
                  alt="Instagram Story - スムージーボウル"
                  className="w-full h-full object-cover"
                  width={300}
                  height={600}
                  priority
                />
              </div>

              {/* アニメーション矢印 */}
              <div
                className={`${isVisible ? 'opacity-100' : 'opacity-0'} transition-all duration-1000 delay-700`}
              >
                <div className="relative flex items-center justify-center">
                  {/* AI変換アニメーション */}
                  <div className="flex md:flex-row flex-col md:items-center items-center gap-2">
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                      AI
                    </div>
                    <div className="flex md:flex-row flex-col items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                    </div>
                    <svg
                      className="w-8 h-8 text-purple-600 animate-pulse md:rotate-0 rotate-90"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path
                        d="M5 12H19M19 12L13 6M19 12L13 18"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div
                className={`w-72 md:w-80 bg-white rounded-xl shadow-lg border border-gray-200 p-4 relative ${isVisible ? 'opacity-100' : 'opacity-0'} transition-all duration-1000 delay-1500`}
              >
                {/* SNSアイコン */}
                <div className="absolute top-3 right-3 flex gap-2">
                  {/* Threadsアイコン */}
                  <div className="w-6 h-6 bg-black rounded-lg flex items-center justify-center">
                    <Image
                      src="/images/threads.svg"
                      alt="Threads Icon"
                      width={24}
                      height={24}
                      className="w-4 h-4"
                      priority
                    />
                  </div>
                  {/* Xアイコン */}
                  <div className="w-6 h-6 bg-black rounded-lg flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </div>
                </div>

                <div className="flex items-center mb-3">
                  <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                  <div className="ml-3">
                    <p className="font-semibold text-sm">ユーザー名</p>
                    <p className="text-gray-500 text-xs">@username</p>
                  </div>
                </div>
                <div className="text-sm">
                  <p>{displayedTextThreads || ' '}</p>
                </div>
              </div>

              {/* 第2の矢印アニメーション */}
              <div
                className={`${isVisible ? 'opacity-100' : 'opacity-0'} transition-all duration-1000 delay-2000`}
              >
                <div className="relative flex items-center justify-center">
                  {/* 同時投稿アニメーション */}
                  <div className="flex md:flex-row flex-col md:items-center items-center gap-2">
                    <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse whitespace-nowrap">
                      投稿
                    </div>
                    <div className="flex md:flex-row flex-col items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                    </div>
                    <svg
                      className="w-8 h-8 text-green-600 animate-pulse md:rotate-0 rotate-90"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path
                        d="M5 12H19M19 12L13 6M19 12L13 18"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* 3つのSNS投稿アニメーション */}
              <div
                className={`flex md:flex-col gap-6 ${isVisible ? 'opacity-100' : 'opacity-0'} transition-all duration-1000 delay-2500`}
              >
                {/* Instagram投稿アニメーション */}
                <div
                  className={`transform transition-all duration-500 delay-2700 ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
                >
                  <div className="w-16 h-16 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg animate-pulse">
                    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                    {/* 投稿成功インジケーター */}
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Threads投稿アニメーション */}
                <div
                  className={`transform transition-all duration-500 delay-2900 ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
                >
                  <div className="w-16 h-16 bg-black rounded-xl flex items-center justify-center shadow-lg animate-pulse">
                    <Image
                      src="/images/threads.svg"
                      alt="Threads Icon"
                      width={32}
                      height={32}
                      className="w-8 h-8"
                      priority
                    />
                    {/* 投稿成功インジケーター */}
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* X投稿アニメーション */}
                <div
                  className={`transform transition-all duration-500 delay-3100 ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
                >
                  <div className="w-16 h-16 bg-black rounded-xl flex items-center justify-center shadow-lg animate-pulse relative">
                    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    {/* 投稿成功インジケーター */}
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeAnimation>
      </div>
    </section>
  );
}
