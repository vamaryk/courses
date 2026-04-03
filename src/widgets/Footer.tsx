export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-8 sm:py-12 lg:py-16">
      <div className="mx-auto px-4 sm:px-6 lg:px-[120px] max-w-7xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Направления</h3>
            <ul className="space-y-1 sm:space-y-2">
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">Программирование</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">Дизайн</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">Маркетинг</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">Бизнес</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">О платформе</h3>
            <ul className="space-y-1 sm:space-y-2">
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">О нас</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">Команда</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">Карьера</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">Контакты</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Проекты</h3>
            <ul className="space-y-1 sm:space-y-2">
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">Блог</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">Подкаст</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">Сообщество</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">API</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Поддержка</h3>
            <ul className="space-y-1 sm:space-y-2">
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">Помощь</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">Документация</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">Статус</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base">Безопасность</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-6 sm:mt-8 lg:mt-12 pt-4 sm:pt-6 lg:pt-8 text-center text-gray-400">
          <p className="text-sm sm:text-base">&copy; 2026 MCourse. Все права защищены.</p>
        </div>
      </div>
    </footer>
  );
}