const Employee = require('./../models/employeeModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('./../utils/appError');

exports.getAllEmployee = catchAsync(async (req, res) => {

    const employees = await Employee.find();
    res.status(200).json({
        isSuccess: true,
        status: 'success',
        results: employees.length,
        documents: employees
    });
});

exports.createOne = catchAsync(async (req, res, next) => {
    console.log("Create One");
    console.log(req.body);

    const doc = await Employee.create(req.body);
    res.status(201).json({
        isSuccess: true,
        status: 'success',
        results: doc.length,
        document: doc
    });
});

exports.getOne = catchAsync(async (req, res, next) => {
    let query = Employee.findById(req.params.id);
    const doc = await query;

    if (!doc) {
        return next(new AppError('No document found with the ID', 404));
    }
    res.status(200).json({
        isSuccess: true,
        status: 'success',
        results: doc.length,
        document: doc
    });
});

exports.updateOne = catchAsync(async (req, res, next) => {

    console.log(req.body)
    const doc = await Employee.findByIdAndUpdate(req.params.id, req.body, {
        new: false,
        runValidators: true
    });
    // const audit = await Audit.create({ user: req.user.id })
    if (!doc) {
        return next(new AppError('No document found with the ID', 404));
    }
    res.status(200).json({
        isSuccess: true,
        status: 'success',
        results: doc.length,
        document: doc
    });
});

exports.deleteOne = catchAsync(async (req, res, next) => {
    const doc = await Employee.findByIdAndDelete(req.params.id);
    if (!doc) {
        return next(new AppError('No document found with the ID', 404));
    }
    res.status(204).json({
        isSuccess: true,
        status: 'success'
    });
});