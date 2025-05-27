exports.requireLogin = (role) => {
    return (req, res, next) => {
        if (!req.session.userId || req.session.role !== role) {
            return res.redirect('/login.html');
        }
        next();
    };
};
