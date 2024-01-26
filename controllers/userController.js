const multer = require('multer');
const sharp = require('sharp');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');

// ****** s3 쓰고싶으면 노션노트에 저장해뒀음!
// 이거는 sharp에서 저장장소 지정해줄것임 이거는 컴퓨터에 저장이고..
// const multerStorage = multer.diskStorage({
//   // multer 깃헙에 나온거를 가져온것임
//   // cb 는 콜백임!
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     // mimetype 은 파일 확장자의 키
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   }
// });

// 이거는 메모리에 저장될것임!
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

// form에서 의 필드들중 이름이 photo
exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  // allowedFields 안에있는 필드들을 제외하고 월래의값으로 유지시킬것임.. 바꾸길 원하지 않는다
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getMe = (req, res, next) => {
  // 다른건 파라미터로 업데이트때 받아오지만.. 이거는 파라미터에 보통 포함안시키기에.. 인터셉터 해서 넣어줌!
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  console.log('req.file', req.file);
  console.log('req.body', req.body);

  console.log('come?');
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword.',
        400
      )
    );
  }

  console.log('req.body', req.body);
  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'name', 'email');
  if (req.file) filteredBody.photo = req.file.filename; //multerStorage에서 filename 정해줌!

  // 3) Update user document
  // save를할경우 pre("save") 에서 password를 체크하기떄문에.. findByIdAndUpdate를 이용해야함!
  console.log('filteredBody update me', filteredBody);
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true, //new 업데이트된 오브젝트를 리턴할것임
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// exports.createUser = (req, res) => {
//   res.status(500).json({
//     status: 'error',
//     message: 'This route is not defined! Please use /signup instead'
//   });
// };

// exports.getUser = factory.getOne(User);
// exports.getAllUsers = factory.getAll(User);

// // Do NOT update passwords with this!
// exports.updateUser = factory.updateOne(User);
// exports.deleteUser = factory.deleteOne(User);

// exports.createUser = (req, res) => {
//   res.status(500).json({
//     status: 'error',
//     message: 'This route is not defined! Please use /signup instead'
//   });
// };

exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);

// Do NOT update passwords with this!
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
