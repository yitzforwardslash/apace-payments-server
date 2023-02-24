const moment = require('moment');

const getRefundAgreementAsHTML = (
  {
    refundItems,
    refundAmount,
    customerName,
    totalRefundAmount,
    customerAddress,
    itemsPrice,
    state,
    merchantName,
    deductionPercentage,
  },
  agreementDate = null,
  agreementSigned = false
) => {
  return `
    
<div>
    <b>This Assignment</b> and Transfer of Accounts Receivable Agreement (the “Agreement”) is effective ${moment().format(
      'MM/DD/YYYY'
    )},
    <br />
    <br />
    <b style="display:inline-block;margin-right: 20px;">BETWEEN:</b>${customerName} (the “Assignor”), an individual existing under the laws of the state of ${state}, with [their/its] primary address located at: <br />
    <p style="text-align: center;">${customerAddress}</p>
    <b style="display:inline-block;margin-right: 65px;">AND:</b> APACE REFUNDS, INC. (the “Assignee”) a corporation existing under the laws of the State of Delaware, with its head office located at:<br />
    <p style="text-align: center;">10201 E Bay Harbor Dr, #503, Bay Harbor Islands, FL 33154</p>
    <b>WHEREAS</b> pursuant to the sale of good(s) agreement with merchant ${merchantName}, the Assignor has purchased ${refundItems.join(
    ','
  )}, for $${itemsPrice}, requested a return, said return request having been granted by  ${merchantName}, (the good(s) duly returned), the return having been accepted, the seller having processed the return, and agreed to refund the Assignor its purchase refund [or other value]; and
    <br />
    <br />
    <b>WHEREAS</b> the Assignor wishes to receive an expedited refund of its purchase refund [or other value]; and
    <br />
    <br />
    <b>WHEREAS</b> the Assignee has agreed to pay the value of the refund to the Assignor, minus a ${deductionPercentage}% deduction of the same, for a total payment equaling $${refundAmount} within minutes after the execution of this agreement by the Assignor;
    <br />
    <br />
    <b>NOW, THEREFORE</b> FOR GOOD AND VALUABLE CONSIDERATION, the undersigned Assignor ${customerName} hereby sells and transfers all right, title, and interest in and to the refund, to Apace.  The Assignor shall have no further rights to its purchase refund after receiving the payment agreed to herein. The undersigned Assignor warrants that he is the purchaser of the item for which the return is due, and that the Assignor has not received any payment, exchange, or other consideration for the returned good(s) or any part thereof.
    <br />
    <br />
    It is further provided that if assignor was not entitled to a purchase refund, or if said merchant does not make full payment to Assignee of the amount owing on the purchase refund, for a total value of $${totalRefundAmount} within [30/60] days, said right, title, and interest in and to the purchase refund may be retransferred to the undersigned Assignor, and that the Assignor shall repurchase the same for the price paid by the undersigned Assignee. Assignee shall have the right to directly debit the account of Assignor to which Assignee has deposited the purchase price, after notice to Assignor by way of its email provided herein.
    <br />
    <br />
    ${
      agreementSigned
        ? ` <i>Agreed by ${customerName} 
        at ${moment(agreementDate).utc().toDate().toISOString()}</i> `
        : ''
    }
</div>

    `;
};

const getRefundAgreementAsText = (
  {
    refundItems,
    refundAmount,
    customerName,
    totalRefundAmount,
    customerAddress,
    itemsPrice,
    state,
    merchantName,
    deductionPercentage,
  },
  agreementDate = null,
  agreementSigned = false
) => {
  return `
    
This Assignment and Transfer of Accounts Receivable Agreement (the “Agreement”) is effective ${moment().format(
    'MM/DD/YYYY'
  )},

BETWEEN: ${customerName} (the “Assignor”), an individual existing under the laws of the state of ${state}, with [their/its] primary address located at:
                              ${customerAddress}

AND: APACE REFUNDS, INC. (the “Assignee”) a corporation existing under the laws of the State of Delaware, with its head office located at:
                              ${'10201 E Bay Harbor Dr, #503, Bay Harbor Islands, FL 33154'}

WHEREAS pursuant to the sale of good(s) agreement with merchant ${merchantName}, the Assignor has purchased ${refundItems.join(
    ','
  )}, for $${itemsPrice}, requested a return, said return request having been granted by  ${merchantName}, (the good(s) duly returned), the return having been accepted, the seller having processed the return, and agreed to refund the Assignor its purchase refund [or other value]; and

WHEREAS the Assignor wishes to receive an expedited refund of its purchase refund [or other value]; and

WHEREAS the Assignee has agreed to pay the value of the refund to the Assignor, minus a ${deductionPercentage}% deduction of the same, for a total payment equaling $${refundAmount} within minutes after the execution of this agreement by the Assignor;

NOW, THEREFORE FOR GOOD AND VALUABLE CONSIDERATION, the undersigned Assignor ${customerName} hereby sells and transfers all right, title, and interest in and to the refund, to Apace.  The Assignor shall have no further rights to its purchase refund after receiving the payment agreed to herein. The undersigned Assignor warrants that he is the purchaser of the item for which the return is due, and that the Assignor has not received any payment, exchange, or other consideration for the returned good(s) or any part thereof.

It is further provided that if assignor was not entitled to a purchase refund, or if said merchant does not make full payment to Assignee of the amount owing on the purchase refund, for a total value of $${totalRefundAmount} within [30/60] days, said right, title, and interest in and to the purchase refund may be retransferred to the undersigned Assignor, and that the Assignor shall repurchase the same for the price paid by the undersigned Assignee. Assignee shall have the right to directly debit the account of Assignor to which Assignee has deposited the purchase price, after notice to Assignor by way of its email provided herein.

${
  agreementSigned
    ? `Agreed by ${customerName} at ${moment(agreementDate).utc().toDate().toISOString()}`
    : ''
}
`;
};

module.exports = {
  getRefundAgreementAsHTML,
  getRefundAgreementAsText,
};
