const express = require('express');
const employeeController = require('./../controllers/employeeController');
const authController = require('./../controllers/authController');

// ROUTES 
const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);


router.route('/')
    .get(employeeController.getAllEmployee)
    .post(employeeController.createOne);


router.route('/:id')
    .get(employeeController.getOne)
    .patch(employeeController.updateOne)
    .delete(employeeController.deleteOne);

module.exports = router