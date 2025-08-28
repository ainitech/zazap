import { Tag, User, Ticket, TicketTag } from '../models/index.js';
import { Op } from 'sequelize';

const tagController = {
  // Get all tags with filters and search
  async getTags(req, res) {
    try {
      console.log('🏷️ Backend TagController: Requisição recebida, user:', req.user);
      
      const {
        page = 1,
        limit = 50,
        search,
        category,
        isActive = true,
        sortBy = 'name',
        sortOrder = 'ASC'
      } = req.query;

      const offset = (page - 1) * limit;
      const where = { isActive };

      // Add search filters
      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ];
      }

      if (category) {
        where.category = category;
      }

      // Define valid sort fields
      const validSortFields = ['name', 'category', 'priority', 'usageCount', 'createdAt'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'name';

      console.log('🏷️ Backend TagController: Buscando com where:', where);
      const tags = await Tag.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name', 'email'],
            required: false
          }
        ],
        order: [[sortField, sortOrder.toUpperCase()]],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      console.log('🏷️ Backend TagController: Encontradas', tags.count, 'tags, retornando', tags.rows.length, 'itens');

      // Get categories for filtering
      const categories = await Tag.findAll({
        attributes: ['category'],
        where: { 
          isActive: true,
          category: { [Op.not]: null }
        },
        group: ['category'],
        raw: true
      });

      res.json({
        tags: tags.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(tags.count / limit),
          totalItems: tags.count,
          itemsPerPage: parseInt(limit)
        },
        categories: categories.map(c => c.category).filter(Boolean)
      });
    } catch (error) {
      console.error('Error fetching tags:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Get tag by ID
  async getTag(req, res) {
    try {
      const { id } = req.params;

      const tag = await Tag.findByPk(id, {
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name', 'email']
          },
          {
            model: Ticket,
            as: 'tickets',
            attributes: ['id', 'subject', 'status'],
            through: { attributes: ['addedAt'] },
            limit: 10,
            order: [['createdAt', 'DESC']]
          }
        ]
      });

      if (!tag) {
        return res.status(404).json({ error: 'Tag não encontrada' });
      }

      res.json(tag);
    } catch (error) {
      console.error('Error fetching tag:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Create new tag
  async createTag(req, res) {
    try {
      const { name, description, color, category, priority } = req.body;
      const userId = req.user?.id;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Nome da tag é obrigatório' });
      }

      // Check if tag already exists
      const existingTag = await Tag.findOne({
        where: { name: name.trim() }
      });

      if (existingTag) {
        return res.status(409).json({ error: 'Uma tag com este nome já existe' });
      }

      const tag = await Tag.create({
        name: name.trim(),
        description: description?.trim() || null,
        color: color || 'bg-blue-500',
        category: category?.trim() || null,
        priority: priority || 1,
        createdBy: userId
      });

      // Fetch the created tag with creator info
      const newTag = await Tag.findByPk(tag.id, {
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name', 'email']
          }
        ]
      });

      res.status(201).json(newTag);
    } catch (error) {
      console.error('Error creating tag:', error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ error: 'Uma tag com este nome já existe' });
      }
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Update tag
  async updateTag(req, res) {
    try {
      const { id } = req.params;
      const { name, description, color, category, priority, isActive } = req.body;

      const tag = await Tag.findByPk(id);

      if (!tag) {
        return res.status(404).json({ error: 'Tag não encontrada' });
      }

      if (name && name.trim() !== tag.name) {
        // Check if new name already exists
        const existingTag = await Tag.findOne({
          where: { 
            name: name.trim(),
            id: { [Op.not]: id }
          }
        });

        if (existingTag) {
          return res.status(409).json({ error: 'Uma tag com este nome já existe' });
        }
      }

      await tag.update({
        name: name?.trim() || tag.name,
        description: description?.trim() !== undefined ? description?.trim() : tag.description,
        color: color || tag.color,
        category: category?.trim() !== undefined ? category?.trim() : tag.category,
        priority: priority !== undefined ? priority : tag.priority,
        isActive: isActive !== undefined ? isActive : tag.isActive
      });

      // Fetch updated tag with creator info
      const updatedTag = await Tag.findByPk(id, {
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name', 'email']
          }
        ]
      });

      res.json(updatedTag);
    } catch (error) {
      console.error('Error updating tag:', error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ error: 'Uma tag com este nome já existe' });
      }
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Delete tag (soft delete)
  async deleteTag(req, res) {
    try {
      const { id } = req.params;

      const tag = await Tag.findByPk(id);

      if (!tag) {
        return res.status(404).json({ error: 'Tag não encontrada' });
      }

      // Check if tag is being used
      const usageCount = await TicketTag.count({
        where: { tagId: id }
      });

      if (usageCount > 0) {
        // Soft delete - just deactivate
        await tag.update({ isActive: false });
        return res.json({ message: 'Tag desativada com sucesso (estava sendo usada em tickets)' });
      }

      // Hard delete if not being used
      await tag.destroy();
      res.json({ message: 'Tag excluída com sucesso' });
    } catch (error) {
      console.error('Error deleting tag:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Get popular tags
  async getPopularTags(req, res) {
    try {
      const { limit = 10 } = req.query;

      const tags = await Tag.getPopularTags(parseInt(limit));

      res.json(tags);
    } catch (error) {
      console.error('Error fetching popular tags:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Get tags by category
  async getTagsByCategory(req, res) {
    try {
      const { category } = req.params;

      const tags = await Tag.getByCategory(category);

      res.json(tags);
    } catch (error) {
      console.error('Error fetching tags by category:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Search tags
  async searchTags(req, res) {
    try {
      const { q } = req.query;

      if (!q || q.trim().length < 2) {
        return res.status(400).json({ error: 'Termo de busca deve ter pelo menos 2 caracteres' });
      }

      const tags = await Tag.searchTags(q.trim());

      res.json(tags);
    } catch (error) {
      console.error('Error searching tags:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Add tag to ticket
  async addTagToTicket(req, res) {
    try {
      const { ticketId, tagId } = req.params;
      const userId = req.user?.id;

      // Check if ticket exists
      const ticket = await Ticket.findByPk(ticketId);
      if (!ticket) {
        return res.status(404).json({ error: 'Ticket não encontrado' });
      }

      // Check if tag exists
      const tag = await Tag.findByPk(tagId);
      if (!tag) {
        return res.status(404).json({ error: 'Tag não encontrada' });
      }

      // Check if tag is already assigned to ticket
      const existingAssignment = await TicketTag.findOne({
        where: { ticketId, tagId }
      });

      if (existingAssignment) {
        return res.status(409).json({ error: 'Tag já está atribuída a este ticket' });
      }

      // Add tag to ticket
      await TicketTag.create({
        ticketId,
        tagId,
        addedBy: userId
      });

      // Increment usage count
      await tag.incrementUsage();

      res.json({ message: 'Tag adicionada ao ticket com sucesso' });
    } catch (error) {
      console.error('Error adding tag to ticket:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Remove tag from ticket
  async removeTagFromTicket(req, res) {
    try {
      const { ticketId, tagId } = req.params;

      const ticketTag = await TicketTag.findOne({
        where: { ticketId, tagId }
      });

      if (!ticketTag) {
        return res.status(404).json({ error: 'Tag não está atribuída a este ticket' });
      }

      await ticketTag.destroy();

      // Decrement usage count
      const tag = await Tag.findByPk(tagId);
      if (tag) {
        await tag.decrementUsage();
      }

      res.json({ message: 'Tag removida do ticket com sucesso' });
    } catch (error) {
      console.error('Error removing tag from ticket:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Get ticket tags
  async getTicketTags(req, res) {
    try {
      const { ticketId } = req.params;

      const ticketTags = await TicketTag.findAll({
        where: { ticketId },
        include: [
          {
            model: Tag,
            as: 'tag',
            where: { isActive: true }
          },
          {
            model: User,
            as: 'addedByUser',
            attributes: ['id', 'name']
          }
        ],
        order: [['addedAt', 'DESC']]
      });

      res.json(ticketTags);
    } catch (error) {
      console.error('Error fetching ticket tags:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  // Get tag statistics
  async getTagStats(req, res) {
    try {
      const stats = {
        total: await Tag.count({ where: { isActive: true } }),
        totalInactive: await Tag.count({ where: { isActive: false } }),
        categories: await Tag.count({
          where: { isActive: true, category: { [Op.not]: null } },
          distinct: true,
          col: 'category'
        }),
        mostUsed: await Tag.findOne({
          where: { isActive: true },
          order: [['usageCount', 'DESC']]
        }),
        recentlyCreated: await Tag.count({
          where: {
            isActive: true,
            createdAt: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          }
        }),
        byCategory: await Tag.findAll({
          attributes: [
            'category',
            [Tag.sequelize.fn('COUNT', Tag.sequelize.col('id')), 'count']
          ],
          where: { 
            isActive: true,
            category: { [Op.not]: null }
          },
          group: ['category'],
          raw: true
        })
      };

      res.json(stats);
    } catch (error) {
      console.error('Error fetching tag stats:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};

export default tagController;
