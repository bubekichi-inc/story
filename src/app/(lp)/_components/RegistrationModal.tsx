'use client';

import { useEffect, useState } from 'react';
import Modal from 'react-modal';
import RegistrationForm from './RegistrationForm';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RegistrationModal({ isOpen, onClose }: RegistrationModalProps) {
  const [isModalContentVisible, setIsModalContentVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // モーダルが開いた後にコンテンツアニメーションを開始
      setTimeout(() => {
        setIsModalContentVisible(true);
      }, 100);
    } else {
      setIsModalContentVisible(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsModalContentVisible(false);
    // アニメーション完了後にモーダルを閉じる
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleSuccess = () => {
    setTimeout(() => {
      handleClose();
    }, 1500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleClose}
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
      <div className="text-center relative z-10">
        {/* 閉じるボタン */}
        <button
          onClick={handleClose}
          className={`absolute -top-2 -right-2 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-300 transform ${
            isModalContentVisible
              ? 'scale-100 opacity-100 rotate-0'
              : 'scale-0 opacity-0 rotate-180'
          }`}
          style={{ transitionDelay: '600ms' }}
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div
          className={`transform flex justify-center mx-20 transition-all duration-700 ease-out ${
            isModalContentVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          <p className="text-3xl md:text-4xl font-bold text-white mb-6">事前登録</p>
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
          <RegistrationForm variant="modal" onSuccess={handleSuccess} />
        </div>
      </div>
    </Modal>
  );
}
