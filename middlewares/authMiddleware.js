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
