const moment = require('moment');

const getVendorAgreementAsHTML = (agreementData, agreementSigned = false, agreementDate = null) => {
    return (`
    
<div>
    <b>This agreement</b> is made between ${agreementData.commercialName} and Apace Refunds LLC (“Apace”),
    an LLC existing under the laws of the State of Delaware, with its head office located at 10201 E Bay Harbor Dr,
    #601, Bay Harbor Islands, FL 33154, and ${agreementData.commercialName}, ${agreementData.entity === 'LLC' ? `an ${agreementData.entity}` : `a ${agreementData.entity}`} existing under the laws of the state of ${agreementData.state},
    with [their/its] primary address located at: ${agreementData.address}, ${agreementData.city},
    ${agreementData.state},
    ${agreementData.zip}
    <br/>
    <br/>
    <b>Whereas</b>, Apace offers expedited deposits of purchase returns; and <br/>
    <br />
    <b>Whereas</b>, ${agreementData.commercialName} would like to offer the service to its customers; <br/>
    <br />
    <b>Now, therefore,</b> the parties agree to the following: <br/>
    <ol>
        <li>
            When emailing a customer confirming receipt of a return, and eligibility to receive a refund of its purchase
            price (or other specified amount), or otherwise confirming eligibility for a refund, (which would otherwise
            take [3-14 days to deposit in customer's account), retailer will include an option on all eligible returns
            to allow customers to elect to receive an expedited return, via Apace.

        </li>
        <li>
            ${agreementData.commercialName} acknowledges that if a customer elects to expedite its purchase refund through Apace,
            customer will thereby assign its right, title, and interest in the full purchase refund to Apace Refunds
            Inc. Retailer acknowledges Apace as the beneficiary of that Assignment, and that Apace will have the right
            title and interest in the purchase return, pursuant to [retailer's] [return policy].

        </li>
        <li>
            Apace will be entitled to receive the full value of all the refunds it expedited and purchased in any given
            month, in twice a month billing cycle. [or as otherwise agreed]
        </li>
    </ol>
    ${
        agreementSigned ? ` <i>Agreed by ${agreementData.ownerFirstName} ${agreementData.ownerLastName} 
        at ${moment(agreementDate).utc().toDate().toISOString()}</i> `
            : ""
    }
</div>

    `);
}

const getVendorAgreementAsText = (agreementData, agreementSigned = false, agreementDate = null) => {
    return (`
This agreement is made between ${agreementData.commercialName} and Apace Refunds LLC (“Apace”), an LLC existing under the laws of the State of Delaware, with its head office located at 10201 E Bay Harbor Dr, #601, Bay Harbor Islands, FL 33154, and ${agreementData.commercialName}, ${agreementData.entity ==='LLC' ? `an ${agreementData.entity}` : `a ${agreementData.entity}`} existing under the laws of the state of ${agreementData.state}, with [their/its] primary address located at: ${agreementData.address}, ${agreementData.city}, ${agreementData.state}, ${agreementData.zip}

Whereas, Apace offers expedited deposits of purchase returns; and
Whereas, ${agreementData.commercialName} would like to offer the service to its customers; 
Now, therefore, the parties agree to the following:

1. When emailing a customer confirming receipt of a return, and eligibility to receive a refund of its purchase price (or other specified amount), or otherwise confirming eligibility for a refund, (which would otherwise take [3-14 days to deposit in customer’s account), retailer will include an option on all eligible returns to allow customers to elect to receive an expedited return, via Apace.

2. ${agreementData.commercialName} acknowledges that if a customer elects to expedite its purchase refund through Apace,
customer will thereby assign its right, title, and interest in the full purchase refund to Apace Refunds Inc. 
Retailer acknowledges Apace as the beneficiary of that Assignment, and that Apace will have the right title and interest in the purchase return, pursuant to [retailer’s] [return policy].

3. Apace will be entitled to receive the full value of all the refunds it expedited and purchased in any given month, in twice a month billing cycle. [or as otherwise agreed]
    
${agreementSigned ? `Agreed by ${agreementData.ownerFirstName} ${agreementData.ownerLastName} at ${moment(agreementDate).utc().toDate().toISOString()}` : ""}

`);
}

module.exports = {
    getVendorAgreementAsHTML,
    getVendorAgreementAsText
}