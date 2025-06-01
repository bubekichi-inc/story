'use client';

import RegistrationForm from './RegistrationForm';
import { FadeAnimation } from './FadeAnimation';

export default function RegistrationSection() {
  return (
    <FadeAnimation>
      <section id="register" className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-3xl overflow-hidden shadow-xl">
            <div className="px-6 py-12 md:p-12 lg:p-16">
              <div className="max-w-3xl mx-auto text-center">
                <p className="text-3xl md:text-4xl font-bold text-white mb-6">事前登録</p>
                <p className="text-xl text-white/90 mb-8 md:mb-10">
                  リリース時、メールでお知らせいたします。
                </p>

                <RegistrationForm variant="default" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </FadeAnimation>
  );
}
