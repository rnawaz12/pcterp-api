const express = require('express');
const AppError = require('./utils/appError');
const rateLimit = require('express-rate-limit');
const hetmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

// Controllers
const globalErrorHandler = require('./controllers/errorController');

// Routes
const employeeRouter = require('./routes/employeeRoutes');



var app = express();

if (process.env.NODE_ENV === 'development') {
    console.log('devlopment');
}

// GLOBAL MIDDLEWARE STACK
app.enable('trust proxy');

// SET SECURITY HTTP HEADERS
// Its best to used helmet function earlier in the middleware stack, so that ths header are really sure to added
app.use(helmet());
app.use(cors());

// LIMIT REQUEST FROM SAME API - API LIMITING USING EXPRESS PACKAGE
// This limiter function will prevent from the DENIAL-OF-SERVICE && BRUTE FORCE ATTACKS
// It will allow 100 request from the same IP in 1 hour. And if that limit is crossed by certain Ip they will get by an error message
const limiter = rateLimit({
    max: 1000,
    windowMs: 60 * 60 * 1000,
    message: 'Too many requests from this IP, please try again in an hour!'
});

// This will effects all routes which basically starts with /api
app.use('/api', limiter);

// BODY PARSER, READING DATA FROM THE BODY INTO req.body
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// DATA SANITIZATION AGAINST NoSQL QUERY INJECTION
app.use(mongoSanitize());

// DATA SANITIZATION AGAINST XSS
// This will clean any malicious html code with some javascript code
app.use(xss());

// PREVENT PARAMETER POLLUTION
// If multipe params with same key requested then it will take only the last one
app.use(hpp({
    whitelist: ['duration', 'ratingQuantity', 'ratingAverage', 'maxGroupSize', 'difficulty', 'price']
}));

app.use(express.static(path.join(__dirname, 'public')));
// const staticPath = path.join(__dirname, '/public');
// console.log(staticPath);
// // SERVING STATIC FILES 
// app.use(express.static(staticPath));

// TEST MIDDLEWARE
app.use((req, res, next) => {
    console.log('Incoming Data Into Server')
    console.log(req.body);
    console.log(req.params);
    req.requestTime = new Date().toISOString();
    next();
});

// Routing >>>
app.use('/api/v1/employee', employeeRouter);

// DEFAULT ROUTE
app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server.`, 404));
});

// GLOBAL ERROR HANDLING
app.use(globalErrorHandler);

module.exports = app;


