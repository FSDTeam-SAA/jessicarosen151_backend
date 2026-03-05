// import mongoose, { Schema } from 'mongoose';

// const orderItemSchema = new Schema(
//   {
//     resource: {
//       type: Schema.Types.ObjectId,
//       ref: 'Resource',
//       required: true
//     },
//     seller: {
//       type: Schema.Types.ObjectId,
//       ref: 'User',
//       required: true
//     },
//     quantity: {
//       type: Number,
//       default: 1,
//       min: 1
//     },
//     price: {
//       type: Number,
//       required: true
//     },
//     status: {
//       type: String,
//       enum: ['processing', 'shipped', 'delivered', 'cancelled'],
//       default: 'processing'
//     }
//   },
//   { _id: false }
// );

// const orderSchema = new Schema(
//   {
//     user: {
//       type: Schema.Types.ObjectId,
//       ref: 'User'
//     },
//     guest: {
//       type: Schema.Types.ObjectId,
//       ref: 'Guest'
//     },
//     items: [orderItemSchema],
//     totalAmount: {
//       type: Number,
//       required: true
//     },
//     paymentMethod: {
//       type: String,
//       default: null
//     },
//     paymentStatus: {
//       type: String,
//       enum: ['pending', 'paid', 'failed'],
//       default: 'pending'
//     },
//     orderStatus: {
//       type: String,
//       enum: ['processing', 'delivered', 'cancelled'],
//       default: 'processing'
//     },
//     stripeSessionId: {
//       type: String,
//       required: false
//     },
//     stripePaymentIntentId: {
//       type: String,
//       default: null
//     },
//     transferGroup: {
//       type: String
//     },
//     promocode: {
//       type: Schema.Types.ObjectId,
//       ref: 'PromoCode',
//       default: null
//     },
//     deliveredAt: Date,
//     cancelledAt: Date,

//     // update code
//     sellerShares: {
//       type: Object,
//       default: {}
//     },

//     lawbieRevenueCents: {
//       type: Number,
//       default: 0
//     },

//     taxAmount: {
//       type: Number,
//       default: 0
//     },

//     transactionId: {
//       type: String,
//       default: null
//     },

//     failureReason: {
//       type: String,
//       default: null
//     },

//     paidAt: {
//       type: Date,
//       default: null
//     }
//   },
//   { timestamps: true }
// );

// const Order = mongoose.model('Order', orderSchema);
// export default Order;


import mongoose, { Schema } from 'mongoose';

/* ---------------- ORDER ITEM ---------------- */
const orderItemSchema = new Schema(
  {
    resource: {
      type: Schema.Types.ObjectId,
      ref: 'Resource',
      required: true
    },

    seller: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    quantity: {
      type: Number,
      default: 1,
      min: 1
    },

    price: {
      type: Number,
      required: true
    },

    status: {
      type: String,
      enum: ['processing', 'shipped', 'delivered', 'cancelled'],
      default: 'processing'
    }
  },
  { _id: false }
);

/* ---------------- ORDER ---------------- */
const orderSchema = new Schema(
  {
    /* ---------- USER / GUEST ---------- */
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    guest: {
      type: Schema.Types.ObjectId,
      ref: 'Guest',
      default: null
    },

    /* ---------- ITEMS ---------- */
    items: {
      type: [orderItemSchema],
      required: true
    },

    /* ---------- AMOUNTS ---------- */
    totalAmount: {
      type: Number,
      required: true
    },

    discountAmount: {
      type: Number,
      default: 0
    },

    taxAmount: {
      type: Number,
      default: 0
    },

    rawSubtotalCents: {
      type: Number,
      default: 0
    },

    /* ---------- PAYMENT ---------- */
    paymentMethod: {
      type: String,
      default: null
    },

    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending'
    },

    transactionId: {
      type: String,
      default: null
    },

    stripeSessionId: {
      type: String,
      default: null
    },

    stripePaymentIntentId: {
      type: String,
      default: null
    },

    transferGroup: {
      type: String,
      default: null
    },

    failureReason: {
      type: String,
      default: null
    },

    paidAt: {
      type: Date,
      default: null
    },

    /* ---------- PLATFORM / SELLER ---------- */
    sellerShares: {
      type: Object, // { stripeAccountId: cents }
      default: {}
    },

    lawbieRevenueCents: {
      type: Number,
      default: 0
    },

    isMultiSellerOrder: {
      type: Boolean,
      default: false
    },

    isPlatformOrder: {
      type: Boolean,
      default: false
    },

    /* ---------- PROMO / LOCATION ---------- */
    promocode: {
      type: Schema.Types.ObjectId,
      ref: 'PromoCode',
      default: null
    },

    customerCountry: {
      type: String,
      default: null
    },

    /* ---------- ORDER STATUS ---------- */
    orderStatus: {
      type: String,
      enum: ['processing', 'delivered', 'cancelled'],
      default: 'processing'
    },

    deliveredAt: {
      type: Date,
      default: null
    },

    cancelledAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

/* ---------------- INDEXES (OPTIONAL BUT GOOD) ---------------- */
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ user: 1 });
orderSchema.index({ 'items.seller': 1 });

const Order = mongoose.model('Order', orderSchema);
export default Order;
