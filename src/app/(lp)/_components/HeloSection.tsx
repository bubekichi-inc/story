'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [displayedTextX, setDisplayedTextX] = useState('');
  const [displayedTextThreads, setDisplayedTextThreads] = useState('');
  const fullTextX = "新しく見つけたスムージーボウルのお店が最高でした！アサイーの甘さが絶妙で、トッピングも新鮮。この界隈にお住まいの方は絶対チェックすべき！#グルメ #ヘルシー";
  const fullTextThreads = "朝食にぴったりの絶景スポットを発見 😍 スムージーボウルが信じられないほど美味しい - 新鮮な食材と完璧なバランスの味。朝一番で訪れる価値アリ！#朝活 #カフェ巡り";

  const animationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
    if (!isVisible) return;

    let indexX = 0;
    let indexThreads = 0;

    const intervalX = setInterval(() => {
      if (indexX < fullTextX.length) {
        setDisplayedTextX(prev => prev + fullTextX.charAt(indexX));
        indexX++;
      } else {
        clearInterval(intervalX);
      }
    }, 50);

    const threadsTimeout = setTimeout(() => {
      const intervalThreads = setInterval(() => {
        if (indexThreads < fullTextThreads.length) {
          setDisplayedTextThreads(prev => prev + fullTextThreads.charAt(indexThreads));
          indexThreads++;
        } else {
          clearInterval(intervalThreads);
        }
      }, 50);

      return () => clearInterval(intervalThreads);
    }, 1000);

    return () => {
      clearInterval(intervalX);
      clearTimeout(threadsTimeout);
    };
  }, [isVisible]);

  return (
    <section className="pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-20">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 text-transparent bg-clip-text">
              ストーリーズを
            </span>
            <br />
            <span>テキスト投稿に変換</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8">
            AIを活用してインスタグラムストーリーをX（旧Twitter）やThreads用の投稿に自動変換。ソーシャルメディア運用を効率化します。
          </p>
          <Link
            href="#register"
            className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-full px-8 py-4 text-lg shadow-lg hover:shadow-xl transition duration-300"
          >
            事前登録する
          </Link>
        </div>

        <div
          ref={animationRef}
          className="relative max-w-5xl mx-auto mt-16"
        >
          {/* アニメーションコンテナ */}
          <div className="relative h-[800px] md:h-[600px] bg-gray-50 rounded-2xl shadow-xl overflow-hidden">
            {/* Instagram Story */}
            <div className="absolute top-8 left-1/2 transform -translate-x-1/2 md:top-1/2 md:-translate-y-1/2 w-64 h-96 md:w-72 md:h-[30rem] bg-white rounded-xl shadow-lg overflow-hidden border-2 border-gray-200 z-10">
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
            <div className={`absolute top-[450px] md:top-1/3 right-4 md:-right-4 transform md:translate-x-12 ${isVisible ? 'opacity-100' : 'opacity-0'} transition-all duration-1000 delay-500`}>
              <div className="h-12 w-32 md:w-40 bg-gradient-to-r from-purple-500 to-transparent rounded-full flex items-center justify-center">
                <svg className="w-24 h-8 text-white" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            <div className={`absolute top-[550px] md:bottom-1/3 right-4 md:-right-4 transform md:translate-x-12 ${isVisible ? 'opacity-100' : 'opacity-0'} transition-all duration-1000 delay-700`}>
              <div className="h-12 w-32 md:w-40 bg-gradient-to-r from-pink-500 to-transparent rounded-full flex items-center justify-center">
                <svg className="w-24 h-8 text-white" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {/* X Post */}
            <div className={`absolute top-[500px] md:top-12 right-8 md:right-12 w-72 md:w-80 bg-white rounded-xl shadow-lg border border-gray-200 p-4 ${isVisible ? 'opacity-100' : 'opacity-0'} transition-all duration-1000 delay-1000`}>
              <div className="flex items-center mb-3">
                <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                <div className="ml-3">
                  <p className="font-semibold text-sm">ユーザー名</p>
                  <p className="text-gray-500 text-xs">@username</p>
                </div>
              </div>
              <div className="text-sm">
                <p>{displayedTextX || " "}</p>
                <span className={`inline-block h-4 w-1 bg-gray-900 ${displayedTextX.length === fullTextX.length ? 'opacity-0' : 'opacity-100'} animate-pulse`}></span>
              </div>
            </div>

            {/* Threads Post */}
            <div className={`absolute top-[650px] md:bottom-12 right-8 md:right-12 w-72 md:w-80 bg-white rounded-xl shadow-lg border border-gray-200 p-4 ${isVisible ? 'opacity-100' : 'opacity-0'} transition-all duration-1000 delay-1500`}>
              <div className="flex items-center mb-3">
                <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                <div className="ml-3">
                  <p className="font-semibold text-sm">ユーザー名</p>
                  <p className="text-gray-500 text-xs">@username</p>
                </div>
              </div>
              <div className="text-sm">
                <p>{displayedTextThreads || " "}</p>
                <span className={`inline-block h-4 w-1 bg-gray-900 ${displayedTextThreads.length === fullTextThreads.length ? 'opacity-0' : 'opacity-100'} animate-pulse`}></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
