export default function TaskSkeleton() {
  return (
    <li className="flex items-center gap-4 mb-4 p-2 border rounded animate-pulse">
      <div className="flex-1 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div className="w-20 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div className="w-[150px] h-9 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </li>
  );
}
