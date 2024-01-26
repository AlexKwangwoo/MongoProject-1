// review / rating / createdAt / ref to tour / ref to user
const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty!']
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour.']
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user']
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// 이렇게 하면 투어하나당 유저하나당 한개씩만 쓸수있게된다
// 혹시 안된다면...
// 리뷰 전체 다지우고 새로 해보면 아무 문제 없을것임 이미 만들어진것들때문에 유닉크 조합을 할수없음
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function(next) {
  // user 만 쓰면 전체다 나오는거 / path 주면 select 까지 선택가능! boooking 참고!
  this.populate({
    path: 'tour',
    select:
      '-startLocation -guides -description -locations -ratingsAverage -ratingsQuantity -images -startDates -secretTour -duration -maxGroupSize -difficulty -price -summary -imageCover -slug -durationWeeks'
  }).populate({
    // 이렇게하면 투어에서 리뷰를 볼떄 또 투어를 넣어줄것임... 그래서 밑에서 투어없이 해봄
    //durationWeeks 도 보이는데 이는 가상 결과라 나옴 db에서오는게아님
    path: 'user',
    select: '-__v -passwordChangedAt' //-를붙이고 guides 필드에 __v passwordChangedAt을 안보이게 한다
  }); //영상에서는 populate tour는 안썼음.. 그래서 바로 tour에 id가 들어가서 밑에 post에서 tour <-자리에 id가 있는것임

  // this.populate({
  //   path: 'tour',
  //   select: 'name'
  // }).populate({
  //   // 이렇게하면 투어에서 리뷰를 볼떄 또 투어를 넣어줄것임... 그래서 밑에서 투어없이 해봄
  //   //durationWeeks 도 보이는데 이는 가상 결과라 나옴 db에서오는게아님
  //   path: 'user',
  //   select: '-__v -passwordChangedAt' //-를붙이고 guides 필드에 __v passwordChangedAt을 안보이게 한다
  // });

  // this.populate({
  //   // 이렇게하면 투어에서 리뷰를 볼떄 또 투어를 넣어줄것임... 그래서 밑에서 투어없이 해봄
  //   //durationWeeks 도 보이는데 이는 가상 결과라 나옴 db에서오는게아님
  //   path: 'user',
  //   select: '-__v -passwordChangedAt' //-를붙이고 guides 필드에 __v passwordChangedAt을 안보이게 한다
  // });
  next();
});

// reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

// reviewSchema.pre(/^find/, function(next) {
//   // this.populate({
//   //   path: 'tour',
//   //   select: 'name'
//   // }).populate({
//   //   path: 'user',
//   //   select: 'name photo'
//   // });

//   this.populate({
//     path: 'user',
//     select: 'name photo'
//   });
//   next();
// });

// reviewSchema.statics.calcAverageRatings = async function(tourId) {
//   const stats = await this.aggregate([
//     {
//       $match: { tour: tourId }
//     },
//     {
//       $group: {
//         _id: '$tour',
//         nRating: { $sum: 1 },
//         avgRating: { $avg: '$rating' }
//       }
//     }
//   ]);
//   // console.log(stats);

//   if (stats.length > 0) {
//     await Tour.findByIdAndUpdate(tourId, {
//       ratingsQuantity: stats[0].nRating,
//       ratingsAverage: stats[0].avgRating
//     });
//   } else {
//     await Tour.findByIdAndUpdate(tourId, {
//       ratingsQuantity: 0,
//       ratingsAverage: 4.5
//     });
//   }
// };

// reviewSchema.post('save', function() {
//   // this points to current review
//   this.constructor.calcAverageRatings(this.tour);
// });

// // findByIdAndUpdate
// // findByIdAndDelete
// reviewSchema.pre(/^findOneAnd/, async function(next) {
//   this.r = await this.findOne();
//   // console.log(this.r);
//   next();
// });

// reviewSchema.post(/^findOneAnd/, async function() {
//   // await this.findOne(); does NOT work here, query has already executed
//   await this.r.constructor.calcAverageRatings(this.r.tour);
// });

