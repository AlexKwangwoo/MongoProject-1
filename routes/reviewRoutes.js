const express = require('express');
const reviewController = require('./../controllers/reviewController');
const authController = require('./../controllers/authController');

//mergeParams 이걸사용햐줘야 이전단계의 라우터주소 ex)tourId같은걸 가져올수있다!
// router.use('/:tourId/reviews', reviewRouter);
const router = express.Router({ mergeParams: true });

router.use(authController.protect);
// Protect all routes after this middleware
// 이밑으로는 다 유저로그인 상태에서만 가능!
router
  .route('/') // middleware
  .get(reviewController.getAllReviews)
  .post(
    // authController.protect, //이 post안에 있는 여기 줄 밑으로는 토큰 필요
    authController.restrictTo('admin'), // 이 post안에 밑에있는 줄에는 admin 롤 필요
    reviewController.setTourUserIds,
    reviewController.createReview
  );

router
  .route('/:id') // middleware
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview
  )
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview
  );

module.exports = router;
