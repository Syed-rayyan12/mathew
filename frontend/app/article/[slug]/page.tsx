'use client'

import Footer from "@/components/landing-page/footer";
import Header from "@/components/landing-page/header";
import MiniNav from "@/components/landing-page/little-nav";
import { ArrowRight, Calendar, Download, FileText, FileDown, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { apiClient } from "@/lib/api/client";

interface Article {
    id: string;
    name: string;
    cardHeading: string;
    cardParagraph: string;
    slug: string;
    sections: { heading: string; paragraph: string }[];
    listHeading?: string;
    listItems?: { heading: string }[];
    tipText?: string;
    finalHeading?: string;
    finalParagraph?: string;
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

function getCategoryLabel(category: string) {
    const labels: Record<string, string> = {
        CHILDCARE_TIPS: 'Childcare Tips',
        FUNDING_COSTS: 'Funding & Costs',
        ACTIVITIES_LEARNING: 'Activities & Learning',
        NURSERY_UPDATES: 'Nursery Updates',
    };
    return labels[category] || category;
}

export default function ArticleDetailPage() {
    const params = useParams();
    const slug = params?.slug as string;
    const [article, setArticle] = useState<Article | null>(null);
    const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const downloadMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (slug) {
            fetchArticle();
        }
    }, [slug]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
                setShowDownloadMenu(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchArticle = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await apiClient.get<{ article: Article; relatedArticles: Article[] }>(`/articles/${slug}`);
            
            if (response.success && response.data) {
                setArticle(response.data.article);
                setRelatedArticles(response.data.relatedArticles || []);
            }
        } catch (err) {
            console.error('Failed to fetch article:', err);
            setError('Failed to load article');
        } finally {
            setLoading(false);
        }
    };

    const downloadAsText = () => {
        if (!article) return;

        let content = `${article.cardHeading}\n`;
        content += `${'='.repeat(article.cardHeading.length)}\n\n`;
        content += `Author: ${article.name}\n`;
        content += `Published: ${new Date(article.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n`;
        content += `Category: ${getCategoryLabel(article.category)}\n\n`;
        content += `${article.cardParagraph}\n\n`;

        article.sections?.forEach(section => {
            content += `${section.heading}\n`;
            content += `${'-'.repeat(section.heading.length)}\n`;
            content += `${section.paragraph}\n\n`;
        });

        if (article.listHeading && article.listItems && article.listItems.length > 0) {
            content += `${article.listHeading}\n`;
            content += `${'-'.repeat(article.listHeading.length)}\n`;
            article.listItems.forEach(item => {
                content += `• ${item.heading}\n`;
            });
            content += '\n';
        }

        if (article.tipText) {
            content += `Top Tip\n`;
            content += `--------\n`;
            content += `${article.tipText}\n\n`;
        }

        if (article.finalHeading && article.finalParagraph) {
            content += `${article.finalHeading}\n`;
            content += `${'-'.repeat(article.finalHeading.length)}\n`;
            content += `${article.finalParagraph}\n`;
        }

        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${article.slug}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setShowDownloadMenu(false);
    };

    const downloadAsPDF = async () => {
        if (!article) return;

        try {
            // Import jsPDF dynamically
            const { default: jsPDF } = await import('jspdf');
            const doc = new jsPDF();
            
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 20;
            const maxWidth = pageWidth - (margin * 2);
            let yPosition = margin;

            // Helper function to add text with automatic page breaks
            const addText = (text: string, fontSize: number, isBold: boolean = false) => {
                doc.setFontSize(fontSize);
                doc.setFont('helvetica', isBold ? 'bold' : 'normal');
                
                const lines = doc.splitTextToSize(text, maxWidth);
                
                lines.forEach((line: string) => {
                    if (yPosition + fontSize / 2 > pageHeight - margin) {
                        doc.addPage();
                        yPosition = margin;
                    }
                    doc.text(line, margin, yPosition);
                    yPosition += fontSize / 2 + 2;
                });
                yPosition += 5;
            };

            // Title
            addText(article.cardHeading, 18, true);
            
            // Metadata
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            doc.text(`Author: ${article.name}`, margin, yPosition);
            yPosition += 7;
            doc.text(`Published: ${new Date(article.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin, yPosition);
            yPosition += 7;
            doc.text(`Category: ${getCategoryLabel(article.category)}`, margin, yPosition);
            yPosition += 15;

            // Main paragraph
            addText(article.cardParagraph, 11);

            // Sections
            article.sections?.forEach(section => {
                addText(section.heading, 14, true);
                addText(section.paragraph, 11);
            });

            // List
            if (article.listHeading && article.listItems && article.listItems.length > 0) {
                addText(article.listHeading, 14, true);
                article.listItems.forEach(item => {
                    addText(`• ${item.heading}`, 11);
                });
            }

            // Tip
            if (article.tipText) {
                addText('Top Tip', 14, true);
                addText(article.tipText, 11);
            }

            // Final section
            if (article.finalHeading && article.finalParagraph) {
                addText(article.finalHeading, 14, true);
                addText(article.finalParagraph, 11);
            }

            doc.save(`${article.slug}.pdf`);
            setShowDownloadMenu(false);
        } catch (error) {
            console.error('Failed to generate PDF:', error);
            alert('Failed to download PDF. Please try text format instead.');
        }
    };

    const downloadAsHTML = () => {
        if (!article) return;

        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${article.cardHeading}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
        }
        h1 {
            color: #044A55;
            border-bottom: 3px solid #D5F7FF;
            padding-bottom: 10px;
        }
        h2 {
            color: #044A55;
            margin-top: 30px;
        }
        .metadata {
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .tip {
            background-color: #D5F7FF;
            padding: 15px;
            border-left: 4px solid #044A55;
            border-radius: 5px;
            margin: 20px 0;
        }
        .category {
            display: inline-block;
            background-color: #D5F7FF;
            color: #044A55;
            padding: 5px 15px;
            border-radius: 15px;
            font-size: 14px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="category">${getCategoryLabel(article.category)}</div>
    <h1>${article.cardHeading}</h1>
    <div class="metadata">
        <strong>Author:</strong> ${article.name}<br>
        <strong>Published:</strong> ${new Date(article.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
    </div>
    <p>${article.cardParagraph}</p>
`;

        article.sections?.forEach(section => {
            html += `<h2>${section.heading}</h2>
    <p>${section.paragraph}</p>
`;
        });

        if (article.listHeading && article.listItems && article.listItems.length > 0) {
            html += `<h2>${article.listHeading}</h2>
    <ul>
`;
            article.listItems.forEach(item => {
                html += `        <li>${item.heading}</li>
`;
            });
            html += `    </ul>
`;
        }

        if (article.tipText) {
            html += `<div class="tip">
        <strong>Top Tip:</strong> ${article.tipText}
    </div>
`;
        }

        if (article.finalHeading && article.finalParagraph) {
            html += `<h2>${article.finalHeading}</h2>
    <p>${article.finalParagraph}</p>
`;
        }

        html += `</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${article.slug}.html`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setShowDownloadMenu(false);
    };

    if (loading) {
        return (
            <>
                <MiniNav />
                <Header />
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Loading article...</p>
                    </div>
                </div>
                <Footer />
            </>
        );
    }

    if (error || !article) {
        return (
            <>
                <MiniNav />
                <Header />
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-2">Article not found</h2>
                        <p className="text-muted-foreground mb-4">{error || 'The article you are looking for does not exist.'}</p>
                        <Link href="/article" className="text-secondary hover:underline">
                            Back to Articles
                        </Link>
                    </div>
                </div>
                <Footer />
            </>
        );
    }

    return (
        <>
            <MiniNav />
            <Header />
            <div className="bg-white">
                <div
                    className="bg-cover bg-center bg-no-repeat relative h-[80vh] max-md:h-[60vh] max-sm:h-[50vh]"
                    style={{ backgroundImage: `url('${article.slugImage || '/images/detail.png'}')` }}
                >
                </div>
                <div className="relative px-24 max-lg:px-8 max-sm:px-4 -mt-40 max-sm:-mt-20 mb-20 z-10">
                    <div className="mx-auto p-6 max-sm:p-4 bg-white shadow-2xl rounded-2xl space-y-6 max-sm:space-y-4">
                            <div className="w-36 max-sm:w-fit h-10 max-sm:h-8 px-4 rounded-2xl flex justify-center items-center bg-[#D5F7FF]">
                                <span className="text-sm max-sm:text-xs font-medium text-secondary">{getCategoryLabel(article.category)}</span>
                            </div>

                            <h2 className="text-[59px] max-lg:text-5xl max-md:text-4xl max-sm:text-2xl font-medium leading-tight">
                                {article.cardHeading}
                            </h2>

                            <div className="flex max-sm:flex-col items-center max-sm:items-start justify-between gap-4 max-sm:gap-2 text-sm text-gray-600">
                                <div className="flex max-sm:flex-col gap-4 max-sm:gap-1">
                                    <span className="font-medium">{article.name}</span>
                                    <span className="max-sm:hidden">•</span>
                                    <span className="max-sm:text-xs">{new Date(article.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                </div>
                                <div className="relative flex items-center max-sm:self-end max-sm:mt-2" ref={downloadMenuRef}>
                                    <Download className="text-secondary w-6 h-6 max-sm:w-5 max-sm:h-5" />
                                    <button 
                                        onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                                        className="px-4 max-sm:px-2 py-2 bg-transparent text-secondary rounded-lg w-max max-sm:text-sm flex items-center gap-1"
                                    >
                                        Download
                                        <ChevronDown className="w-4 h-4" />
                                    </button>
                                    
                                    {showDownloadMenu && (
                                        <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                                            <button
                                                onClick={downloadAsPDF}
                                                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                                            >
                                                <FileDown className="w-4 h-4 text-secondary" />
                                                Download as PDF
                                            </button>
                                            <button
                                                onClick={downloadAsText}
                                                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                                            >
                                                <FileText className="w-4 h-4 text-secondary" />
                                                Download as Text
                                            </button>
                                            <button
                                                onClick={downloadAsHTML}
                                                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                                            >
                                                <FileDown className="w-4 h-4 text-secondary" />
                                                Download as HTML
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <section className="space-y-3 max-sm:space-y-2">
                                <p className="max-sm:text-sm">{article.cardParagraph}</p>
                            </section>

                            {article.sections && article.sections.length > 0 && article.sections.map((section, index) => (
                                <section key={index} className="space-y-3 max-sm:space-y-2">
                                    <h2 className="text-xl max-sm:text-lg font-medium">{section.heading}</h2>
                                    <p className="max-sm:text-sm">{section.paragraph}</p>
                                </section>
                            ))}

                            {article.listHeading && article.listItems && article.listItems.length > 0 && (
                                <section className="space-y-3 max-sm:space-y-2">
                                    <h2 className="text-xl max-sm:text-lg font-medium">{article.listHeading}</h2>
                                    <ul className="list-disc pl-6 max-sm:pl-4 space-y-1">
                                        {article.listItems.map((item, index) => (
                                            <li key={index} className="max-sm:text-sm">{item.heading}</li>
                                        ))}
                                    </ul>
                                </section>
                            )}

                            {article.tipText && (
                                <section className="p-4 max-sm:p-3 bg-[#D5F7FF] border rounded-lg shadow-sm">
                                    <h3 className="font-medium text-lg max-sm:text-base">Top Tip</h3>
                                    <p className="mt-1 max-sm:text-sm">{article.tipText}</p>
                                </section>
                            )}

                            {article.finalHeading && article.finalParagraph && (
                                <section className="space-y-3 max-sm:space-y-2 pb-6 max-sm:pb-4">
                                    <h2 className="text-xl max-sm:text-lg font-medium">{article.finalHeading}</h2>
                                    <p className="max-sm:text-sm">{article.finalParagraph}</p>
                                </section>
                            )}
                        </div>
                    </div>
                </div>

            {relatedArticles.length > 0 && (
                <div className="px-24 max-lg:px-8 max-sm:px-4 mt-4">
                    <h2 className="font-medium fon-sans text-[48px] max-md:text-4xl max-sm:text-3xl mb-4">Related Articles</h2>
                    <div className="grid grid-cols-3 max-lg:grid-cols-1 max-lg:gap-34 gap-6 mb-60 max-sm:mb-20">
                        {relatedArticles.map((relatedArticle) => (
                            <div
                                key={relatedArticle.id}
                                className="relative bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 h-80"
                            >
                                <Link href={`/article/${relatedArticle.slug}`}>
                                    <img 
                                        src={relatedArticle.cardImage || '/images/article-1.png'} 
                                        alt={relatedArticle.cardHeading} 
                                        className="w-full h-full object-cover rounded-xl" 
                                    />
                                </Link>
                                <div className="absolute top-60 left-0 right-0 px-4 py-6 mx-4 shadow-lg bg-white rounded-lg">
                                    <div className='flex items-center gap-2 mb-2'>
                                        <Calendar className='text-secondary' />
                                        <span className="text-sm text-muted-foreground">{formatTimeAgo(relatedArticle.publishedAt)}</span>
                                    </div>
                                    <h3 className="font-heading text-[24px] font-medium text-[#044A55]">{relatedArticle.cardHeading}</h3>
                                    <p className="font-ubuntu text-[14px] text-muted-foreground line-clamp-2">{relatedArticle.cardParagraph}</p>
                                    <div className='mt-4 flex items-center gap-2 pt-2'>
                                        <Link href={`/article/${relatedArticle.slug}`} className='text-[#044A55] font-heading font-medium text-[20px] uppercase'>Read More</Link>
                                        <ArrowRight className='text-[#044A55] size-5' />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <Footer />
        </>
    );
}