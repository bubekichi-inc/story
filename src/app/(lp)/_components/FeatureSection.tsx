import React from 'react';
import { Upload, Calendar, RefreshCw, Share2, Clock, BrainCircuit } from 'lucide-react';
import { FadeAnimation } from './FadeAnimation';

export default function FeaturesSection() {
  const features = [
    {
      icon: <Upload className="w-8 h-8 text-purple-600" />,
      title: '一括アップロード',
      description:
        '複数のストーリーズ画像を一度にアップロード。定期的に再投稿したい画像を一元管理できます。',
    },
    {
      icon: <BrainCircuit className="w-8 h-8 text-purple-600" />,
      title: 'AIテキスト生成',
      description:
        'ストーリーズ画像から自動でThreads, X投稿テキストを生成します。もちろん手修正も可能です。',
    },
    {
      icon: <RefreshCw className="w-8 h-8 text-purple-600" />,
      title: 'クロスプラットフォーム自動投稿',
      description:
        '柔軟なスケジュール設定をした上で、ThreadsやXにも同時投稿できます。ランダム投稿にも対応。',
    },
  ];

  return (
    <FadeAnimation>
      <section id="features" className="py-16 md:py-24 bg-[#f5f8fa]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">できること</h2>
            <p className="text-lg text-gray-600">
              ストーリーズ運用を効率化するあらゆる機能を提供します
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
