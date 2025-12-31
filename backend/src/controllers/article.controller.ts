import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { NotFoundError, BadRequestError } from '../utils';
import { generateShortId } from '../utils/id-generator';
import { AuthRequest } from '../middleware';

export const getAllArticles = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { category, page = 1, limit = 10 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      isPublished: true,
    };

    if (category) {
      where.category = category;
    }

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { publishedAt: 'desc' },
      }),
      prisma.article.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        articles,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getArticleBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { slug } = req.params;

    const article = await prisma.article.findUnique({
      where: { slug },
    });

    if (!article) {
      throw new NotFoundError('Article not found');
    }

    // Get related articles (same category, excluding current)
    const relatedArticles = await prisma.article.findMany({
      where: {
        category: article.category,
        id: { not: article.id },
        isPublished: true,
      },
      take: 3,
      orderBy: {
        publishedAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: {
        article,
        relatedArticles,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createArticle = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      name,
      cardHeading,
      cardParagraph,
      sections,
      listHeading,
      listItems,
      tipText,
      finalHeading,
      finalParagraph,
      cardImage,
      slugImage,
      category,
    } = req.body;

    // Validate required fields
    if (!name || !cardHeading || !cardParagraph) {
      throw new BadRequestError('Name, card heading, and card paragraph are required');
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Check if slug already exists
    const existingArticle = await prisma.article.findUnique({
      where: { slug },
    });

    if (existingArticle) {
      throw new BadRequestError('An article with this name already exists');
    }

    // Generate custom short ID
    const articleId = await generateShortId('ART');

    // Create article
    const article = await prisma.article.create({
      data: {
        id: articleId,
        name,
        cardHeading,
        cardParagraph,
        slug,
        sections: sections || [],
        listHeading: listHeading || null,
        listItems: listItems || [],
        tipText: tipText || null,
        finalHeading: finalHeading || null,
        finalParagraph: finalParagraph || null,
        cardImage: cardImage || null,
        slugImage: slugImage || null,
        category: category || 'CHILDCARE_TIPS',
        isPublished: true,
        publishedAt: new Date(),
      },
    });

    res.status(201).json({
      success: true,
      message: 'Article created successfully',
      data: article,
    });
  } catch (error) {
    next(error);
  }
};

export const updateArticle = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if article exists
    const existingArticle = await prisma.article.findUnique({
      where: { id },
    });

    if (!existingArticle) {
      throw new NotFoundError('Article not found');
    }

    // If name is being updated, regenerate slug
    if (updateData.name && updateData.name !== existingArticle.name) {
      const newSlug = updateData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Check if new slug already exists
      const slugExists = await prisma.article.findFirst({
        where: {
          slug: newSlug,
          id: { not: id },
        },
      });

      if (slugExists) {
        throw new BadRequestError('An article with this name already exists');
      }

      updateData.slug = newSlug;
    }

    // Update article
    const article = await prisma.article.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      message: 'Article updated successfully',
      data: article,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteArticle = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Check if article exists
    const article = await prisma.article.findUnique({
      where: { id },
    });

    if (!article) {
      throw new NotFoundError('Article not found');
    }

    // Delete article
    await prisma.article.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Article deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
