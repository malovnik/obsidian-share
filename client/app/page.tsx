export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">
          📝 Obsidian Share
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Делитесь своими заметками из Obsidian с кем угодно
        </p>
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
          <h2 className="text-2xl font-semibold mb-4">Как использовать?</h2>
          <ol className="text-left space-y-3 text-gray-700">
            <li>1. Установите плагин в Obsidian</li>
            <li>2. Выберите заметку для публикации</li>
            <li>3. Нажмите «Поделиться»</li>
            <li>4. Скопируйте ссылку и отправьте кому нужно</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
