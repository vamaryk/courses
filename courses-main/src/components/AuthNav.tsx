interface AuthNavProps {
  mode: 'login' | 'register';
  onToggle: () => void;
}

export function AuthNav({ mode, onToggle }: AuthNavProps) {
  return (
    <nav className="flex items-center justify-center space-x-6 mb-8">
      <button
        onClick={() => mode === 'register' && onToggle()}
        className={`px-4 py-2 font-medium text-sm rounded-lg transition-colors ${
          mode === 'login'
            ? 'bg-purple-100 text-purple-700 shadow-md'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        }`}
      >
        Вход
      </button>
      <button
        onClick={() => mode === 'login' && onToggle()}
        className={`px-4 py-2 font-medium text-sm rounded-lg transition-colors ${
          mode === 'register'
            ? 'bg-purple-100 text-purple-700 shadow-md'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        }`}
      >
        Регистрация
      </button>
    </nav>
  );
}
