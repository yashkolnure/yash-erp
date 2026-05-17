const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const c = require('../controllers/crmController');

router.post('/:companyId/crm/leads', auth, c.createLead);
router.get('/:companyId/crm/leads', auth, c.listLeads);
router.get('/:companyId/crm/pipeline', auth, c.getPipelineStats);
router.get('/:companyId/crm/leads/:id', auth, c.getLead);
router.put('/:companyId/crm/leads/:id', auth, c.updateLead);
router.post('/:companyId/crm/leads/:id/activity', auth, c.addActivity);
router.post('/:companyId/crm/leads/:id/convert', auth, c.convertLead);

module.exports = router;
