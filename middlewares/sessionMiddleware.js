module.exports = function (req, res, next) {
    const publicRoutes = ['/api/signup/consumer', '/api/signup/rider', '/api/signup/stakeholder'];

    if (publicRoutes.includes(req.path)) {
        return next();  // ✅ Allow public routes
    }

    if (req.session && req.session.user) {
        return next();  // ✅ Allow if session exists
    } else {
        return res.status(401).json({ message: 'Unauthorized access.' });
    }
};
