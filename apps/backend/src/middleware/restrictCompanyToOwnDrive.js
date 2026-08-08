// A COMPANY-role caller is scoped to exactly one drive (req.user.driveId,
// set from their JWT — never client-supplied). Any route that takes a drive
// id as a param must apply this after requireAuth to keep a company official
// from viewing or acting on another company's drive at the same university.
// 404s rather than 403s so it doesn't confirm the other drive exists.
function restrictCompanyToOwnDrive(paramName) {
  return (req, res, next) => {
    if (req.user.role === 'COMPANY' && req.user.driveId !== req.params[paramName]) {
      return res.status(404).json({ error: 'Drive not found' });
    }
    next();
  };
}

module.exports = restrictCompanyToOwnDrive;
