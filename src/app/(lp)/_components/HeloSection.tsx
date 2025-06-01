'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Modal from 'react-modal';
import RegistrationForm from './RegistrationForm';

export default function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [displayedTextX, setDisplayedTextX] = useState('');
  const [displayedTextThreads, setDisplayedTextThreads] = useState('');
  const [displayedTitle, setDisplayedTitle] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalContentVisible, setIsModalContentVisible] = useState(false);
  const fullTextX =
    '新しく見つけたスムージーボウルのお店が最高でした！アサイーの甘さが絶妙で、トッピングも新鮮。この界隈にお住まいの方は絶対チェックすべき！#グルメ #ヘルシー';
  const fullTextThreads =
    '朝食にぴったりの絶景スポットを発見 😍 スムージーボウルが信じられないほど美味しい - 新鮮な食材と完璧なバランスの味。朝一番で訪れる価値アリ！#朝活 #カフェ巡り';
  const fullTitle = '_ストーリーズ芸人に朗報';

  const animationRef = useRef<HTMLDivElement>(null);

  // モーダル関連の関数
  const openModal = () => {
    setIsModalOpen(true);
    // モーダルが開いた後にコンテンツアニメーションを開始
    setTimeout(() => {
      setIsModalContentVisible(true);
    }, 100);
  };

  const closeModal = () => {
    setIsModalContentVisible(false);
    // アニメーション完了後にモーダルを閉じる
    setTimeout(() => {
      setIsModalOpen(false);
    }, 300);
  };

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
      if (titleIndex < fullTitle.length) {
        setDisplayedTitle((prev) => prev + fullTitle.charAt(titleIndex));
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

    let indexX = 0;
    let indexThreads = 0;

    const intervalX = setInterval(() => {
      if (indexX < fullTextX.length) {
        setDisplayedTextX((prev) => prev + fullTextX.charAt(indexX));
        indexX++;
      } else {
        clearInterval(intervalX);
      }
    }, 50);

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
      clearInterval(intervalX);
      clearTimeout(threadsTimeout);
    };
  }, [isVisible]);

  return (
    <section className="pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-20">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-6 relative">
            <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 text-transparent bg-clip-text relative z-10">
              {displayedTitle}
              <span
                className={`inline-block h-16 w-1 bg-gradient-to-b from-purple-600 to-pink-500 ml-1 ${displayedTitle.length === fullTitle.length ? 'opacity-0' : 'opacity-100'} animate-pulse`}
              ></span>
            </span>
          </h1>
          <p className="text-base md:text-lg text-gray-600 mb-8">
            大量に溜まっているストーリーズ画像、自動でランダム投稿＋AI文字起こしでThreadsやXに同時投稿してインプを倍増させましょう。
          </p>
          <button
            onClick={openModal}
            className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-full px-8 py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 active:scale-95 relative overflow-hidden group"
          >
            <span className="relative z-10">事前登録する</span>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-700 to-pink-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300 animate-pulse"></div>
          </button>
        </div>

        <div ref={animationRef} className="relative max-w-5xl mx-auto mt-16">
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
            <div
              className={`absolute top-[450px] md:top-1/3 right-4 md:-right-4 transform md:translate-x-12 ${isVisible ? 'opacity-100' : 'opacity-0'} transition-all duration-1000 delay-500`}
            >
              <div className="h-12 w-32 md:w-40 bg-gradient-to-r from-purple-500 to-transparent rounded-full flex items-center justify-center">
                <svg className="w-24 h-8 text-white" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 12H19M19 12L13 6M19 12L13 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            <div
              className={`absolute top-[550px] md:bottom-1/3 right-4 md:-right-4 transform md:translate-x-12 ${isVisible ? 'opacity-100' : 'opacity-0'} transition-all duration-1000 delay-700`}
            >
              <div className="h-12 w-32 md:w-40 bg-gradient-to-r from-pink-500 to-transparent rounded-full flex items-center justify-center">
                <svg className="w-24 h-8 text-white" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 12H19M19 12L13 6M19 12L13 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            {/* X Post */}
            <div
              className={`absolute top-[500px] md:top-12 right-8 md:right-12 w-72 md:w-80 bg-white rounded-xl shadow-lg border border-gray-200 p-4 ${isVisible ? 'opacity-100' : 'opacity-0'} transition-all duration-1000 delay-1000`}
            >
              <div className="flex items-center mb-3">
                <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                <div className="ml-3">
                  <p className="font-semibold text-sm">ユーザー名</p>
                  <p className="text-gray-500 text-xs">@username</p>
                </div>
              </div>
              <div className="text-sm">
                <p>{displayedTextX || ' '}</p>
                <span
                  className={`inline-block h-4 w-1 bg-gray-900 ${displayedTextX.length === fullTextX.length ? 'opacity-0' : 'opacity-100'} animate-pulse`}
                ></span>
              </div>
            </div>

            {/* Threads Post */}
            <div
              className={`absolute top-[650px] md:bottom-12 right-8 md:right-12 w-72 md:w-80 bg-white rounded-xl shadow-lg border border-gray-200 p-4 ${isVisible ? 'opacity-100' : 'opacity-0'} transition-all duration-1000 delay-1500`}
            >
              <div className="flex items-center mb-3">
                <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                <div className="ml-3">
                  <p className="font-semibold text-sm">ユーザー名</p>
                  <p className="text-gray-500 text-xs">@username</p>
                </div>
              </div>
              <div className="text-sm">
                <p>{displayedTextThreads || ' '}</p>
                <span
                  className={`inline-block h-4 w-1 bg-gray-900 ${displayedTextThreads.length === fullTextThreads.length ? 'opacity-0' : 'opacity-100'} animate-pulse`}
                ></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 事前登録モーダル */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        className={`relative max-w-lg mx-auto bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-3xl shadow-2xl p-8 mt-20 transform transition-all duration-500 ease-out ${
          isModalContentVisible
            ? 'scale-100 rotate-0 opacity-100 translate-y-0'
            : 'scale-75 rotate-6 opacity-0 translate-y-8'
        }`}
        overlayClassName={`fixed inset-0 backdrop-blur-sm flex items-center justify-center px-4 z-50 transition-all duration-300 ${
          isModalContentVisible ? 'bg-black/60' : 'bg-black/0'
        }`}
        shouldCloseOnOverlayClick={true}
        shouldCloseOnEsc={true}
        ariaHideApp={false}
      >
        {/* モーダル内のキラキラエフェクト */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl">
          <div
            className={`absolute top-4 left-4 w-2 h-2 bg-white/30 rounded-full transform transition-all duration-1000 ${
              isModalContentVisible ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
            }`}
            style={{ animationDelay: '200ms' }}
          ></div>
          <div
            className={`absolute top-8 right-8 w-1 h-1 bg-white/40 rounded-full transform transition-all duration-1000 ${
              isModalContentVisible ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
            }`}
            style={{ animationDelay: '400ms' }}
          ></div>
          <div
            className={`absolute bottom-8 left-8 w-1.5 h-1.5 bg-white/20 rounded-full transform transition-all duration-1000 ${
              isModalContentVisible ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
            }`}
            style={{ animationDelay: '600ms' }}
          ></div>
          <div
            className={`absolute bottom-4 right-12 w-1 h-1 bg-white/50 rounded-full transform transition-all duration-1000 ${
              isModalContentVisible ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
            }`}
            style={{ animationDelay: '800ms' }}
          ></div>
        </div>

        <div className="text-center relative z-10">
          {/* 閉じるボタン */}
          <button
            onClick={closeModal}
            className={`absolute -top-2 -right-2 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-300 transform ${
              isModalContentVisible
                ? 'scale-100 opacity-100 rotate-0'
                : 'scale-0 opacity-0 rotate-180'
            }`}
            style={{ transitionDelay: '600ms' }}
          >
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <div
            className={`transform transition-all duration-700 ease-out ${
              isModalContentVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}
          >
            <p className="text-3xl md:text-4xl font-bold text-white mb-6 animate-pulse">事前登録</p>
          </div>

          <div
            className={`transform transition-all duration-700 ease-out ${
              isModalContentVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}
            style={{ transitionDelay: '200ms' }}
          >
            <p className="text-xl text-white/90 mb-8 md:mb-10">
              リリース時、メールでお知らせいたします。
            </p>
          </div>

          <div
            className={`transform transition-all duration-700 ease-out ${
              isModalContentVisible
                ? 'translate-y-0 opacity-100 scale-100'
                : 'translate-y-8 opacity-0 scale-95'
            }`}
            style={{ transitionDelay: '400ms' }}
          >
            <RegistrationForm variant="modal" onSuccess={closeModal} />
          </div>

          <div
            className={`transform transition-all duration-700 ease-out ${
              isModalContentVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}
            style={{ transitionDelay: '600ms' }}
          ></div>
        </div>
      </Modal>
    </section>
  );
}
