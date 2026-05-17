const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const c = require('../controllers/creditNoteController');

router.post('/:companyId/ar/credit-notes', auth, c.createCreditNote);
router.get('/:companyId/ar/credit-notes', auth, c.listCreditNotes);
router.get('/:companyId/ar/credit-notes/:id', auth, c.getCreditNote);
router.post('/:companyId/ar/credit-notes/:id/post', auth, c.postCreditNote);
router.post('/:companyId/ar/credit-notes/:id/void', auth, c.voidCreditNote);

module.exports = router;
