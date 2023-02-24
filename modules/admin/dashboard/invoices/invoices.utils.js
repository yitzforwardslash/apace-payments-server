const moment = require("moment");
const {getDateRangeFilter} = require("../../admin.utils");


const getDueInvoicesWhereFilter = () => {
    return {
        status: 'unpaid',
        dueDate: {
            gte: moment().endOf('day').toDate() /* Due date to be from tomorrow and any day in the future */
        }
    };
}

const getOverdueInvoicesWhereFilter = () => {
    return {
        status: 'unpaid',
        dueDate: {
            lte: moment().subtract(1, 'days').toDate() /* due date from any time in the past till yesterday */
        }
    };
}

const getDueTodayInvoicesWhereFilter = () => {
    return {
        status: 'unpaid',
        dueDate: {
            gte: moment().startOf('day').toDate(),
            lte: moment().endOf('day').toDate()
        }
    };
}

const getInvoicesFilterByTypeAndDates = (type, dates = {}) => {
    let whereData = getDateRangeFilter(dates, 'dueDate');

    if (['paid', 'unpaid'].includes(type)) {
        whereData.status = type;
    }

    /* Custom date filter is ignored here - as following types have their own date range filter*/
    if (type === 'overdue')
        whereData = getOverdueInvoicesWhereFilter();

    if (type === 'due')
        whereData = getDueInvoicesWhereFilter();

    if (type === 'dueToday')
        whereData = getDueTodayInvoicesWhereFilter();


    return whereData;
}


module.exports = {
    getDueInvoicesWhereFilter,
    getOverdueInvoicesWhereFilter,
    getDueTodayInvoicesWhereFilter,
    getInvoicesFilterByTypeAndDates
}