const AppError = require('./../utils/appError');

const handleCastErrorDB = err => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = err => {
  console.log('handleDuplicateFieldsDB err', err);
  // const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const value = err.keyValue.name;

  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = err => {
  // const object1 = {
  //   a: 'somestring',
  //   b: 42,
  //   c: false,
  // };

  // console.log(Object.values(object1));
  // Expected output: Array ["somestring", 42, false]
  const errors = Object.values(err.errors).map(el => el.message);

  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401);

const sendErrorDev = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  }

  // B) RENDERED WEBSITE
  // error.pug 템플릿을 사용하여 보여줄것임! 잘못된 주소로 왔으면!
  console.error('ERROR 💥', err);
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.message
  });
};

const sendErrorProd = (err, req, res) => {
  // A) API 여기로 오면 우리 api에서 에러가뜬것임!
  if (req.originalUrl.startsWith('/api')) {
    // Operational 에러는 appError.js 에서 우리쪽에 보낸에러라고 true로 보내준것임.. 예상되는 에러!
    // A) Operational, trusted error: send message to client(meesage we created!)
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    }
    // B) Programming or other unknown error: don't leak error details
    // 1) Log error (maybe from 3rd party ex)mongodb or library )
    console.error('ERROR 💥', err);
    // 2) Send generic message
    return res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!'
    });
  }

  // B) RENDERED WEBSITE
  // A) Operational, trusted error: send message to client
  // error.pug 템플릿을 사용하여 보여줄것임! 잘못된 주소로 왔으면!
  // Operational 에러는 appError.js 에서 우리쪽에 보낸에러라고 true로 보내준것임.. 예상되는 에러!

  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message
    });
  }
  // B) Programming or other unknown error: don't leak error details
  // 1) Log error
  console.error('ERROR 💥', err);
  // 2) Send generic message //unexpected error 왔을때! 우리가 만든 애러가 아님!
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'Please try again later.'
  });
};

module.exports = (err, req, res, next) => {
  // console.log(err.stack);
  console.log('come in error Controller');

  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;

    if (error.message.split(' ')[0] === 'Cast')
      error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.message.split(' ')[0] === 'Validation')
      error = handleValidationErrorDB(error);
    if (
      error.message.split(' ')[0] === 'Unexpected' &&
      error.message.split(' ')[1] === 'token'
    )
      error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};
