const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const c = require('../controllers/recurringController');

router.get('/:companyId/recurring', auth, c.listTemplates);
router.post('/:companyId/recurring', auth, c.createTemplate);
router.get('/:companyId/recurring/:id', auth, c.getTemplate);
router.put('/:companyId/recurring/:id', auth, c.updateTemplate);
router.post('/:companyId/recurring/:id/toggle', auth, c.toggleActive);
router.post('/:companyId/recurring/:id/run', auth, c.runTemplate);
router.delete('/:companyId/recurring/:id', auth, c.deleteTemplate);

module.exports = router;
