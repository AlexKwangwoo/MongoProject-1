class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    console.log('come in AppError Class');
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; //isOperational 를통해 ,error controller에서 우리가 만든애러인지 확인할것임

    Error.captureStackTrace(this, this.constructor);
    // 여기다음 error.controller 로 갈것임
  }
}

module.exports = AppError;
