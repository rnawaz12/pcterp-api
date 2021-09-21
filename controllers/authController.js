const { promisify } = require('util');
const Employee = require('./../models/employeeModel');
const catchAsync = require('./../utils/catchAsync');
const jwt = require('jsonwebtoken');
const AppError = require('./../utils/appError');
const sendEmail = require('./../utils/email');
const crypto = require('crypto');

/**
 * This function take User._Id as a params and return token
 * @param {Object} id - _id  
 * @returns JWT Token          NOTE: {id: id} === {id}, payload for this token is User._id
 */
const signToken = id => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
}

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);

    const cookieOptions = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
        httpOnly: true
    }
    // only when we are in production the mode
    if (process.env.NODE_ENV === 'production')
        cookieOptions.secure = true;

    // Sending JWT token via cookie
    res.cookie('jwt', token, cookieOptions);

    // Removing the badgeId from the output
    user.badgeId = undefined;
    res.status(statusCode).json({
        token: token,
        isSuccess: true,
        status: 'success',
        results: user.length,
        document: user
    });

}


exports.signup = catchAsync(async (req, res, next) => {
    const newEmployee = await Employee.create(req.body);

    const url = `${req.protocol}://${req.get('host')}/me`;
    // console.log(url);
    //await new Email(newEmployee, url).sendWelcome();

    createSendToken(newEmployee, 201, res);
});


exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;
    console.log(email, password)

    // 1) Check id the email and password exist.
    if (!email || !password) {
        return next(new AppError('Please provide user name and pin code!', 400));
    }

    // 2) Check if the user exist && the password is correct
    const user = await Employee.findOne({ email }).select('+password');

    // Only if the user exist then we have to check invoke the correctPassword method - to check weather the entered password is
    // correct or not. 
    // If the user is not exist then the left express of 'if' condition is true so it will not check the right expression.
    // If user exist then it will check wheather the password is correct or not.
    if (!user || !(await user.correctBadgeId(password, user.password))) {
        return next(new AppError('Incorrect user name or pin code', 401));
    }

    // 3) If everything ok, send token to client
    createSendToken(user, 200, res);
    // const token = signToken(user._id);
    // res.status(200).json({
    //     status: 'success',
    //     token: token
    // });

});

exports.protect = catchAsync(async (req, res, next) => {

    let token;

    // 1) Getting token and check of it's there.
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
        token = req.cookies.jwt;
    }

    if (!token) {
        return next(new AppError('You are not logged in! Please log in to get access.', 401)); // 401 === Not Authorized
    }

    // 2) Verification token.
    // NOTE: if something went wrong to below async function then our gobal error handler in errorController will handle.
    // Here we basically seen if the token payload has not been manipulated by any malicious user
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3) Check if user still exists.
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
        return next(new AppError('The user belonging to this token does no longer exist.', 401));
    }

    // 4) Check if user changed password after the token was issued.
    if (currentUser.changedBadgeIdAfter(decoded.iat)) {
        return next(new AppError('User recently changed badgeId! Please log in again.', 401));
    }

    // GRANT ACCESS TO PROTECHTED ROUTE
    req.user = currentUser;
    next();
});

// NOTE: Here because of the clouser property return middleware function has access to the roles array
exports.restrickTo = (...roles) => {
    return (req, res, next) => {
        // roles ['admin', 'lead-guide']
        if (!roles.includes(req.user.role)) {
            return next(new AppError('You do not have permission to perform this action', 403));
        }
        next();
    }
}

exports.forgotBadgeId = catchAsync(async (req, res, next) => {
    // 1) Get user based on POSTed email
    const user = await User.findOne({ userId: req.body.userId });
    if (!user) {
        return next(new AppError('There is no user with user name address.', 404));
    }

    // 2) Generate the random reset token
    const resetToken = user.createBadgeIdResetToken();
    await user.save({ validateBeforeSave: false }); // To avoid the confirmPassword validation

    // 3) Send it to user's email
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}}`;
    const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to:
                    ${resetURL}.\nIf you don't forget your password, please ignore this email.`;

    try {
        await sendEmail({
            email: user.email,
            subject: 'Your password reset token (valid for 10 min)',
            message: message
        });

        res.status(200).json({
            status: 'success',
            message: 'Token sent to email'
        });

    } catch (err) {
        user.badgeIdResetToken = undefined;
        user.badgeIdResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        return next(new AppError('There was an error sending the email. Try again later', 500));
    }

});

exports.resetBadgeId = catchAsync(async (req, res, next) => {
    // 1) Get user based on the token
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    // With this we can at the same time find the user for the token and also check if the token has not yet expired
    const user = await User.findOne({ badgeIdResetToken: hashedToken, badgeIdResetExpires: { $gt: Date.now() } })

    // 2) If token has not expired, and there is an user, set the new password
    if (!user) {
        return next(new AppError('Token is invalid or has expired', 400));
    }
    user.badgeId = req.body.badgeId;
    user.badgeIdConfirm = req.body.badgeIdConfirm;
    user.badgeIdResetToken = undefined;
    user.badgeIdResetExpires = undefined;
    await user.save(); // We wont to validator to validate the input 

    // 3) Update changedPasswordAt property for the user

    // 4) log the user in, sent JWT token
    createSendToken(user, 200, res);
    // const token = signToken(user._id);
    // res.status(200).json({
    //     status: 'success',
    //     token: token
    // });
});

exports.updateBadgeId = catchAsync(async (req, res, next) => {
    // 1) Get user from the collection
    const user = await User.findById(req.user.id).select('+badgeId');

    // 2) Check if POSTed current password is correct
    if (!(await user.correctPassword(req.body.badgeIdCurrent, user.badgeId))) {
        return next(new AppError('Your current password is wrong.', 401));
    }

    // 3) If so, update password
    user.badgeId = req.body.badgeId;
    user.badgeIdConfirm = req.body.badgeIdConfirm;
    await user.save();

    // 4) Log user in, send JWT
    createSendToken(user, 200, res);
});