const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const compression = require('compression');
const globalErrorHandler = require('./controllers/errorController');
const AppError = require('./utils/appError');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const bookingController = require('./controllers/bookingController');

// middle response 라던지 많은것들을 압축해서 보내준다.. 자세한건 다시 알아봐야할듯

const app = express();

// 1) GLOBAL MIDDLEWARES
// Implement CORS
app.use(cors());
app.options('*', cors());

//pub 실행방법!
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views')); // ./view로 들어가면안된다 그냥 외우셈.. ./게하면 /등 문제가 생길수있다

// app.use(express.static(`${__dirname}/public`)); // 퍼블릭 폴더에있는 파일을 쓰게 할것임

app.use(express.static(path.join(__dirname, 'public'))); //path 사용해야함 , 퍼블릭 폴더에있는 파일을 쓰게 할것임
// Set security HTTP headers / put it in the begining
// app.use(
//   helmet({
//     contentSecurityPolicy: {
//       // directives: {
//       //   defaultSrc: ["'self'"],
//       //   connectSrc: ["'self'", 'http://127.0.0.1:8000', 'ws://localhost:3000/']
//       // }
//       contentSecurityPolicy: false,
//       useDefaults: true,
//       directives: {
//         'script-src': ["'self'", 'https://cdnjs.cloudflare.com/']
//       }
//     }
//   })
// );

// 이거 설정 잘해줘야 stripe 와 mapbox 가 실행가능함.. 안그러면 frontend에서 접근을 못함!
app.use(
  helmet.contentSecurityPolicy({
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'", 'data:', 'blob:'],
      baseUri: ["'self'"],
      fontSrc: ["'self'", 'https:', 'data:'],
      scriptSrc: [
        "'self'",
        'https://*.cloudflare.com',
        'https://*.stripe.com',
        'http:',
        'https://*.mapbox.com',
        'data:'
      ],
      frameSrc: ["'self'", 'https://*.stripe.com'],
      objectSrc: ["'none'"],
      styleSrc: ["'self'", 'https:', 'unsafe-inline'],
      workerSrc: ["'self'", 'data:', 'blob:'],
      childSrc: ["'self'", 'blob:'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: [
        "'self'",
        'blob:',
        'https://*.mapbox.com',
        'http://127.0.0.1:8000',
        'ws://localhost:3000/'
      ],

      upgradeInsecureRequests: []
    }
  })
);

// app.use(
//   helmet({
//     contentSecurityPolicy: {
//       directives: {
//         defaultSrc: ["'self'", 'data:', 'blob:', 'https:', 'ws:'],
//         baseUri: ["'self'"],
//         fontSrc: ["'self'", 'https:', 'data:'],
//         scriptSrc: [
//           "'self'",
//           'https:',
//           'http:',
//           'blob:',
//           'https://*.mapbox.com',
//           'https://js.stripe.com',
//           'https://m.stripe.network',
//           'https://*.cloudflare.com'
//         ],
//         frameSrc: ["'self'", 'https://js.stripe.com'],
//         objectSrc: ["'none'"],
//         styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
//         workerSrc: [
//           "'self'",
//           'data:',
//           'blob:',
//           'https://*.tiles.mapbox.com',
//           'https://api.mapbox.com',
//           'https://events.mapbox.com',
//           'https://m.stripe.network'
//         ],
//         childSrc: ["'self'", 'blob:'],
//         imgSrc: ["'self'", 'data:', 'blob:'],
//         formAction: ["'self'"],
//         connectSrc: [
//           "'self'",
//           "'unsafe-inline'",
//           'data:',
//           'blob:',
//           'https://*.stripe.com',
//           'https://*.mapbox.com',
//           'https://*.cloudflare.com/',
//           'https://bundle.js:*',
//           'ws://127.0.0.1:*/'
//         ],
//         upgradeInsecureRequests: []
//       }
//     }
//   })
// );

// 1) MIDDLEWARES
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from same API
// 자동으로 아이피 당 갯수를 헤더에 보내준다.. postman 결과값탭에서 Headers에 보면
// X-RateLimit-Limit 와 X-RateLimit-Remaining 가 있다. 이설정을 해줌으로써 무한 리퀘스트 방지
const limiter = rateLimit({
  max: 400,
  windowMs: 10 * 60 * 1000, //10분있으면 리셋됨
  message: 'Too many requests from this IP, please try again in an hour!'
});
app.use('/api', limiter);

// stripe
app.post(
  '/webhook-checkout',
  bodyParser.raw({ type: 'application/json' }),
  bookingController.webhookCheckout
);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' })); //10kb 넘어 가면 안받아줄것임
app.use(express.urlencoded({ extended: true, limit: '10kb' })); // 이걸해줘야 프론트엔드에서 form 형식으로 보낼수있음!
app.use(cookieParser()); //frontend에서 오는 쿠키를 확인해주게함!

// Data sanitization against NoSQL query injection
// email 대신에 { "$gt":""} => 이런식으로 보내면 패스워드만 검색할것임...그래서 오는 내용(바디)을 점검 해줘야함
// 이게 대신해줌.. 대략적으로 달러사인$ 같은것들을 지워줌
app.use(mongoSanitize());

// Data sanitization against XSS
// 인풋에 html 코드와 같은것을 넣는사람들 방지 이를 클린시켜줄것임
app.use(xss());

// Prevent parameter pollution
// sort=-price,-ratingsAverage 이런식으로 와야하는데
// sort= ~~ & sort= ~~ 하면 오류가 생김
// appFeatures.js 에 sort가
// console.log('this.queryString.sort', this.queryString.sort);
// 이것이 스트링을 예상하지만 어레이로 오기떄문에 진행이 안됨=> 이것을 통해 중복 필드를 마지막꺼만 사용함
// 화이트 리스트에 있는것들은 중복으로 사용가능하게 할것임...  duration이 5 도 4도 찾고싶을때를 위해
// 즉 duration =5 , sort = duration / 여기서 왼쪽 키값을 규제 하는것임!
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price'
    ]
  })
);

// Test middle ware
app.use((req, res, next) => {
  console.log('Hello from the middleware 👋');
  req.requestTime = new Date().toISOString();
  // console.log(req.headers);
  next();
});

// 3) ROUTES

// pug.-> moved to view Router
// app.use('/', viewRouter);
// app.use('/', (req, res) => {
//   res.status(200).render('base');
// });
// app.use('/overview', (req, res) => {
//   res
//     .status(200)
//     .render('overview', { title: 'The Forest Hiker', user: 'Jonas' });
// });
// app.use('/tour', (req, res) => {
//   res.status(200).render('tour', { title: 'The Forest Hiker', user: 'Jonas' });
// });

app.use(compression());

app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
