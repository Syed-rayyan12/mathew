"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Plus, X, Image as ImageIcon } from "lucide-react";
import { adminService } from "@/lib/api/admin";
import { toast } from "sonner";

interface Section {
  heading: string;
  paragraph: string;
}

interface ListItem {
  heading: string;
}

export default function EditArticleModal({ open, onClose, article, onUpdate }: any) {
  const [loading, setLoading] = useState(false);
  const [cardImagePreview, setCardImagePreview] = useState<string>("");
  const [slugImagePreview, setSlugImagePreview] = useState<string>("");
  const [form, setForm] = useState({
    name: "",
    cardHeading: "",
    cardParagraph: "",
    cardImage: "",
    slugImage: "",
    category: "CHILDCARE_TIPS",
  });

  const [sections, setSections] = useState<Section[]>([{ heading: "", paragraph: "" }]);
  const [listHeading, setListHeading] = useState("");
  const [listItems, setListItems] = useState<ListItem[]>([{ heading: "" }]);
  const [tipText, setTipText] = useState("");
  const [finalHeading, setFinalHeading] = useState("");
  const [finalParagraph, setFinalParagraph] = useState("");

  // Populate form with article data when modal opens
  useEffect(() => {
    if (article) {
      setForm({
        name: article.name || "",
        cardHeading: article.cardHeading || "",
        cardParagraph: article.cardParagraph || "",
        cardImage: article.cardImage || "",
        slugImage: article.slugImage || "",
        category: article.category || "CHILDCARE_TIPS",
      });

      setSections(article.sections && article.sections.length > 0 ? article.sections : [{ heading: "", paragraph: "" }]);
      setListHeading(article.listHeading || "");
      setListItems(article.listItems && article.listItems.length > 0 ? article.listItems : [{ heading: "" }]);
      setTipText(article.tipText || "");
      setFinalHeading(article.finalHeading || "");
      setFinalParagraph(article.finalParagraph || "");

      // Set image previews
      if (article.cardImage) {
        setCardImagePreview(article.cardImage);
      }
      if (article.slugImage) {
        setSlugImagePreview(article.slugImage);
      }
    }
  }, [article]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCategoryChange = (value: string) => {
    setForm({ ...form, category: value });
  };

  const handleCardImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setForm({ ...form, cardImage: base64String });
        setCardImagePreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSlugImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setForm({ ...form, slugImage: base64String });
        setSlugImagePreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeCardImage = () => {
    setForm({ ...form, cardImage: "" });
    setCardImagePreview("");
  };

  const removeSlugImage = () => {
    setForm({ ...form, slugImage: "" });
    setSlugImagePreview("");
  };

  const addSection = () => {
    setSections([...sections, { heading: "", paragraph: "" }]);
  };

  const updateSection = (index: number, field: "heading" | "paragraph", value: string) => {
    const newSections = [...sections];
    newSections[index][field] = value;
    setSections(newSections);
  };

  const removeSection = (index: number) => {
    if (sections.length > 1) {
      setSections(sections.filter((_, i) => i !== index));
    }
  };

  const addListItem = () => {
    setListItems([...listItems, { heading: "" }]);
  };

  const updateListItem = (index: number, field: "heading", value: string) => {
    const newItems = [...listItems];
    newItems[index][field] = value;
    setListItems(newItems);
  };

  const removeListItem = (index: number) => {
    if (listItems.length > 1) {
      setListItems(listItems.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!form.name || !form.cardHeading || !form.cardParagraph) {
      toast.error("Please fill in name, card heading, and card paragraph");
      return;
    }

    if (!article?.id) {
      toast.error("Article ID is missing");
      return;
    }

    setLoading(true);

    try {
      const articleData = {
        name: form.name,
        cardHeading: form.cardHeading,
        cardParagraph: form.cardParagraph,
        sections: sections.filter(s => s.heading || s.paragraph),
        listHeading: listHeading || undefined,
        listItems: listItems.filter(item => item.heading).map(item => ({ heading: item.heading })),
        tipText: tipText || undefined,
        finalHeading: finalHeading || undefined,
        finalParagraph: finalParagraph || undefined,
        cardImage: form.cardImage || undefined,
        slugImage: form.slugImage || undefined,
        category: form.category,
      };

      console.log('Updating article with data:', articleData);

      const response = await adminService.updateArticle(article.id, articleData);

      if (response.success && response.data) {
        toast.success("Article updated successfully");
        onUpdate(response.data);
        onClose();
      }
    } catch (error: any) {
      console.error("Update article error:", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to update article";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!article) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="font-sans bg-white p-4 rounded-xl overflow-y-auto max-h-[90vh] max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-medium">Edit Article</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-medium text-lg">Basic Information</h3>
            
            <div>
              <label className="text-sm font-medium">Article Name *</label>
              <Input
                name="name"
                placeholder="Enter article name"
                value={form.name}
                onChange={handleChange}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Card Heading *</label>
              <Input
                name="cardHeading"
                placeholder="Heading shown on article card"
                value={form.cardHeading}
                onChange={handleChange}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Card Paragraph *</label>
              <Textarea
                name="cardParagraph"
                placeholder="Short description shown on article card"
                value={form.cardParagraph}
                onChange={handleChange}
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Card Image</label>
              <div className="mt-1 space-y-2">
                {cardImagePreview ? (
                  <div className="relative w-full h-48 border rounded-lg overflow-hidden">
                    <img 
                      src={cardImagePreview} 
                      alt="Card preview" 
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeCardImage}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <label className="flex flex-col items-center cursor-pointer">
                      <ImageIcon className="w-12 h-12 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">Click to upload card image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCardImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">This image will be shown on the article list page</p>
            </div>

            <div>
              <label className="text-sm font-medium">Slug Page Hero Image</label>
              <div className="mt-1 space-y-2">
                {slugImagePreview ? (
                  <div className="relative w-full h-48 border rounded-lg overflow-hidden">
                    <img 
                      src={slugImagePreview} 
                      alt="Hero preview" 
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeSlugImage}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <label className="flex flex-col items-center cursor-pointer">
                      <ImageIcon className="w-12 h-12 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">Click to upload hero image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleSlugImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">This image will be shown as the hero image on the article detail page</p>
            </div>

            <div>
              <label className="text-sm font-medium">Category *</label>
              <Select value={form.category} onValueChange={handleCategoryChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select article category/tab" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CHILDCARE_TIPS">Childcare Tips Tab</SelectItem>
                  <SelectItem value="FUNDING_COSTS">Funding & Costs Tab</SelectItem>
                  <SelectItem value="ACTIVITIES_LEARNING">Activities & Learning Tab</SelectItem>
                  <SelectItem value="NURSERY_UPDATES">Nursery Updates Tab</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                ✓ Article will appear in <strong>All Articles</strong> tab + the selected category tab
              </p>
            </div>
          </div>

          {/* Article Sections */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Article Content Sections</h3>
              <Button type="button" onClick={addSection} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" /> Add Section
              </Button>
            </div>

            {sections.map((section, index) => (
              <div key={index} className="border p-4 rounded-lg relative">
                <Button
                  type="button"
                  onClick={() => removeSection(index)}
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  disabled={sections.length === 1}
                >
                  <X className="h-4 w-4" />
                </Button>

                <div className="space-y-2">
                  <Input
                    placeholder={`Section ${index + 1} Heading`}
                    value={section.heading}
                    onChange={(e) => updateSection(index, "heading", e.target.value)}
                  />
                  <Textarea
                    placeholder={`Section ${index + 1} Description`}
                    value={section.paragraph}
                    onChange={(e) => updateSection(index, "paragraph", e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* List Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">List Section (Optional)</h3>
            
            <div>
              <label className="text-sm font-medium">List Heading</label>
              <Input
                placeholder="Enter list section heading"
                value={listHeading}
                onChange={(e) => setListHeading(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">List Items</label>
              <Button type="button" onClick={addListItem} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
            </div>

            {listItems.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder={`Item ${index + 1} Heading`}
                  value={item.heading}
                  onChange={(e) => updateListItem(index, "heading", e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={() => removeListItem(index)}
                  size="sm"
                  variant="ghost"
                  disabled={listItems.length === 1}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Tip Section */}
          <div>
            <label className="text-sm font-medium">Tip Text (Optional)</label>
            <Textarea
              placeholder="Enter helpful tip or callout text"
              value={tipText}
              onChange={(e) => setTipText(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          {/* Final Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Final Section (Optional)</h3>
            
            <div>
              <label className="text-sm font-medium">Final Heading</label>
              <Input
                placeholder="Closing heading"
                value={finalHeading}
                onChange={(e) => setFinalHeading(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Final Paragraph</label>
              <Textarea
                placeholder="Closing paragraph"
                value={finalParagraph}
                onChange={(e) => setFinalParagraph(e.target.value)}
                className="mt-1"
                rows={4}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Updating..." : "Update Article"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
