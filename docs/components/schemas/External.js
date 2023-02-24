module.exports = {
  EXTCreateRefund: {
    type: 'object',
    required: [
      'card_last_four',
      'refund_amount',
      'order_id',
      'items',
      'refund_verification',
      'refund_notification',
    ],
    properties: {
      card_last_four: {
        type: 'string',
        example: '1111',
      },
      expiration_date: {
        type: 'string',
        format: 'date-time',
        example: new Date(),
      },
      refund_amount: {
        type: 'number',
        example: 12.4,
      },
      order_id: {
        type: 'string',
        example: '5448-556544-5425',
      },
      order_url: {
        type: 'string',
        example: 'https://vendor.com/orders/5448-556544-545',
      },
      order_date: {
        type: 'string',
        format: 'MM/DD/YYYY',
        example: '12/20/2022',
      },
      customer: {
        type: 'object',
        properties: {
          first_name: {
            type: 'string',
            example: 'John',
          },
          last_name: {
            type: 'string',
            example: 'Doe',
          },
          email: {
            type: 'string',
            example: 'johndoe@example.com',
          },
        },
      },
      items: {
        type: 'array',
        items: {
          type: 'object',
          required: ['item_id'],
          properties: {
            item_id: {
              type: 'string',
              example: '123456',
            },
            sku: {
              type: 'string',
              example: 'ABC-123',
            },
            item_url: {
              type: 'string',
              example: 'https://vendor.com/items/123456',
            },
            item_image_url: {
              type: 'string',
              example:
                'https://cdn.vendor.com/images/items/asc45654ascascx.png',
            },
            display_name: {
              type: 'string',
              example:
                "Lavemi Men's Real Leather Ratchet Dress Belt with Automatic Buckle,Elegant Gift Box(55-0030)",
            },
            return_date: {
              type: 'string',
              format: 'MM/DD/YYYY',
              example: '01/19/2022',
            },
            unit_price: {
              type: 'number',
              example: 14.55,
            },
            return_qty: {
              type: 'number',
              example: 2,
            },
          },
        },
      },
      refund_verification: {
        type: 'object',
        description:
          'Before issueing a refund, vendor must OK the refund to be issued by apace hitting the provided endpoint. The provided endpoint must respond with { allow_refund: true } response in order to process the refund',
        required: ['url'],
        properties: {
          url: {
            type: 'string',
            example:
              'https://api.vendor.com/varify-refund?order_id=5448-556544-545&item_ids=123456&auth_token=jhkSAHF454SDFSDF454sDf52sdf2',
          },
          method: {
            type: 'string',
            enum: ['GET', 'POST', 'PUT'],
            example: 'GET',
            default: 'GET',
          },
        },
      },
      refund_notification: {
        type: 'object',
        description:
          'Webhook to receive a POST request notification about processed refunds',
        required: ['webhook_url'],
        properties: {
          webhook_url: {
            type: 'string',
            example:
              'https://api.vendor.com/refund-notification?order_id=5448-556544-545&item_ids=123456&auth_token=jhkSAHF454SDFSDF454sDf52sdf2',
          },
          redirect_url: {
            type: 'string',
            description:
              'A url to which the customer would be redirected to after completing the refund process',
            example:
              'https://vendor.com/refund-confirmation?order_id=5448-556544-545&item_ids=123456&auth_token=jhkSAHF454SDFSDF454sDf52sdf2',
          },
          redirect_method: {
            type: 'string',
            enum: ['GET', 'POST', 'PUT'],
            example: 'POST',
            default: 'POST',
          },
        },
      },
    },
  },
  EXTCreateRefundSuccess: {
    type: 'object',
    properties: {
      refund_created: {
        type: 'boolean',
        example: true,
      },
      refund_id: {
        type: 'number',
        example: 2,
      },
      refund_link: {
        type: 'string',
        example:
          'https://customers.apacecapital.co/refund/process/en/create_refund/hjkskLADFJhsaDEf535sadf5sadfsdf6sdf6sd65ascasc52525asc4asc45asc54a5s4c4cascasc54asc44asc54asca',
      },
      active_until: {
        type: 'string',
        format: 'date-time',
        example: '2022-02-21T22:24:15.761Z',
      },
    },
  },
  EXTCreateRefund400Error: {
    type: 'object',
    properties: {
      refund_created: {
        type: 'boolean',
        example: false,
      },
      errors: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            error_code: {
              type: 'number',
              example: 5001,
            },
            error_message: {
              type: 'string',
              example: 'refund_verification.url not the right format',
            },
          },
        },
      },
    },
  },
  EXTCreateRefund500Error: {
    type: 'object',
    properties: {
      refund_created: {
        type: 'boolean',
        example: false,
      },
      errors: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            error_code: {
              type: 'number',
              example: 5010,
            },
            error_message: {
              type: 'string',
              example: 'Server error',
            },
          },
        },
      },
    },
  },
};
