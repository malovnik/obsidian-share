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
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (pin === CORRECT_PIN) {
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
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 4) {
      setPin(value);
      setError(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div
        className={`bg-white border-2 border-black max-w-sm w-full p-8 transition-all ${
          shake ? 'animate-shake' : ''
        }`}
      >
        <h2 className="text-xl font-semibold text-black text-center mb-2">
          Введите PIN-код
        </h2>
        <p className="text-gray-500 text-sm text-center mb-6">
          Для доступа к приватному материалу
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={handlePinChange}
              placeholder="----"
              maxLength={4}
              autoFocus
              className={`w-full text-center text-3xl font-semibold tracking-[0.5em] px-6 py-4 border-2 rounded-none transition-all focus:outline-none ${
                error
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-black bg-white focus:shadow-[0_0_0_1px_black]'
              }`}
            />
            {error && (
              <p className="text-gray-700 text-sm mt-2 text-center animate-fadeIn">
                Неверный PIN-код. Попробуйте снова.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={pin.length !== 4}
            className="w-full bg-black text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium py-3 px-6 rounded-none transition-colors"
          >
            {pin.length === 4 ? 'Открыть' : 'Введите 4 цифры'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-gray-200">
          <p className="text-xs text-gray-400 text-center mb-3">
            Нет PIN-кода?
          </p>
          <a
            href="https://t.me/mlvnik"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center border border-gray-200 hover:border-black text-gray-700 text-sm py-2.5 px-4 rounded-none transition-colors"
          >
            Написать @mlvnik
          </a>
        </div>
      </div>
    </div>
  );
}
