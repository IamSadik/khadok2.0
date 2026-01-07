exports.requireLogin = (role) => {
    return (req, res, next) => {
        if (!req.session.userId || req.session.role !== role) {
            // Check if this is an API request (returns JSON) or page request (redirect to HTML)
            if (req.path.startsWith('/api/')) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized. Please log in.',
                    requiresAuth: true
                });
            }
            return res.redirect('/login.html');
        }
        next();
    };
};

// Simple rider authentication using rider_id from request body/query
// This bypasses session for rider API calls
exports.requireRiderAuth = (req, res, next) => {
    const riderId = req.body.rider_id || req.query.rider_id || req.params.riderId;
    
    if (!riderId) {
        return res.status(400).json({
            success: false,
            message: 'Rider ID is required'
        });
    }
    
    // Store rider_id in request for use in controllers
    req.riderId = riderId;
    next();
};
