const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');
const Tour = require('./../models/tourModel');
const APIFeatures = require('./../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

// 이거는 프론트엔드에서 form받아오는건 안함.. 포스트맨으로 하였다!
exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 }
]);

// upload.single('image') req.file
// upload.array('images', 5) req.files

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  console.log('req tour images!!!', req.files);
  if (!req.files.imageCover || !req.files.images) return next();

  // 1) Cover image
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // 2) Images
  req.body.images = [];

  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);

      req.body.images.push(filename);
    })
  );

  next();
});

exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

// exports.getAllTours = catchAsync(async (req, res) => {
//   const features = new APIFeatures(Tour.find(), req.query)
//     .filter()
//     .sort()
//     .limitFields()
//     .paginate();

//   // 쿼리를 다 짜집기해서 마지막에 await을 붙여줘서 promise를 반환하는것의 값을 받아낸다 즉 paginate까지 모든 함수를
//   // 다 거친뒤 promise로 보내버리기때문
//   // 사실상 await Tour.find().find(xxx).sort(xxx).select(xxx).skip(xxx).limit(xxx) 라고보면됨
//   // await안붙여주면 프로미스 안기다린거기때문에 불러봐야 .query는 프로미스상태임!
//   const tours = await features.query;
//   res.status(200).json({
//     status: 'success',
//     results: tours.length,
//     data: {
//       tours
//     }
//   });
// });

// exports.getTour = catchAsync(async (req, res, next) => {
//   // const tour = await Tour.findById(req.params.id).populate({
//   //   path: 'guides',
//   //   select: '-__v -passwordChangedAt' //-를붙이고 guides 필드에 __v passwordChangedAt을 안보이게 한다
//   // }); // model 에 써줘서 미들웨어에서 자동으로 하게끔만듬!
//   // const tour = await Tour.findById(req.params.id).populate('guides');
//   const tour = await Tour.findById(req.params.id).populate('reviews');

//   //Tour.findOne({_id:req.params.id})

//   if (!tour) {
//     // AppError 를 통해 바로 global error handler 로 갈것임
//     return next(new AppError('No tour found with that ID', 404));
//   }
//   res.status(200).json({
//     status: 'success',
//     data: {
//       tour
//     }
//   });
// });
// Controller Application Logic

// exports.createTour = catchAsync(async (req, res, next) => {
//   // const newTour = new Tour({})
//   // newTour.save() ==>  Tour.create({}) 같다

//   const newTour = await Tour.create(req.body);

//   res.status(201).json({
//     status: 'success',
//     data: {
//       tour: newTour
//     }
//   });
// });

// exports.updateTour = catchAsync(async (req, res, next) => {
//   // findByIdAndUpdate update some fields! not all!! all => need to use PUT
//   // 부분만 업데이트는 patch
//   const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
//     //
//     new: true,
//     runValidators: true
//   });

//   if (!tour) {
//     // AppError 를 통해 바로 global error handler 로 갈것임
//     return next(new AppError('No tour found with that ID', 404));
//   }

//   res.status(201).json({
//     status: 'success',
//     data: {
//       tour
//     }
//   });
// });

// exports.deleteTour = catchAsync(async (req, res, next) => {
//   // findByIdAndUpdate update some fields! not all!! all => need to use PUT
//   const tour = await Tour.findByIdAndDelete(req.params.id);

//   if (!tour) {
//     // AppError 를 통해 바로 global error handler 로 갈것임
//     return next(new AppError('No tour found with that ID', 404));
//   }
//   res.status(204).json({
//     status: 'success',
//     data: null
//   });
// });

// aggregation 참고 한번 api실행해보면 느낌옴.. 난이도에 따라 정렬될것임
// https://www.mongodb.com/docs/manual/reference/operator/aggregation/#date-expression-operators
exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      //similar filter 4.5이상 만 고른다
      $match: { ratingsAverage: { $gte: 4.5 } }
    },
    {
      $group: {
        // _id: '$difficulty',
        _id: { $toUpper: '$difficulty' }, //difficulty 괄호없이 넣을수있음 + difficulty 난이도에 따라 그룹으로 나옴!
        numTours: { $sum: 1 }, //총 그룹.length 나온 결과의 곱하기 x 숫자 라고 생각하면됨
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }
    },
    {
      // 그룹안에서 만든 이름만 솔팅 가능한듯?
      // 1 for accessending
      $sort: { avgPrice: 1 }
    }
    // {
    // // ne = not equal
    //   $match: { _id: { $ne: 'EASY' } }
    // }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});

// aggregation 참고
// https://www.mongodb.com/docs/manual/reference/operator/aggregation/#date-expression-operators
exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1; // 2021

  const plan = await Tour.aggregate([
    {
      // 어레이를 풀어준다.. 즉 startDates에 3개가있다면 하나의아이탬이 3개로 다른 startDates를 가지게된다
      // 투어document당 3개정도의 날짜 어레이가 잇음!
      $unwind: '$startDates'
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      // group 필드를 stage라고 하고 그안에 $내용은 오퍼레이터라함
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' } // 투어이름을 보여주고싶은데 어레이로 주고싶다. push로 사용할수있음
      }
    },
    {
      // id가 보기싫어서 id를 대신 month로 하나더 추가하고 밑에 project에서 id를 삭제할것임
      $addFields: { month: '$_id' }
    },
    // {   => 년도별로 나눈뒤 똑같은 시간에만 하는 투어로만 나누기
    //   $group: {
    //     _id: { $hour: '$startDates' },
    //     numTourStarts: { $sum: 1 },
    //     tours: { $push: '$name' }
    //   }
    // },
    // {
    //   $addFields: { hour: '$_id' }
    // },
    {
      $project: {
        // 0은 안보여주고 1은 보여주고
        _id: 0
      }
    },
    {
      // -1 큰거부터 작은거
      $sort: { numTourStarts: -1 }
    },
    {
      $limit: 12
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan
    }
  });
});

// /tours-within/:distance/center/:latlng/unit/:unit
// /tours-within/233/center/34.111745,-118.113491/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitutr and longitude in the format lat,lng.',
        400
      )
    );
  }
  console.log('lat lng', lat);

  //geoWithin 문서에 있다
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours
    }
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitutr and longitude in the format lat,lng.',
        400
      )
    );
  }

  const distances = await Tour.aggregate([
    {
      // geoNear가 맨처음 나와야한다!
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1]
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier // 이것을 통해 거리를 1m로 나올지 km기준으로 할지 정한다.. 기본은 m
      }
    },
    {
      $project: {
        distance: 1,
        name: 1
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances
    }
  });
});

// ----------------------------------------------------------------------------------------
// orginal express

// const tours = JSON.parse(
//   fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
// );
// exports.checkID = (req, res, next, val) => {
//   console.log(`Tour id is: ${val}`);

//   // if (req.params.id * 1 > tours.length) {
//   //   return res.status(404).json({
//   //     status: 'fail',
//   //     message: 'Invalid ID'
//   //   });
//   // }
//   next();
// };

// exports.checkID2 = (req, res, next, val) => {
//   console.log(`Tour p is: ${val}`);

//   // if (req.params.id * 1 > tours.length) {
//   //   return res.status(404).json({
//   //     status: 'fail',
//   //     message: 'Invalid ID'
//   //   });
//   // }
//   next();
// };

// exports.checkBody = (req, res, next) => {
//   if (!req.body.name || !req.body.price) {
//     return res.status(400).json({
//       status: 'fail',
//       message: 'Missing name or price'
//     });
//   }
//   next();
// };
