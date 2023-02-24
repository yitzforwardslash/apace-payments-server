module.exports = {
  '/ext/refunds': {
    post: {
      tags: ['External'],
      description: 'Create refund',
      operationId: 'createRefund',
      security: [{ ApacePublicId: [] }, { ApaceSecret: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/EXTCreateRefund',
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Created refund successfully',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/EXTCreateRefundSuccess',
              },
            },
          },
        },
        400: {
          description: 'Failed to create refund',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/EXTCreateRefund400Error',
              },
            },
          },
        },
        500: {
          description: 'Server Error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/EXTCreateRefund500Error',
              },
            },
          },
        },
      },
    },
  },
};
