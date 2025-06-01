'use client';

import { useState } from 'react';
import FeaturesSection from './_components/FeatureSection';
import Footer from './_components/Footer';
import HeroSection from './_components/HeloSection';
import Navbar from './_components/Navbar';
import RegistrationSection from './_components/RegistrationSection';
import RegistrationModal from './_components/RegistrationModal';

export default function Home() {
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);

  const openRegistrationModal = () => setIsRegistrationModalOpen(true);
  const closeRegistrationModal = () => setIsRegistrationModalOpen(false);

  return (
    <main className="min-h-screen flex flex-col">
      <Navbar />
      <HeroSection onOpenModal={openRegistrationModal} />
      <FeaturesSection />
      <RegistrationSection />
      <Footer />
      <RegistrationModal isOpen={isRegistrationModalOpen} onClose={closeRegistrationModal} />
    </main>
  );
}
