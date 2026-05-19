"use client";

export function TableSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase">
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase">
                <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase">
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase">
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-900 uppercase">
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
              </th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-900 uppercase">
                <div className="h-4 bg-gray-200 rounded w-16 mx-auto animate-pulse" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {[...Array(5)].map((_, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 bg-gray-200 rounded w-40 animate-pulse" />
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
                </td>
                <td className="px-6 py-4">
                  <div className="h-6 bg-gray-200 rounded-full w-24 animate-pulse" />
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 bg-gray-200 rounded w-28 animate-pulse" />
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="h-8 w-8 bg-gray-200 rounded-lg mx-auto animate-pulse" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
