import FeaturesSection from './_components/FeatureSection';
import Footer from './_components/Footer';
import HeroSection from './_components/HeloSection';
import Navbar from './_components/Navbar';
import RegistrationSection from './_components/RegistrationSection';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <RegistrationSection />
      <Footer />
    </main>
  );
}
