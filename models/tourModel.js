// Model => Business Logic

const mongoose = require('mongoose');
const slugify = require('slugify');
// const validator = require('validator');
const User = require('./userModel');

const tourSchema = new mongoose.Schema(
  // runValidators 이옵션 넣어줘야한다 update할때!!
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      maxlength: [40, 'A tour name must have less or equal then 40 characters'],
      minlength: [10, 'A tour name must have more or equal then 10 characters']
      // validate: [validator.isAlpha, 'Tour name must only contain characters']
    },
    slug: String,

    duration: {
      type: Number,
      required: [true, 'A tour must have a duration']
    },

    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size']
    },

    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty']
      // 이중에서만 골라야한다!!
      // enum: {
      //   values: ['easy', 'medium', 'difficult'],
      //   message: 'Difficulty is either: easy, medium, difficult'
      // }
    },

    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: val => Math.round(val * 10) / 10 // 4.66666 -> 4.7
    },

    ratingsQuantity: {
      type: Number,
      default: 0
    },

    price: {
      type: Number,
      required: [true, 'A tour must have a price']
    },

    priceDiscount: {
      type: Number,
      // custom validator!!!!!!!
      validate: {
        validator: function(val) {
          console.log('val ', val);
          console.log('this.price;', this.price);
          console.log('val < this.price;', val < this.price);
          // this only points to current doc on NEW document creation!! 새로운것을 만들때만 적용됨
          return val < this.price;
        }
        // VALUE 는 val과 똑같다 VALUE정해진 하드코드된것임!
        // message: 'Discount price ({VALUE}) should be below regular price'
      }
    },

    summary: {
      type: String,
      trim: true, // remove all white space between begining and end
      required: [true, 'A tour must have a description']
    },
    description: {
      type: String,
      trim: true
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image']
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false
    },
    startDates: [Date],

    secretTour: {
      type: Boolean,
      default: false
    },

    startLocation: {
      //이렇게 해줘야 coordinate및 이부분 빈칸으로 나둘수있음
      type: { type: String },
      coordinates: { type: [], default: undefined },
      address: String,
      description: String
    },

    // startLocation: {
    //   // GeoJSON / embeded object => 이게 작은 document 라고 보면됨!
    //   // startLocation안에 type coordinate address description 필드가 있는것임!
    //   type: {
    //     type: String,
    //     default: 'Point',
    //     enum: ['Point']
    //   },
    //   coordinates: { type: [], default: undefined },
    //   address: String,
    //   description: String
    // },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number
      }
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User' //User 여기껀 import필요없다 이렇게는 referencing
      }
    ]
    // reviews: [ <--이렇게 하면 리뷰 10만개 된다생각하면 너무 큼
    //   {
    //     type: mongoose.Schema.ObjectId,
    //     ref: 'Review'
    //   }
    // ]

    // guides:Array, <-이렇게 넣어주면 밑에 저게 작동해서 embeded 가 되었다!
    // tourSchema.pre('save', async function(next) {
    //   const guidesPromises = this.guides.map(async id => await User.findById(id));
    //   this.guides = await Promise.all(guidesPromises);
    //   next();
    // });
  },

  {
    // 이걸해야 버츄얼 데이터 사용가능, 데이터베이스에 없는내용을 결과에 보여주는것! 필수로 쓰자 걍! 밑에 virtual 참고
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

//1이나 -1 이 대부분 중요하지않다.. 배열순서임
// tourSchema.index({ price: 1 });
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' }); // geo쓰기위해 이거 해줌! 새로운index를 추가해야한다함..걍 이거는 묻지말고 넣어야함
// ------------------------------------------------------------
// https://mongoosejs.com/docs/middleware.html 참고!!
// function 항상 써줘야함
tourSchema.virtual('durationWeeks').get(function() {
  return this.duration / 7;
});

// Virtual populate
//  const tour = await Tour.findById(req.params.id).populate("reviews");
//get tour에서 저렇게 사용하여 쓴다!
tourSchema.virtual('reviews', {
  ref: 'Review', //본채의 아이디를
  foreignField: 'tour', // 넣어줄곳
  localField: '_id'
});

// ------------------------------------------------------------
// 중요한건 무엇인가 일어날때 그전 혹은 후에 뭔가 할수있는 장치를 마련하는게 목표!!
// DOCUMENT MIDDLEWARE: runs before .save() and .create()
// not .insertMany XXXXXX
// 무슨값이 저장될지모르고 저장될값이 유저의 값에 따라 달라질걸 사용할때 이렇게함
tourSchema.pre('save', function(next) {
  // this 는 방금 세이브한 document대상을 가지고있다!
  console.log('come???');
  this.slug = slugify(this.name, { lower: true });
  next();
});

// tourSchema.pre('save', async function(next) {
//   const guidesPromises = this.guides.map(async id => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

tourSchema.pre('save', function(next) {
  console.log('Will save document...');
  next();
});

// 저장되고 나서 불러옴!!!! *** 저장후에 불려지는것임!!
tourSchema.post('save', function(doc, next) {
  // ****post는 doc => 첫번쨰 인자로 리턴된 데이터를 받을수있음 pre는 this!!를 사용해야함!
  //doc 또한 투어 전체를 리턴함!
  // console.log('after tour created', doc);
  next();
});

// ------------------------------------------------------------
// QUERY MIDDLEWARE
// find는 find만 적용됨 findbyId이런거 안됨!
// /^find/를 해주면 find관련된거 다 해줄것임!
// tourSchema.pre('find', function(next) {
tourSchema.pre(/^find/, function(next) {
  // 여기서 this 는 쿼리가온다!!
  // ne = not equal
  // eq : false 로 하면안된다.. 데이터베이스에는 아직 false값이 생성안됨..
  // 우리가 임의로 나중에 생성된 데이터에만 넣어줘서 이미 만들어진 데이터는 default로 표시만 될뿐
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now(); // 쿼리 오브젝트안에 스타트타임 집어 넣는것임
  next();
});

tourSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt' //-를붙이고 guides 필드에 __v passwordChangedAt을 안보이게 한다
  });
  next();
});

tourSchema.post(/^find/, function(docs, next) {
  // docs 결과를 보자..
  //find의 결과는 투어 전체를 리턴함
  // console.log('find tour', docs);
  // console.log('this.tour', this.tour);
  // console.log('this??', this);
  console.log(`Query took ${Date.now() - this.start} milliseconds!`);
  next();
});

// ------------------------------------------------------------
// AGGREGATION MIDDLEWARE
// Tour.aggregate 들어가기전에 미리 제외시켜볼수있다
// distances 쓸꺼면 이거 꺼줘야함!!! 맨앞에 geoNear를 써줘야하는데.. 여기서 방해함.. 디스탄스 만쓸때 먼저 쓰게하면되는데
// 귀찮아서 일딴 끔
tourSchema.pre('aggregate', function(next) {
  // this aggregation object를 가리킬것임
  // unshift를 통해 상위로 올려줄것임! 컨솔로그 this찍어보면 안다!
  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });

  // aggregate에서 정의한 pipeline들 .. 조건들만 보여줌!
  console.log(this.pipeline());
  next();
});

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
