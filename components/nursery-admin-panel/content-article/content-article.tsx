"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Search, Filter, Plus } from "lucide-react";
import AddArticleModal from "./add-article-modal/add-article-modal";
import ArticleTable from "./article-table/article-table";
import EditArticleModal from "./edit-article-modal/edit-article-modal";
import DeleteArticleModal from "./delete-article-modal/delete-article-modal";
import { adminService } from "@/lib/api/admin";
import { toast } from "sonner";

export default function ManageArticles() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [openAddModal, setOpenAddModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const response = await adminService.getAllArticles();
      
      if (response.success && response.data) {
        setArticles(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Failed to fetch articles:', error);
      toast.error('Failed to load articles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  // Filter articles based on search and category
  const filteredArticles = articles.filter((article) => {
    const matchesSearch = 
      article.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.cardHeading.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || article.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  // ✅ Add Article
  const handleAddArticle = (newArticle: any) => {
    setArticles((prev) => [newArticle, ...prev]);
    toast.success('Article created successfully');
  };

  // ✅ Edit Article
  const handleUpdateArticle = (updatedArticle: any) => {
    setArticles((prev) =>
      prev.map((article) => (article.id === updatedArticle.id ? updatedArticle : article))
    );
    toast.success('Article updated successfully');
  };

  // ✅ Delete Article
  const handleDeleteArticle = async () => {
    if (!selectedArticle) return;
    
    try {
      const response = await adminService.deleteArticle(selectedArticle.id);
      
      if (response.success) {
        setArticles((prev) => prev.filter((a) => a.id !== selectedArticle.id));
        toast.success('Article deleted successfully');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete article');
    } finally {
      setOpenDeleteModal(false);
      setSelectedArticle(null);
    }
  };

  const handleEdit = (article: any) => {
    setSelectedArticle(article);
    setOpenEditModal(true);
  };

  const handleDelete = (article: any) => {
    setSelectedArticle(article);
    setOpenDeleteModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading articles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">

      {/* ✅ HEADER */}
      <div className="bg-white p-4 shadow-md rounded-lg mb-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-secondary font-medium text-2xl md:text-4xl lg:text-[48px] font-heading">
              <span className="text-foreground">MANAGE</span> Articles
            </h2>
            <p className="text-gray-600">View, edit, and manage all platform articles</p>
          </div>

          <Button
            variant="ghost"
            className="bg-secondary flex items-center gap-2 cursor-pointer w-full md:w-auto"
            onClick={() => setOpenAddModal(true)}
          >
            <Plus/>
            Create Article
          </Button>
        </div>
      </div>

      {/* ✅ SEARCH + FILTER */}
      <div className="w-full bg-white p-4 rounded-lg flex items-center gap-4 mb-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            className="pl-10 rounded-sm"
            placeholder="Search by title or heading..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px] flex items-center gap-2 rounded-sm border border-secondary bg-white px-3 py-2 text-sm">
            <Filter className="h-4 w-4 pointer-events-none text-secondary" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="CHILDCARE_TIPS">Childcare Tips</SelectItem>
            <SelectItem value="FUNDING_COSTS">Funding & Costs</SelectItem>
            <SelectItem value="ACTIVITIES_LEARNING">Activities & Learning</SelectItem>
            <SelectItem value="NURSERY_UPDATES">Nursery Updates</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ✅ TABLE */}
      <div className="shadow-md p-4 bg-white rounded-lg">
        <h2 className="font-sans font-bold text-xl">All Articles</h2>
        <p className="text-gray-500">Manage and monitor your published content effortlessly.</p>

        <ArticleTable articles={filteredArticles} onEdit={handleEdit} onDelete={handleDelete} />
      </div>

      {/* ✅ MODALS */}
      <AddArticleModal
        open={openAddModal}
        onClose={() => setOpenAddModal(false)}
        onAdd={handleAddArticle}
      />

      <EditArticleModal
        open={openEditModal}
        article={selectedArticle}
        onClose={() => setOpenEditModal(false)}
        onUpdate={handleUpdateArticle}
      />

      <DeleteArticleModal
        open={openDeleteModal}
        article={selectedArticle}
        onClose={() => setOpenDeleteModal(false)}
        onConfirmDelete={handleDeleteArticle}
      />
    </div>
  );
}
