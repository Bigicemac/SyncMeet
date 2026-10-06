import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6, select: false },
    personalMeetingId: { type: String, unique: true, sparse: true },
  },
  { timestamps: true },
);

userSchema.pre("save", async function () {
  if (!this.personalMeetingId) {
    let pmid;
    let exists = true;
    while (exists) {
      pmid = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      const count = await mongoose.model("User").countDocuments({ personalMeetingId: pmid });
      if (count === 0) exists = false;
    }
    this.personalMeetingId = pmid;
  }
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

export const User = mongoose.model("User", userSchema);
export default User;
