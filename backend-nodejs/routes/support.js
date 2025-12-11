import express from 'express';
const router = express.Router();

// Create support ticket
router.post('/tickets', async (req, res) => {
  try {
    const { subject, description, category, priority = 'medium', attachments } = req.body;
    const userId = req.user?.id;

    const ticketId = await req.db.run(`
      INSERT INTO support_tickets (
        user_id, subject, description, category, priority, status, created_at
      ) VALUES (?, ?, ?, ?, ?, 'open', ?)
    `, [userId, subject, description, category, priority, new Date().toISOString()]);

    res.json({
      success: true,
      ticketId: ticketId,
      message: 'Support ticket created successfully'
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create support ticket'
    });
  }
});

// Get user tickets
router.get('/tickets', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { status, category } = req.query;
    
    let whereClause = 'WHERE user_id = ?';
    const params = [userId];
    
    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }
    
    if (category) {
      whereClause += ' AND category = ?';
      params.push(category);
    }

    const tickets = await req.db.all(`
      SELECT * FROM support_tickets
      ${whereClause}
      ORDER BY created_at DESC
    `, params);

    res.json({
      success: true,
      tickets
    });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tickets'
    });
  }
});

// Get ticket details
router.get('/tickets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const ticket = await req.db.get(`
      SELECT * FROM support_tickets
      WHERE id = ? AND user_id = ?
    `, [id, userId]);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Get ticket messages
    const messages = await req.db.all(`
      SELECT * FROM ticket_messages
      WHERE ticket_id = ?
      ORDER BY created_at ASC
    `, [id]);

    res.json({
      success: true,
      ticket,
      messages
    });
  } catch (error) {
    console.error('Get ticket details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get ticket details'
    });
  }
});

// Add message to ticket
router.post('/tickets/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const userId = req.user?.id;

    // Verify ticket ownership
    const ticket = await req.db.get(`
      SELECT * FROM support_tickets
      WHERE id = ? AND user_id = ?
    `, [id, userId]);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    await req.db.run(`
      INSERT INTO ticket_messages (
        ticket_id, sender_type, sender_id, message, created_at
      ) VALUES (?, 'user', ?, ?, ?)
    `, [id, userId, message, new Date().toISOString()]);

    // Update ticket last activity
    await req.db.run(`
      UPDATE support_tickets SET updated_at = ? WHERE id = ?
    `, [new Date().toISOString(), id]);

    res.json({
      success: true,
      message: 'Message added to ticket'
    });
  } catch (error) {
    console.error('Add ticket message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add message'
    });
  }
});

// Live chat endpoints
router.post('/chat/start', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    // Check for existing active chat session
    const existingSession = await req.db.get(`
      SELECT * FROM chat_sessions
      WHERE user_id = ? AND status = 'active'
    `, [userId]);

    if (existingSession) {
      return res.json({
        success: true,
        sessionId: existingSession.id,
        status: 'existing'
      });
    }

    // Create new chat session
    const sessionId = await req.db.run(`
      INSERT INTO chat_sessions (
        user_id, status, started_at
      ) VALUES (?, 'waiting', ?)
    `, [userId, new Date().toISOString()]);

    res.json({
      success: true,
      sessionId: sessionId,
      status: 'created'
    });
  } catch (error) {
    console.error('Start chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start chat session'
    });
  }
});

// Get chat history
router.get('/chat/:sessionId/messages', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;

    // Verify session ownership
    const session = await req.db.get(`
      SELECT * FROM chat_sessions
      WHERE id = ? AND user_id = ?
    `, [sessionId, userId]);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found'
      });
    }

    const messages = await req.db.all(`
      SELECT * FROM chat_messages
      WHERE session_id = ?
      ORDER BY created_at ASC
    `, [sessionId]);

    res.json({
      success: true,
      session,
      messages
    });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chat history'
    });
  }
});

// FAQ endpoints
router.get('/faq', async (req, res) => {
  try {
    const { category, search } = req.query;
    
    let whereClause = 'WHERE published = 1';
    const params = [];
    
    if (category) {
      whereClause += ' AND category = ?';
      params.push(category);
    }
    
    if (search) {
      whereClause += ' AND (question LIKE ? OR answer LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const faqs = await req.db.all(`
      SELECT * FROM faq_items
      ${whereClause}
      ORDER BY category, sort_order ASC
    `, params);

    // Group by category
    const groupedFaqs = faqs.reduce((acc, faq) => {
      if (!acc[faq.category]) {
        acc[faq.category] = [];
      }
      acc[faq.category].push(faq);
      return acc;
    }, {});

    res.json({
      success: true,
      faqs: groupedFaqs
    });
  } catch (error) {
    console.error('Get FAQ error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get FAQ items'
    });
  }
});

// Search support content
router.get('/search', async (req, res) => {
  try {
    const { q: query, limit = 10 } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    // Search FAQ
    const faqResults = await req.db.all(`
      SELECT 'faq' as type, id, question as title, answer as content, category
      FROM faq_items
      WHERE (question LIKE ? OR answer LIKE ?) AND published = 1
      LIMIT ?
    `, [`%${query}%`, `%${query}%`, limit]);

    // Search help articles
    const articleResults = await req.db.all(`
      SELECT 'article' as type, id, title, content, category
      FROM help_articles
      WHERE (title LIKE ? OR content LIKE ?) AND published = 1
      LIMIT ?
    `, [`%${query}%`, `%${query}%`, limit]);

    const results = [...faqResults, ...articleResults]
      .slice(0, limit)
      .map(result => ({
        ...result,
        relevance: this.calculateRelevance(result.title + ' ' + result.content, query)
      }))
      .sort((a, b) => b.relevance - a.relevance);

    res.json({
      success: true,
      results,
      query,
      total: results.length
    });
  } catch (error) {
    console.error('Search support error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search support content'
    });
  }
});

// Support statistics (admin only)
router.get('/stats', async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    
    let timeFilter = "datetime('now', '-30 days')";
    if (range === '7d') timeFilter = "datetime('now', '-7 days')";
    else if (range === '24h') timeFilter = "datetime('now', '-1 day')";

    const stats = await req.db.get(`
      SELECT 
        COUNT(CASE WHEN status = 'open' THEN 1 END) as openTickets,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolvedTickets,
        COUNT(CASE WHEN priority = 'high' THEN 1 END) as highPriorityTickets,
        AVG(CASE WHEN resolved_at IS NOT NULL THEN 
          (julianday(resolved_at) - julianday(created_at)) * 24 
        END) as avgResolutionHours
      FROM support_tickets
      WHERE created_at > ${timeFilter}
    `);

    const categoryStats = await req.db.all(`
      SELECT category, COUNT(*) as count
      FROM support_tickets
      WHERE created_at > ${timeFilter}
      GROUP BY category
      ORDER BY count DESC
    `);

    res.json({
      success: true,
      stats,
      categoryStats
    });
  } catch (error) {
    console.error('Get support stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get support statistics'
    });
  }
});

// Helper function to calculate search relevance
function calculateRelevance(text, query) {
  const words = query.toLowerCase().split(' ');
  const content = text.toLowerCase();
  
  let score = 0;
  words.forEach(word => {
    const count = (content.match(new RegExp(word, 'g')) || []).length;
    score += count;
  });
  
  return score;
}

export default router;