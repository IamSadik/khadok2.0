// /middlewares/sessionMiddleware.js

module.exports = (req, res, next) => {
  const publicRoutes = [
    '/api/signup/consumer',
    '/api/signup/rider',
    '/api/signup/stakeholder',
    '/api/auth/login',
    '/api/auth/logout',
    '/api/auth/check',
    '/api/map'
  ];

  if (publicRoutes.includes(req.path)) {
    return next();
  }

  if (req.session && req.session.userId) {
    return next();
  }

  // Not authenticated
  return res.redirect('/login.html');  // or res.status(401).json({ message: 'Unauthorized' });
};