// 우리가 statics안에 함수를 만들어주는것임!
reviewSchema.statics.calcAverageRatings = async function(tourId) {
  console.log('tourIdtourIdtourId', tourId);
  console.log('this in calcAverageRatings', this);
  const stats = await this.aggregate([
    {
      $match: { tour: tourId }
    },
    {
      $group: {
        _id: '$tour', //하나의 투어에 여러개의 리뷰가 있을껀데.. 투어별로 볼것임! 근데 메치에서 투어 하나만 선택했음
        nRating: { $sum: 1 }, // 1 x 토탈length 임.. 이렇게하면 x1이라생각해
        avgRating: { $avg: '$rating' } //rating의 평균을 구할것임
      }
    }
  ]);
  console.log(stats);

  if (stats.length > 0) {
    // 발견된게 없다면 tour model에서 default로 설정한 0, 4.5를 저장할것임!
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5
    });
  }
};

//pre로 하면 저장전이라.. 지금 저장하는 리뷰는 포함안되기에 post로 save뒤에 해야함!!
reviewSchema.post('save', function() {
  // this points to current review
  // 월래는 Review.calcAverageRating(this.tour) 해줘야하는데.. Review는 맨밑에서 정의될것임..!! 168강 에서나옴
  // 왜냐하면 reviewSchema가 아직 Review에 안들어갔기 떄문에.. 그래서
  // 인스턴트를 가져오고싶을떄는
  //constructor 를 쓴다! 마치 자바스크립트 클래스에서 this.과 같음! 자신내부함수 쓰기위해
  // constructor 는 model을 가리킨다

  //this 는 review모델이고 review안의 tour는 아이디만 저장하고있음!
  console.log('review save post this', this);
  this.constructor.calcAverageRatings(this.tour);
});

// 만약 리뷰 자체평점을 업데이트 하고 싶은데 투어의 평균 평점은 어떻게 계산되는가? 위에 save는 새로운 리뷰가
//저장될때 저 함수를 실행시키게된다
// findByIdAndUpdate
// findByIdAndDelete
reviewSchema.pre(/^findOneAnd/, async function(next) {
  // pre에서의 this는 쿼리에 접근 가능 하지만 post에서는 쿼리 접근 가능 안함! test를 보자 post에서 받을수있는지

  this.r = await this.findOne(); // 여기서 r에게 찾고자 하는 다큐먼트를 리턴
  // r: {
  //   _id: 659c7a461b974608c56fe177,
  //   review: 'Amazing!!! test 2',
  //   rating: 3,
  //   tour: {
  //     _id: 659c7a051b974608c56fe16e,
  //     name: 'New Test Tour',
  //     priceDiscount: 100,
  //     __v: 0,
  //     durationWeeks: NaN,
  //     id: '659c7a051b974608c56fe16e'
  //   },
  //   user: {
  //     photo: 'user-1.jpg',
  //     role: 'admin',
  //     _id: 5c8a1d5b0190b214360dc057,
  //     name: 'Jonas Schmedtmann',
  //     email: 'admin@natours.io'
  //   },
  //   createdAt: 2024-01-08T22:42:14.790Z,
  //   __v: 0,
  //   id: '659c7a461b974608c56fe177'
  // },
  this.test = 'testing I am here';
  console.log('pre this', this);
  console.log('pre this r', this.r);
  next();
});

reviewSchema.post(/^findOneAnd/, async function() {
  // await this.findOne(); does work here, query has already executed <- 글쓴이가 잘못한듯
  // this는 쿼리를 받아오는데.. findOneUpdate는 findOne을 여기서 해주면 결과를 받아와서
  // 상관없는데 findOneDelete경우에 지워버려서 findOne을해서 못찾는다
  // 즉 pre에서 아직 리뷰가 죽기전에 찾은 리뷰를 미리 this에 넣어준다.. 그걸 post에서 사용하는것임

  // delete를 사용한경우.. findOne()이 작동을안한다..그래서 이전 pre에서 r을 세팅해주는게 좋다!
  // const testR = await this.findOne();
  // console.log('testR', testR);
  // console.log('this from Post !!!!', this);
  // console.log('this.tour from Post !!!!', this.tour);
  console.log('this.r.tour from post 2 !!!', this.r.tour);
  // await testR.constructor.calcAverageRatings(testR.tour._id); // id는안됨.._id만됨
  await this.r.constructor.calcAverageRatings(this.r.tour._id); // id는안됨.._id만됨
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
