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
            <p> 大量に溜まっているポエムを書いたストーリーズ画像、</p>
            <p>
              ランダム投稿 ＋ AIで各SNSに横展して
              <br className="block md:hidden" />
              インプを倍増できます。
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
            <div className="flex flex-col md:flex-row items-center gap-10">
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
                  <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                      AI
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                    </div>
                    <svg
                      className="w-8 h-8 text-purple-600 animate-pulse"
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
            </div>
          </div>
        </FadeAnimation>
      </div>
    </section>
  );
}
