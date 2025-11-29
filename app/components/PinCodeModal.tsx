'use client';

import { useState, useEffect } from 'react';

interface PinCodeModalProps {
  onSuccess: () => void;
}

const CORRECT_PIN = '0880';

export default function PinCodeModal({ onSuccess }: PinCodeModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    // Блокируем скролл страницы когда модал открыт
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (pin === CORRECT_PIN) {
      // Сохраняем в sessionStorage для текущей сессии
      sessionStorage.setItem('pincode_verified', 'true');
      onSuccess();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPin('');
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Только цифры
    if (value.length <= 4) {
      setPin(value);
      setError(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div
        className={`bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 transform transition-all ${
          shake ? 'animate-shake' : ''
        }`}
      >
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-3xl">🔒</span>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-2">
          Приватная статья
        </h2>
        <p className="text-gray-600 text-center mb-6">
          Введите пинкод для доступа к материалу
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* PIN Input */}
          <div>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={handlePinChange}
              placeholder="••••"
              maxLength={4}
              autoFocus
              className={`w-full text-center text-3xl sm:text-4xl font-bold tracking-widest px-6 py-4 rounded-xl border-2 transition-all focus:outline-none focus:ring-4 ${
                error
                  ? 'border-red-500 bg-red-50 focus:ring-red-200'
                  : 'border-gray-300 bg-gray-50 focus:border-blue-500 focus:ring-blue-200'
              }`}
            />
            {error && (
              <p className="text-red-600 text-sm mt-2 text-center animate-fadeIn">
                ❌ Неверный пинкод. Попробуйте снова.
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={pin.length !== 4}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
          >
            {pin.length === 4 ? '✓ Открыть' : 'Введите 4 цифры'}
          </button>
        </form>

        {/* Help Text */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center mb-3">
            Нет пинкода или забыли его?
          </p>
          <a
            href="https://t.me/mlvnik"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            📱 Написать @mlvnik
          </a>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes shake {
          0%, 100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-10px);
          }
          75% {
            transform: translateX(10px);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
}
