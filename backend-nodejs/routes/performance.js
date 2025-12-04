import express from 'express';
const router = express.Router();

// Performance metrics endpoint
router.post('/metrics', async (req, res) => {
  try {
    const { name, value, rating, delta, id, url, userAgent } = req.body;
    
    await req.db.run(`
      INSERT INTO performance_metrics (
        metric_name, metric_value, rating, delta, metric_id, url, user_agent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [name, value, rating, delta, id, url, userAgent, new Date().toISOString()]);

    res.json({ success: true });
  } catch (error) {
    console.error('Performance metric error:', error);
    res.status(500).json({ success: false });
  }
});

// Error tracking endpoint
router.post('/errors', async (req, res) => {
  try {
    const { message, filename, lineno, colno, stack, url, userAgent } = req.body;
    
    await req.db.run(`
      INSERT INTO performance_errors (
        error_message, filename, line_number, column_number, stack_trace, url, user_agent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [message, filename, lineno, colno, stack, url, userAgent, new Date().toISOString()]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking error:', error);
    res.status(500).json({ success: false });
  }
});

// Batch metrics endpoint
router.post('/batch', async (req, res) => {
  try {
    const { webVitals, performance, url, timestamp } = req.body;
    
    // Store batch metrics
    await req.db.run(`
      INSERT INTO performance_batch (
        web_vitals, performance_data, url, timestamp, created_at
      ) VALUES (?, ?, ?, ?, ?)
    `, [
      JSON.stringify(webVitals),
      JSON.stringify(performance),
      url,
      timestamp,
      new Date().toISOString()
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error('Batch metrics error:', error);
    res.status(500).json({ success: false });
  }
});

// Get performance analytics (admin only)
router.get('/analytics', async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;
    
    let timeFilter = "datetime('now', '-1 day')";
    if (timeRange === '7d') timeFilter = "datetime('now', '-7 days')";
    else if (timeRange === '30d') timeFilter = "datetime('now', '-30 days')";

    // Get Web Vitals averages
    const webVitals = await req.db.all(`
      SELECT 
        metric_name,
        AVG(metric_value) as avg_value,
        MIN(metric_value) as min_value,
        MAX(metric_value) as max_value,
        COUNT(*) as count
      FROM performance_metrics
      WHERE created_at > ${timeFilter}
      GROUP BY metric_name
    `);

    // Get error statistics
    const errorStats = await req.db.get(`
      SELECT 
        COUNT(*) as total_errors,
        COUNT(DISTINCT error_message) as unique_errors,
        COUNT(DISTINCT url) as affected_pages
      FROM performance_errors
      WHERE created_at > ${timeFilter}
    `);

    // Get top errors
    const topErrors = await req.db.all(`
      SELECT 
        error_message,
        COUNT(*) as count,
        url
      FROM performance_errors
      WHERE created_at > ${timeFilter}
      GROUP BY error_message, url
      ORDER BY count DESC
      LIMIT 10
    `);

    // Get performance trends
    const trends = await req.db.all(`
      SELECT 
        DATE(created_at) as date,
        metric_name,
        AVG(metric_value) as avg_value
      FROM performance_metrics
      WHERE created_at > ${timeFilter}
      GROUP BY DATE(created_at), metric_name
      ORDER BY date ASC
    `);

    res.json({
      success: true,
      analytics: {
        webVitals,
        errorStats,
        topErrors,
        trends
      }
    });
  } catch (error) {
    console.error('Performance analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get performance analytics'
    });
  }
});

// Real-time performance monitoring
router.get('/realtime', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  const sendData = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Send initial data
  try {
    const recentMetrics = await req.db.all(`
      SELECT * FROM performance_metrics
      WHERE created_at > datetime('now', '-1 hour')
      ORDER BY created_at DESC
      LIMIT 20
    `);

    sendData({ type: 'initial', data: recentMetrics });
  } catch (error) {
    sendData({ type: 'error', message: error.message });
  }

  // Set up real-time updates (simplified)
  const interval = setInterval(async () => {
    try {
      const newMetrics = await req.db.all(`
        SELECT * FROM performance_metrics
        WHERE created_at > datetime('now', '-5 minutes')
        ORDER BY created_at DESC
      `);

      if (newMetrics.length > 0) {
        sendData({ type: 'update', data: newMetrics });
      }
    } catch (error) {
      sendData({ type: 'error', message: error.message });
    }
  }, 30000); // Update every 30 seconds

  req.on('close', () => {
    clearInterval(interval);
  });
});

export default router;