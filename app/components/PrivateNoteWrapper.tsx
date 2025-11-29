'use client';

import { useState, useEffect } from 'react';
import PinCodeModal from './PinCodeModal';

interface PrivateNoteWrapperProps {
  isPrivate: boolean;
  children: React.ReactNode;
}

export default function PrivateNoteWrapper({ isPrivate, children }: PrivateNoteWrapperProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Проверяем sessionStorage при монтировании
    if (isPrivate) {
      const verified = sessionStorage.getItem('pincode_verified');
      setIsUnlocked(verified === 'true');
    } else {
      setIsUnlocked(true);
    }
    setIsChecking(false);
  }, [isPrivate]);

  const handleSuccess = () => {
    setIsUnlocked(true);
  };

  // Показываем лоадер пока проверяем sessionStorage
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  // Если приватная и не разблокирована - показываем модал
  if (isPrivate && !isUnlocked) {
    return <PinCodeModal onSuccess={handleSuccess} />;
  }

  // Иначе показываем контент
  return <>{children}</>;
}
