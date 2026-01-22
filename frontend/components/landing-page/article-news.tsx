'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';
import { motion, useInView } from 'framer-motion';

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

const ArticleNews = () => {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.2 });

    // Fallback data if API fails
    const fallbackArticles: Article[] = [
        {
            id: '1',
            name: 'Tips for Choosing the Right Nursery',
            cardHeading: 'Tips for Choosing the Right Nursery',
            cardParagraph: 'Discover what really matters when selecting a nursery for your little one — from staff qualifications to emotional wellbeing.',
            slug: 'tips-choosing-nursery',
            cardImage: '/images/nursery-1.png',
            category: 'NURSERY_UPDATES',
            publishedAt: 'August 15, 2023',
        },
        {
            id: '2',
            name: 'Early Learning Activities at Home',
            cardHeading: 'Early Learning Activities at Home',
            cardParagraph: 'Simple yet effective activities to support your child\'s development and learning while having fun together.',
            slug: 'early-learning-home',
            cardImage: '/images/nursery-2.png',
            category: 'ACTIVITIES_LEARNING',
            publishedAt: 'August 10, 2023',
        },
        {
            id: '3',
            name: 'Understanding Nursery Costs',
            cardHeading: 'Understanding Nursery Costs',
            cardParagraph: 'A guide to nursery fees, funding options, and how to budget for quality childcare for your family.',
            slug: 'nursery-costs-guide',
            cardImage: '/images/nursery-3.png',
            category: 'FUNDING_COSTS',
            publishedAt: 'August 5, 2023',
        },
    ];

    useEffect(() => {
        fetchArticles();
    }, []);

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


    const displayArticles = articles.length > 0 ? articles : fallbackArticles;

    return (
        <div className="py-16 px-24 max-sm:px-4 relative bg-white" ref={ref}>
            <div>
                <motion.div 
                    className='text-center'
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.8 }}
                >
                    <p className="text-primary font-medium font-heading text-2xl">Articles & News</p>
                    <h2 className="text-4xl md:text-5xl font-heading font-medium mb-2 text-foreground leading-tight">
                        Latest Insights & <span className="text-secondary">Nursery</span> News
                    </h2>
                    <p className='text-[16px] font-ubuntu mb-9'> Fresh stories, helpful tips, and exciting news.
                    </p>
                </motion.div>
                
                <div className='mx-auto px-36 max-2xl:px-6 max-sm:px-4'>
                    {loading ? (
                        <div className="flex justify-center items-center h-80">
                            <p className="text-muted-foreground">Loading articles...</p>
                        </div>
                    ) : error && articles.length === 0 ? (
                        <div className="flex justify-center items-center h-80">
                            <div className="text-center">
                                <p className="text-muted-foreground mb-4">{error}</p>
                                <p className="text-sm text-gray-500">Showing featured articles instead</p>
                            </div>
                        </div>
                    ) : displayArticles.length > 0 ? (
                        <div className="grid grid-cols-3 max-lg:grid-cols-1 max-lg:gap-44 max-sm:gap-58 gap-6">
                            {displayArticles.map((article, index) => (
                                <motion.div
                                    key={article.id}
                                    className="relative bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 h-80"
                                    initial={{ opacity: 0, y: 50 }}
                                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
                                    transition={{ duration: 0.6, delay: 0.2 + index * 0.2 }}
                                    whileHover={{ y: -10 }}
                                >
                                    <img 
                                        src={article.cardImage || '/images/article-placeholder.png'} 
                                        alt={article.name} 
                                        className="w-full h-full object-cover rounded-xl"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = '/images/article-placeholder.png';
                                        }}
                                    />
                                    <div className="absolute top-60 left-0 right-0 px-4 py-6 mx-4 shadow-lg bg-white rounded-lg">
                                        <div className='flex items-center gap-2 mb-2'>
                                            <Calendar className='text-secondary w-4 h-4' />
                                            <span className="text-sm text-muted-foreground">
                                                {new Date(article.publishedAt).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                        <h3 className="font-heading text-[24px] font-medium text-[#044A55] line-clamp-2">
                                            {article.cardHeading || article.name}
                                        </h3>
                                        <p className="font-ubuntu text-[14px] text-muted-foreground line-clamp-2">
                                            {article.cardParagraph}
                                        </p>
                                        <div className='mt-4 flex items-center gap-2 pt-2'>
                                            <Link 
                                                href={`/article/${article.slug}`} 
                                                className='text-[#044A55] font-heading font-medium text-[20px] uppercase hover:underline'
                                            >
                                                Read More
                                            </Link>
                                            <ArrowRight className='text-[#044A55] size-5' />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex justify-center items-center h-80">
                            <p className="text-muted-foreground">No articles available at the moment</p>
                        </div>
                    )}
                </div>
            </div>

            <div className='flex justify-center items-center mt-44'>
                <Link href="/article">
                    <Button className="mt-20 bg-primary hover:bg-transparent hover:text-primary border-2 transition-all duration-300 cursor-pointer border-primary text-white rounded-[6px] px-10 py-5">
                        View All
                    </Button>
                </Link>
            </div>
        </div>
    );
};

export default ArticleNews;