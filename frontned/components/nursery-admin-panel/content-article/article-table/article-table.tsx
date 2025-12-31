import React from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";

function formatTimeAgo(date: string) {
  const now = new Date();
  const publishedDate = new Date(date);
  const diffInMs = now.getTime() - publishedDate.getTime();
  const diffInMins = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMins < 60) return `${diffInMins} min ago`;
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
}

function formatCategory(category: string) {
  const categoryMap: Record<string, string> = {
    CHILDCARE_TIPS: "Childcare Tips",
    FUNDING_COSTS: "Funding & Costs",
    ACTIVITIES_LEARNING: "Activities & Learning",
    NURSERY_UPDATES: "Nursery Updates",
  };
  return categoryMap[category] || category;
}

export default function ArticlesTable({ articles = [], onEdit, onDelete }: any) {
  return (
    <div className="w-full mt-4 overflow-x-auto">
      <table className="w-full min-w-[800px]">
        <thead>
          <tr className="bg-[#F8F8F8] border-2 border-gray-300 h-14">
            <th className="p-3 text-left">Name</th>
            <th className="p-3 text-left">Card Heading</th>
            <th className="p-3 text-left">Category</th>
            <th className="p-3 text-left">Published</th>
            <th className="p-3 text-left">Status</th>
            <th className="p-3 text-left">Action</th>
          </tr>
        </thead>

        <tbody>
          {articles.length === 0 ? (
            <tr>
              <td colSpan={6}>
                <div className="flex justify-center w-full">
                  <span className="block text-center py-10 text-gray-500">
                    No Articles Found
                  </span>
                </div>
              </td>
            </tr>
          ) : (
            articles.map((article: any) => (
              <tr key={article.id} className="border-b hover:bg-gray-50">
                <td className="py-6 px-3 font-bold max-w-xs truncate">{article.name}</td>
                <td className="py-6 px-3 text-gray-600 max-w-xs truncate">{article.cardHeading}</td>
                <td className="py-6 px-3 text-gray-500">{formatCategory(article.category)}</td>
                <td className="py-6 px-3 text-sm">{formatTimeAgo(article.publishedAt)}</td>
                <td className="py-6 px-3">
                  <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-700">
                    {article.isPublished ? "Published" : "Draft"}
                  </span>
                </td>

                <td className="py-6 px-3 flex items-center gap-3">
                  <button onClick={() => onEdit(article)} title="Edit">
                    <Pencil className="w-4 h-4 text-foreground" />
                  </button>

                  <button onClick={() => onDelete(article)} title="Delete">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
