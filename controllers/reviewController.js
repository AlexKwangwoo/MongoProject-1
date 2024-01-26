const Review = require('./../models/reviewModel');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.setTourUserIds = (req, res, next) => {
  // Allow nested routes
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);

// exports.getAllReviews = catchAsync(async (req, res) => {
//   let filter;
//   if (req.params.tourId) filter = { tour: req.params.tourId };

//   const reviews = await Review.find(filter).select('-__v');

//   res.status(200).json({
//     status: 'success',
//     results: reviews.length,
//     data: {
//       reviews
//     }
//   });
// });

// exports.getReview = catchAsync(async (req, res, next) => {
//   const review = await Review.findById(req.params.id).select('-__v');

//   //Tour.findOne({_id:req.params.id})

//   if (!review) {
//     // AppError 를 통해 바로 global error handler 로 갈것임
//     return next(new AppError('No tour found with that ID', 404));
//   }
//   res.status(200).json({
//     status: 'success',
//     data: {
//       review
//     }
//   });
// });

// exports.createReview = catchAsync(async (req, res, next) => {
//   console.log('req.body', req.body);
//   if (!req.body.tour) req.body.tour = req.params.tourId;
//   if (!req.body.user) req.body.user = req.user.id;

//   const newReview = await Review.create(req.body);

//   res.status(201).json({
//     status: 'success',
//     data: {
//       review: newReview
//     }
//   });
// });

// exports.deleteReview = factory.deleteOne(Review);
