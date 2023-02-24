const {query, body} = require('express-validator');
const validateRequest = require('../../../../middlewares/validateRequest');

const allowedVendorStatuses = ['CREATED', 'SUBMITTED', 'PENDING_REVIEW', 'ACTIVE', 'DISABLED'];

const validateGetVendors = [
    query('status')
        .optional()
        .isIn([...allowedVendorStatuses, ...allowedVendorStatuses.map(t => t.toLowerCase())])
        .withMessage('Please provide a valid status for vendor'),
    validateRequest
];

const validateUpdateVendorStatus = [
    body('status')
        .exists()
        .isString()
        .isIn(allowedVendorStatuses)
        .withMessage('Please provide a valid status for vendor'),
    validateRequest
];

const validateUpdateVendorRefundListStatuses = [
    body('refundListStatuses')
        .exists()
        .isArray()
        .custom((value) => {
            const options = [
                'initialized',
                'viewed',
                'receiverVerified',
                'pending',
                'processed',
                'canceled',
                'refundByVendor',
                'failed',
            ];
            if (!value.length) return true;

            return value.every(val => options.includes(val));
        })
        .withMessage('Please provide a valid status for vendor'),
    validateRequest
]

const validateGetVendorRefunds = [
    query('statuses')
        .optional()
        .isString()
        .isIn(['initialized', 'viewed', 'receiverVerified', 'pending', 'processed', 'canceled', 'failed'])
        .withMessage('Please provide a valid statuses for vendor'),
    validateRequest
];

const validateGetFilteredVendorRefunds = [
    body('statuses')
        .optional()
        .isArray()
        .withMessage('Please provide a valid statuses for vendor'),
    body('statuses.*')
        .optional()
        .isString()
        .isIn(['initialized', 'viewed', 'receiverVerified', 'pending', 'processed', 'canceled', 'failed'])
        .withMessage('Please provide a valid statuses for vendor'),
    body('dates.from')
        .optional({nullable: true})
        .isDate()
        .withMessage('Please provide a valid from date, use this form: YYYY-MM-DD'),
    body('dates.to')
        .optional({nullable: true})
        .isDate()
        .withMessage('Please provide a valid from date, use this form: YYYY-MM-DD'),
    validateRequest
];

const validateToggleRevenueShare = [
    body('revenueShareEnabled')
        .exists()
        .isBoolean()
        .withMessage('Please provide a valid boolean to toggle revenue share'),
    validateRequest
];

const validateToggleDNBApproval = [
    body('approvedByDNB')
        .exists()
        .isBoolean()
        .withMessage('Please provide a valid boolean to toggle DNB approval'),
    validateRequest
];

const validateUpdateRevenueShare = [
    body('revenueSharePercentage')
        .exists()
        .isNumeric()
        .withMessage('Please provide a valid value for revenue share'),
    validateRequest
];

const validateUpdateInvoiceCycleType = [
    body('invoicingCycleType')
        .exists()
        .isString()
        .isIn(['TenDays', 'Daily', 'BiWeekly'])
        .withMessage('Please provide a valid cycle type'),
    validateRequest
]

const validateAdminVendorToken = [
    body('vendorId')
        .exists()
        .isString()
        .withMessage('Please provide a valid vendor ID'),
    validateRequest
]


module.exports = {
    validateGetVendors,
    validateUpdateVendorStatus,
    validateGetVendorRefunds,
    validateGetFilteredVendorRefunds,
    validateToggleRevenueShare,
    validateToggleDNBApproval,
    validateUpdateRevenueShare,
    validateUpdateInvoiceCycleType,
    validateAdminVendorToken,
    validateUpdateVendorRefundListStatuses
};

