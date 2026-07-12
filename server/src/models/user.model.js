import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters long'],
      maxlength: [60, 'Full name cannot exceed 60 characters'],
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters long'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false,
    },
    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student',
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [250, 'Bio cannot exceed 250 characters'],
      default: '',
    },
    learningPreferences: {
      preferredLanguage: {
        type: String,
        enum: ['cpp', 'java', 'javascript', 'python'],
        default: 'cpp',
      },
      currentLevel: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        default: 'beginner',
      },
      dailyPracticeGoal: {
        type: Number,
        min: [1, 'Daily practice goal must be at least 1'],
        max: [20, 'Daily practice goal cannot exceed 20'],
        default: 2,
      },
      explanationDepth: {
        type: String,
        enum: ['concise', 'balanced', 'detailed'],
        default: 'balanced',
      },
      targetCompanies: {
        type: [
          {
            type: String,
            trim: true,
            maxlength: [100, 'Company name cannot exceed 100 characters'],
          },
        ],
        default: [],
        validate: [
          (val) => {
            const unique = new Set(val.map((s) => s.toLowerCase().trim()));
            return unique.size === val.length && val.length <= 20;
          },
          'Target companies must be unique, normalized, and not exceed 20 companies',
        ],
      },
      preferredDifficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard', 'mixed'],
        default: 'mixed',
      },
    },
    refreshToken: {
      type: String,
      default: '',
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// Hash the password before saving (only if modified)
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  this.password = await bcrypt.hash(this.password, 10);
});

// Compare password instance method
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Generate access token instance method
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      role: this.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

// Generate refresh token instance method
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

const User = mongoose.model('User', userSchema);

export { User };
