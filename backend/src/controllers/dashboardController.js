const Invoice = require('../models/Invoice');
const SalesOrder = require('../models/SalesOrder');
const PurchaseOrder = require('../models/PurchaseOrder');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const StockBalance = require('../models/StockBalance');
const ApprovalRequest = require('../models/ApprovalRequest');
const Lead = require('../models/Lead');
const Payment = require('../models/Payment');

exports.getDashboard = async (req, res) => {
    try {
        const { companyId } = req.params;
        const now = new Date();

        // Date range defaults: 12 months ago → today
        const defaultFrom = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        const dateFrom = req.query.date_from ? new Date(req.query.date_from) : defaultFrom;
        const dateTo = req.query.date_to ? new Date(req.query.date_to + 'T23:59:59.999Z') : now;

        const [
            invoiceStats, soStats, poStats, customerCount, productCount,
            reorderCount, pendingApprovals, openLeads,
            monthlyRevenue, recentInvoices, pendingPayments,
        ] = await Promise.all([
            // Invoice aggregation filtered by date range
            Invoice.aggregate([
                {
                    $match: {
                        company_id: require('mongoose').Types.ObjectId(companyId),
                        invoice_date: { $gte: dateFrom, $lte: dateTo },
                    },
                },
                { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$total_amount' } } },
            ]),
            // SO count
            SalesOrder.countDocuments({ company_id: companyId, status: { $nin: ['Cancelled'] } }),
            // PO count
            PurchaseOrder.countDocuments({ company_id: companyId, status: { $nin: ['Cancelled'] } }),
            // Customer count
            Customer.countDocuments({ company_id: companyId, is_active: true }),
            // Product count
            Product.countDocuments({ company_id: companyId, is_active: true }),
            // Reorder alerts count
            (async () => {
                const products = await Product.find({ company_id: companyId, is_active: true, reorder_point: { $gt: 0 } });
                let count = 0;
                for (const p of products) {
                    const stocks = await StockBalance.find({ company_id: companyId, product_id: p._id });
                    const qty = stocks.reduce((s, sb) => s + parseFloat(sb.quantity_on_hand?.toString() || 0), 0);
                    if (qty <= parseFloat(p.reorder_point?.toString() || 0)) count++;
                }
                return count;
            })(),
            // Pending approvals for user
            ApprovalRequest.countDocuments({
                company_id: companyId, status: 'Pending',
                steps: { $elemMatch: { approver_id: req.user.userId, status: 'Pending' } },
            }),
            // Open leads
            Lead.countDocuments({ company_id: companyId, stage: { $nin: ['Won', 'Lost'] }, converted: false }),
            // Monthly revenue within date range
            Invoice.aggregate([
                {
                    $match: {
                        company_id: require('mongoose').Types.ObjectId(companyId),
                        status: { $in: ['Posted', 'Partially Paid', 'Paid'] },
                        invoice_date: { $gte: dateFrom, $lte: dateTo },
                    },
                },
                {
                    $group: {
                        _id: { year: { $year: '$invoice_date' }, month: { $month: '$invoice_date' } },
                        revenue: { $sum: '$total_amount' },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } },
            ]),
            // Recent invoices
            Invoice.find({ company_id: companyId })
                .populate('customer_id', 'customer_name')
                .sort({ createdAt: -1 })
                .limit(8),
            // Outstanding AR within date range
            Invoice.aggregate([
                {
                    $match: {
                        company_id: require('mongoose').Types.ObjectId(companyId),
                        status: { $in: ['Posted', 'Partially Paid'] },
                        invoice_date: { $gte: dateFrom, $lte: dateTo },
                    },
                },
                { $group: { _id: null, total: { $sum: '$amount_due' } } },
            ]),
        ]);

        // Parse invoice stats
        const byStatusMap = {};
        let totalRevenue = 0;
        let pendingInvoices = 0;
        for (const s of invoiceStats) {
            byStatusMap[s._id] = { count: s.count, total: s.total };
            if (['Posted', 'Partially Paid', 'Paid'].includes(s._id)) totalRevenue += s.total;
            if (['Posted', 'Partially Paid'].includes(s._id)) pendingInvoices += s.count;
        }

        // Check overdue within date range
        const overdue = await Invoice.countDocuments({
            company_id: companyId,
            status: { $in: ['Posted', 'Partially Paid'] },
            due_date: { $lt: now },
            invoice_date: { $gte: dateFrom, $lte: dateTo },
        });

        // Build monthly trend with month names
        const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyTrend = monthlyRevenue.map(m => ({
            month: MONTHS[m._id.month - 1],
            revenue: m.revenue,
            count: m.count,
        }));

        // byStatus array for frontend pie chart
        const byStatus = Object.entries(byStatusMap).map(([_id, v]) => ({ _id, count: v.count, total: v.total }));

        const outstanding = pendingPayments[0]?.total || 0;

        res.json({
            success: true,
            data: {
                kpis: {
                    totalRevenue,
                    pendingInvoices,
                    overdueInvoices: overdue,
                    outstanding,
                    customerCount,
                    productCount,
                    reorderAlerts: reorderCount,
                    pendingApprovals,
                    openLeads,
                    openSalesOrders: soStats,
                    openPurchaseOrders: poStats,
                },
                byStatus,
                monthlyTrend,
                recentInvoices,
            },
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
