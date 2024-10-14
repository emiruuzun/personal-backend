const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  name: {
    type: String,
    required: [true, "Plase Provide a name"],
  },
  password: {
    type: String,
    minlength: [6, "plase provide a password min length"],
    required: [true, "Plase provide a password"],
    select: false,
  },
  email: {
    type: String,
    required: [true, "please Provide a email"],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      "Pleace Prvide valid email address",
    ],
  },
  role: {
    type: String,
    default: "user",
    enum: ["user", "admin"],
  },
  verificationToken: {
    type: String,
    default: undefined,
  },
  isVerify: {
    type: Boolean,
    default: false,
  },
  position: {
    type: String,
    required: [true, "Please provide a position"],
  },
  tcNo: {
    type: String,
    required: [true, "Please provide a TC number"],
    unique: true, // TC Kimlik numarası benzersiz olmalıdır
    match: [/^\d{11}$/, "Please provide a valid 11-digit TC number"],
  },
  contact: {
    type: String,
    required: [true, "Please provide a contact number"],
    match: [/^\d+$/, "Please provide a valid contact number"],
  },
  status: {
    type: String,
    enum: ["Aktif", "İzinli", "Pasif"],
    default: "Aktif",
  },
  profile_image: {
    type: String,
    default: "default.jpg",
  },
  creatAt: {
    type: Date,
    default: Date.now,
  },
  isBlockedByAdmin: {
    type: Boolean,
    default: false,
  },
  group: {
    type: String,
    required: [true, "Please provide a group"],
    enum: ["Mekanik", "Boru", "Elektrik", "Aksaray", "Kapı", "Ofis", "Taşeron"],
  },
  subgroup: {
    type: String,
    enum: ["Mekanik", "Elektrik", "Boru"],
    required: function () {
      return this.group === "Taşeron"; // Yalnızca Taşeron grubunda zorunlu
    },
  },

  assignedAfterLeaveInfo: {
    type: String,
    default: null, // Varsayılan olarak null, izin dönüşü iş atanmışsa bir mesaj burada tutulacak
  },
});

UserSchema.methods.generateJwtFromUser = function () {
  const { JWT_SECRET_KEY, JWT_EXPIRE } = process.env;
  const payload = {
    id: this._id,
    name: this.name,
    role: this.role,
  };

  const token = jwt.sign(payload, JWT_SECRET_KEY, {
    expiresIn: JWT_EXPIRE,
  });
  return token;
};

UserSchema.methods.getResetPasswordTokenFromUser = function () {
  const { RESET_PASSWORD_EXPIRE } = process.env;

  const randomTextString = crypto.randomBytes(15).toString("hex");

  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(randomTextString)
    .digest("hex");

  this.resetPasswordToken = resetPasswordToken;
  this.resetPasswordExpire = Date.now() + parseInt(RESET_PASSWORD_EXPIRE);
};

UserSchema.pre("save", function (next) {
  if (!this.isModified("password")) {
    next();
  }
  bcrypt.genSalt(10, (err, salt) => {
    if (err) next(err);
    bcrypt.hash(this.password, salt, (err, hash) => {
      if (err) next(err);
      this.password = hash;
      next();
    });
  });
});

module.exports = mongoose.model("User", UserSchema);
