import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [shouldSlide, setShouldSlide] = useState(false);

  useEffect(() => {
    // Start sliding after 2 seconds
    const slideTimer = setTimeout(() => {
      setShouldSlide(true);
    }, 2000);

    // Complete and remove after slide animation
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 3000); // 2000ms wait + 1000ms slide animation

    return () => {
      clearTimeout(slideTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-transform duration-1000 ease-in-out ${
        shouldSlide ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      <div className="flex flex-col items-center justify-center">
        <img 
          src="/assets/Contato Arnaldo.png" 
          alt="UpCar Aspiradores" 
          className="max-w-md w-full px-8"
          onError={(e) => {
            // Fallback if image doesn't load
            e.currentTarget.style.display = 'none';
            const parent = e.currentTarget.parentElement;
            if (parent) {
              parent.innerHTML = `
                <div class="text-gray-900 text-center">
                  <h1 class="text-6xl font-bold mb-2">UpCar</h1>
                  <p class="text-xl text-gray-600">Aspiradores Self-Service</p>
                </div>
              `;
            }
          }}
        />
      </div>
    </div>
  );
};
