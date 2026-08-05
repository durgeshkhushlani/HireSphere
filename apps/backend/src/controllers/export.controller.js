const exportService = require('../services/export.service');

async function exportApplicantsForDrive(req, res) {
  const { workbook, drive } = await exportService.exportForDrive(
    req.params.driveId,
    req.user.universityId,
    req.body
  );

  const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
  const filename = `${slug(drive.company.name)}-${slug(drive.title)}.xlsx`;
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
}

module.exports = { exportApplicantsForDrive };
