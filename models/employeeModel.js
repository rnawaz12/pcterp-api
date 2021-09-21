const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

// FIELDS ARE >>>

const employeeSchema = mongoose.Schema({
    salutation: String,
    firstName: {
        type: String,
        required: [true, 'A User must have a name'],
        trim: true,
    },
    lastName: {
        type: String,
        trim: true,
    },
    initials: String,
    jobTitle: String, //Job Title
    notes: String,
    currency: String,
    email: {
        type: String,
        required: [true, 'A User must have a unique email id.'],
        trim: true,
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Please provide a valid email']
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        trim: true,
        minlength: 8
    },
    passwordConfirm: {
        type: String,
        required: [true, "Please confirm your password"],
        validate: {
            // This only works on SAVE!!!
            validator: function (el) {
                return el === this.password
            },
            message: 'Password are not the same'
        }
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    homePhone: String,
    officePhone: String,
    phone: String,
    emergencyContact: String,
    subsidiary: String,
    class: String,
    location: String,
    department: String,
    address: [{
        country: String,
        attention: String,
        addressee: String,
        phone: String,
        address1: String,
        address2: String,
        city: String,
        state: String,
        zip: Number,
    }],
    photo: String,
    active: {
        type: Boolean,
        default: true,
        select: false
    },
    hireDate: {
        type: Date,
        default: Date.now()
    },
    releaseDate: Date,
    adhaarNumber: String,
    tin: String,
    pan: String,
    supervisor: String,
    supervisorId: String,
    birthDate: Date,
    salesRep: Boolean,
    giveAccess: Boolean,
    gender: {
        type: String,
        enum: ['male', 'female'],
        default: 'male'
    },
    maritalStatus: String,
    jobDescription: String,
    lastReviewDate: Date,
    nextReviewDate: Date,
    isOnline: Boolean


}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
});

// This block of code is responsible to hide the badge id in db
employeeSchema.pre('save', async function (next) {
    // Only run this function if password was actually modified
    if (!this.isModified('password')) return next();

    // Hash the badgeId with cost of 12
    this.password = await bcrypt.hash(this.password, 8);

    // Delete badgeIdConfirm field
    this.passwordConfirm = undefined;
    next();
});

// userSchema.pre('findOneAndUpdate', function () {
//     this.set({ modifiedAt: new Date() });
// });

employeeSchema.methods.correctBadgeId = async function (candidateBadgeId, userBadgeId) {
    return await bcrypt.compare(candidateBadgeId, userBadgeId);
}

employeeSchema.methods.changedBadgeIdAfter = function (JWTTimestamp) {
    if (this.badgeIdChangedAt) {
        const changedTimestamp = parseInt(this.badgeIdChangedAt.getTime() / 1000, 10);
        return JWTTimestamp < changedTimestamp;
    }
    // FALSE means NOT Changed
    return false;
}

employeeSchema.methods.createBadgeIdResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString('hex');
    console.log("RESET TOKEN: " + resetToken);

    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    console.log("PASSWORD RESET TOKEN: " + this.passwordResetToken);
    console.log({ resetToken }, this.passwordResetToken);
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 min from now

    return resetToken;
}

const Employee = mongoose.model('Employee', employeeSchema);
module.exports = Employee;