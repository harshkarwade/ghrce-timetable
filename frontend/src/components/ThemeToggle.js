import useThemeStore from "../store/themeStore";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-xl transition-all duration-300 flex items-center justify-center
                 bg-gray-100 hover:bg-gray-200 text-gray-700
                 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300
                 border border-gray-200 dark:border-gray-700 shadow-sm"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      <span className="text-xl">
        {theme === "dark" ? "☀️" : "🌙"}
      </span>
      <span className="ml-2 text-xs font-semibold hidden md:inline">
        {theme === "dark" ? "Light Mode" : "Dark Mode"}
      </span>
    </button>
  );
}
