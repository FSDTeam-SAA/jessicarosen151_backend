import mongoose, { Schema } from 'mongoose';

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




const orderSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    guest: {
      type:Schema.Types.ObjectId,
      ref:'Guest'
    },
    items: [orderItemSchema],
    totalAmount: {
      type: Number,
      required: true
    },
    paymentMethod: {
      type: String,
      default: null
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending'
    },
    orderStatus: {
      type: String,
      enum: ['processing', 'delivered', 'cancelled'],
      default: 'processing'
    },
    stripeSessionId: {
      type: String,
      required: false
    },
    stripePaymentIntentId: {
      type: String,
      default: null
    },
    transferGroup: {
      type: String
    },
    promocode: {
      type: Schema.Types.ObjectId,
      ref: 'PromoCode',
      default: null
    },
    deliveredAt: Date,
    cancelledAt: Date
  },
  { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema);
export default Order;
