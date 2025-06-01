import React from 'react';
import { Upload, Calendar, RefreshCw, Share2, Clock, BrainCircuit } from 'lucide-react';
import { FadeAnimation } from './FadeAnimation';

export default function FeaturesSection() {
  const features = [
    {
      icon: <Upload className="w-8 h-8 text-purple-600" />,
      title: '一括アップロード',
      description:
        '複数のインスタストーリーを一度にアップロード。手作業による時間のロスを解消します。',
    },
    {
      icon: <Calendar className="w-8 h-8 text-purple-600" />,
      title: '柔軟な投稿スケジュール',
      description: 'カスタム投稿スケジュールを作成し、時間帯や間隔を自由に設定できます。',
    },
    {
      icon: <RefreshCw className="w-8 h-8 text-purple-600" />,
      title: 'クロスプラットフォーム投稿',
      description: '1回のアップロードで、Instagram、X、Threadsに同時投稿が可能です。',
    },
    {
      icon: <BrainCircuit className="w-8 h-8 text-purple-600" />,
      title: 'AIキャプション生成',
      description: 'AIが画像を分析し、魅力的で関連性の高いキャプションを自動生成します。',
    },
    {
      icon: <Share2 className="w-8 h-8 text-purple-600" />,
      title: 'マルチアカウント対応',
      description: '複数のSNSアカウントを接続し、1つのダッシュボードで一元管理できます。',
    },
    {
      icon: <Clock className="w-8 h-8 text-purple-600" />,
      title: '時間節約の自動化',
      description: 'コンテンツの再利用と投稿スケジューリングを自動化し、毎週何時間も節約できます。',
    },
  ];

  return (
    <FadeAnimation>
      <section id="features" className="py-16 md:py-24 bg-[#f5f8fa]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">主な機能</h2>
            <p className="text-xl text-gray-600">
              ストーリーズをテキスト投稿に変換するために必要な全ての機能を提供します
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FadeAnimation key={index}>
                <div className="bg-white p-8 rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300">
                  <div className="mb-4 p-3 bg-purple-50 inline-block rounded-lg">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              </FadeAnimation>
            ))}
          </div>
        </div>
      </section>
    </FadeAnimation>
  );
}
