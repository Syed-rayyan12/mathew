'use client'

import { ArrowRight, Calendar } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { Button } from '../ui/button';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Article {
    id: string;
    name: string;
    cardHeading: string;
    cardParagraph: string;
    slug: string;
    cardImage?: string;
    slugImage?: string;
    category: string;
    publishedAt: string;
}

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

const ArticleTabs = () => {
    const [activeTab, setActiveTab] = useState('all')
    const [articles, setArticles] = useState<Article[]>([])
    const [loading, setLoading] = useState(true)

    const tabs = [
        { id: 'all', label: 'All Articles' },
        { id: 'CHILDCARE_TIPS', label: 'Childcare Tips' },
        { id: 'FUNDING_COSTS', label: 'Funding & Costs' },
        { id: 'ACTIVITIES_LEARNING', label: 'Activities & Learning' },
        { id: 'NURSERY_UPDATES', label: 'Nursery Updates' },
    ]

    useEffect(() => {
        fetchArticles()
    }, [])

    const fetchArticles = async () => {
        try {
            setLoading(true)
            const response = await apiClient.get<{ articles: Article[]; pagination: any }>('/articles?limit=100')
            
            if (response.success && response.data) {
                setArticles(response.data.articles)
            }
        } catch (error) {
            console.error('Failed to fetch articles:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredArticles = activeTab === 'all' 
        ? articles 
        : articles.filter(article => article.category === activeTab)

    return (
        <div className="w-full px-24 max-sm:px-8 mx-auto py-8 bg-white px-6">
            {/* Mobile Select Dropdown - visible only on small screens */}
            <div className="md:hidden mb-4">
                <Select value={activeTab} onValueChange={setActiveTab}>
                    <SelectTrigger className="w-full h-12">
                        <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                        {tabs.map((tab) => (
                            <SelectItem key={tab.id} value={tab.id}>
                                {tab.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Tablet Horizontal Scroll - visible on md screens */}
            <div className="hidden md:flex lg:hidden overflow-x-auto scrollbar-hide gap-4 pb-2">
                <div className="flex gap-4 min-w-max">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-3 rounded-md font-medium cursor-pointer transition-all duration-200 whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-secondary text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Desktop Tabs - visible on large screens */}
            <div className="hidden lg:flex justify-center gap-4">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-6 py-3 rounded-md font-medium cursor-pointer transition-all duration-200 ${activeTab === tab.id
                            ? 'bg-secondary text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="mt-8 mb-44">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary mx-auto mb-4"></div>
                            <p className="text-muted-foreground">Loading articles...</p>
                        </div>
                    </div>
                ) : filteredArticles.length === 0 ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                            <p className="text-xl text-muted-foreground mb-2">No articles found</p>
                            <p className="text-sm text-gray-500">Check back later for new content</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 max-lg:grid-cols-1 max-lg:gap-8 gap-6">
                        {filteredArticles.map((article) => (
                            <div
                                key={article.id}
                                className="relative bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 h-80"
                            >
                                <Link href={`/article/${article.slug}`}>
                                    <img 
                                        src={article.cardImage || '/images/article-1.png'} 
                                        alt={article.cardHeading} 
                                        className="w-full h-full object-cover rounded-xl" 
                                    />
                                </Link>
                                <div className="absolute top-60 left-0 right-0 px-4 py-6 mx-4 shadow-lg bg-white rounded-lg">
                                    <div className='flex items-center gap-2 mb-2'>
                                        <Calendar className='text-secondary' />
                                        <span className="text-sm text-muted-foreground">{formatTimeAgo(article.publishedAt)}</span>
                                    </div>
                                    <h3 className="font-heading text-[24px] font-medium text-foreground">{article.cardHeading}</h3>
                                    <p className="font-ubuntu text-[14px] text-muted-foreground line-clamp-2">{article.cardParagraph}</p>
                                    <Link href={`/article/${article.slug}`}>
                                        <div className='mt-4 flex items-center pt-2'>
                                            <Button className='text-[#044A55] font-heading font-medium text-[20px] uppercase bg-transparent hover:bg-transparent cursor-pointer'>Read More</Button>
                                            <ArrowRight className='text-[#044A55] size-5 cursor-pointer' />
                                        </div>
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default ArticleTabs