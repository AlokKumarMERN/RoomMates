import mongoose from 'mongoose';

/**
 * One person's membership of one room.
 *
 * Membership is never deleted. When somebody leaves we set `isActive: false`
 * and stamp `leftAt`, because their name still has to render on every expense
 * they were part of, and their old shares still count toward historical
 * reports (spec §29). Removing the row would orphan all of that.
 */
const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },

    // Free-form labels — "veg", "non-veg", "2nd floor". Deliberately not an
    // enum: the veg/non-veg case in spec §7 is one example of subgrouping, not
    // the only kind anyone will want.
    tags: { type: [String], default: [] },

    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { _id: true },
);

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Room name is required.'],
      trim: true,
      minlength: [2, 'Room name must be at least 2 characters.'],
      maxlength: [50, 'Room name must be 50 characters or fewer.'],
    },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: { type: [memberSchema], default: [] },

    // Fixed at INR for now. The field exists from the start because retro-fitting
    // a currency into a ledger that already holds amounts is genuinely painful.
    currency: { type: String, default: 'INR' },

    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Finding "every room this user belongs to" is the most frequent room query.
roomSchema.index({ 'members.user': 1 });

/**
 * These all tolerate `members` being absent.
 *
 * A room can be fetched with a projection — the notification list populates
 * only `name`, because that is all it needs to say which room something
 * happened in — and virtuals run on every `toJSON`. Without the fallback, that
 * projection turns a perfectly good response into a 500 from inside a getter,
 * which is a long way from where anybody would look for it.
 */
roomSchema.virtual('activeMembers').get(function activeMembers() {
  return (this.members ?? []).filter((member) => member.isActive);
});

roomSchema.virtual('memberCount').get(function memberCount() {
  return (this.members ?? []).filter((member) => member.isActive).length;
});

/** The caller's active membership, or undefined. Handles both populated and raw refs. */
roomSchema.methods.findMembership = function findMembership(userId) {
  const target = String(userId);
  return (this.members ?? []).find((member) => {
    const memberId = member.user?._id ? String(member.user._id) : String(member.user);
    return memberId === target && member.isActive;
  });
};

roomSchema.methods.isMember = function isMember(userId) {
  return Boolean(this.findMembership(userId));
};

roomSchema.methods.isAdmin = function isAdmin(userId) {
  return this.findMembership(userId)?.role === 'admin';
};

const Room = mongoose.model('Room', roomSchema);

export default Room;
