const router = require('express').Router({ mergeParams: true });
const auth = require('../middleware/auth');
const ctrl = require('../controllers/bankReconciliationController');

router.use(auth);

router.get('/', ctrl.listStatements);
router.post('/', ctrl.createStatement);
router.get('/:statementId/suggestions', ctrl.getSuggestions);
router.get('/:statementId', ctrl.getStatement);
router.post('/:statementId/match/:lineIndex', ctrl.matchLine);
router.post('/:statementId/unmatch/:lineIndex', ctrl.unmatchLine);
router.post('/:statementId/reconcile', ctrl.reconcile);

module.exports = router;
