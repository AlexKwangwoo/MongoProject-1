const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const sendEmail = require('../utils/email');
// const Email = require('./../utils/email');

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);

  // 쿠키 정의 / postman 활용시 result의 cookies탭에 있을것임!
  res.cookie('jwt', token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true, // frontend에 보고 쿠키저장에 보낼떄도 자동으로 보내게 해줄것임
    // 또한 한번 보낸쿠키를 지울수없다 그래서 할수있는방법은 같은 jwt 이름으로 다른 속성.. 즉 loggedout 같은걸
    // 보내줘 frontend에서 알아차릴수있따

    // secure은 보안강화!
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
  });

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm
  });

  // res.status(201).json({
  //   status: 'sucess',
  //   data: {
  //     user: newUser
  //   }
  // });

  const url = `${req.protocol}://${req.get('host')}/me`;
  console.log(url);
  // await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }
  // 2) Check if user exists && password is correct
  // password가 select가 false이기 떄문에 model에서..  // +password를통해 user안에있는 패스워드 가져와야함
  const user = await User.findOne({ email }).select('+password');
  // select 없이는
  // user found {
  //   photo: 'default.jpg',
  //   role: 'user',
  //   _id: 658b672473725540174faf85,
  //   name: 'Test',
  //   email: 'testing3@gmail.com',
  //   __v: 0
  // }

  // +password 로 할경우 다음과 같이 리턴 => 모든것 월래 default 리턴되는거 + 페스워드 리턴!
  // user found {
  //   photo: 'default.jpg',
  //   role: 'user',
  //   _id: 658b672473725540174faf85,
  //   name: 'Test',
  //   email: 'testing3@gmail.com',
  //   password: '$2a$12$PQWcmUknAapJMhnTHhd8H.JojTLfdQyHQrXP.f/sn4qhKhGk4JHKq',
  //   __v: 0
  // }

  // password 로 할경우 다음과 같이 리턴 -> 이메일이 포함안됨... 즉 패스워드만 보내라!
  // user found {
  //   _id: 658b672473725540174faf85,
  //   password: '$2a$12$PQWcmUknAapJMhnTHhd8H.JojTLfdQyHQrXP.f/sn4qhKhGk4JHKq'
  // }

  // console.log('user found', user);
  // correctPassword 우리가 만들어줬다!! userModel에 있다
  // user 먼저 체크후 비번 체크할것임!
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 3) If everything ok, send token to client
  createSendToken(user, 200, req, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  console.log('req.headers.authorization ', req.headers.authorization);
  console.log('req.cookies', req.cookies);
  console.log('token', token);
  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401)
    );
  }

  // 2) Verification token
  //verify 는 동기적이다.. 그서 비동기인 promisify를 사용해 다른일을 하면서 이것을 처리할것임!
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  console.log('decoded', decoded);
  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to this token does no longer exist.',
        401
      )
    );
  }

  // 4) Check if user changed password after the token was issued
  // changedPasswordAfter은 우리가 user model에 만듬
  // iat는 jwt가 만들어진시간. 그리고 유저model에 패스워드 바꾼시간을 저장하여 이를 비교할것임..
  // 패스워드 바꾼시간이 iat보다 나중이라면 비번을 바꾼것이 분명함.. 애러만들어야함!
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again.', 401)
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser; //이래야 api에서 누가 썻는지 알수있고
  res.locals.user = currentUser; //이래야 유저가 누군지 보내줄수있다!
  next();
});

// // Only for rendered pages, no errors!
// exports.isLoggedIn = async (req, res, next) => {
//   if (req.cookies.jwt) {
//     try {
//       // 1) verify token
//       const decoded = await promisify(jwt.verify)(
//         req.cookies.jwt,
//         process.env.JWT_SECRET
//       );

//       // 2) Check if user still exists
//       const currentUser = await User.findById(decoded.id);
//       if (!currentUser) {
//         return next();
//       }

//       // 3) Check if user changed password after the token was issued
//       if (currentUser.changedPasswordAfter(decoded.iat)) {
//         return next();
//       }

//       // THERE IS A LOGGED IN USER
//       res.locals.user = currentUser;
//       return next();
//     } catch (err) {
//       return next();
//     }
//   }
//   next();
// };

// Only for rendered pages, no errors!
exports.isLoggedIn = async (req, res, next) => {
  console.log('req.cookies', req.cookies);
  if (req.cookies.jwt) {
    try {
      // 1) verify token
      const decoded = await promisify(jwt.verify)(
        // 이게 로그아웃을통해 loggedout 값이 들어오면..(쿠키한 jwt) catch로 가는데 에러를 주면안됨으로 next를
        // catch에 써줘야한다!
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      // locals 에 써주면 !! pug에서 변수명을 사용할수있다!! ex) _header.pug
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'lead-guide']. role='user'
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with email address.', 404));
  }

  // 2) Generate the random reset token
  //user model에 함수있을것임!
  // 토큰을 만들때 passwordResetExpires를 유저model 안에 넣어서.. 나중에 바꿔줄때 이를 확인해서 유효시간안이면 허락할것임
  const resetToken = user.createPasswordResetToken();
  //validateBeforeSave -> deactivate all schema -> just save current data to the user
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;
    // await new Email(user, resetURL).sendPasswordReset();
    const message = `forgot your pw? ${resetURL}`;
    await sendEmail({
      email: user.email,
      subject: 'forgot',
      message
    });

    // console.log('email', email);

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!'
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sending the email. Try again later!'),
      500
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  // console.log('hashedToken', hashedToken);
  // 유저가가지고 있는 데이터베이스 안의 expire시간과 비교
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  // console.log('user', user);
  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Update changedPasswordAt property for the user
  // 4) Log the user in, send JWT
  createSendToken(user, 200, req, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  // User.findByIdAndUpdate will NOT work as intended! -> validation in model is not working
  //  + pre('save') is not working too! userModel에 있는 패스워드 관련 미들웨어 동작안함!
  await user.save();

  // 4) Log user in, send JWT
  createSendToken(user, 200, req, res);
});
