const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name!']
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true, //convert them to lowercase
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  photo: {
    type: String,
    default: 'default.jpg'
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user'
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false //이거 해주면  get user 써도 안보임! 디비에는 보일것임.. 단 패스워드 검사때도 User.find쓸때 이부분은
    // 안오게 되는데.. +password를 추가인자로 넣어줘야 올 리턴데이터와 비교가능!
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // This only works on CREATE and SAVE!!! User.create or User.save
      validator: function(el) {
        return el === this.password;
      },
      message: 'Passwords are not the same!'
    }
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    //유저를 지우는대신 잠금한다!
    type: Boolean,
    default: true,
    select: false
  }
});

//유저가 저장하기전에 이게 먼저 실행될것임
// DOCUMENT MIDDLEWARE: runs before .save() and .create()
// not .insertMany XXXXXX
userSchema.pre('save', async function(next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // Delete passwordConfirm field // no need for db, just need field 즉 필드만 있고 값은 없어도됨
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function(next) {
  //isNew 는 바로 document 데이터가 생성된지 확인...
  if (!this.isModified('password') || this.isNew) return next();

  // 시간 차이를 좀더 빠르게 만드는걸로 해줘야 웹토큰이 뒤에 만들어진거라 생각가능... 웹토큰이 changedpw보다 빠르면
  // 우리는 에러를 낼것임
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// ^find -=> find로 시작하는 메소드를 받는다면 실행
userSchema.pre(/^find/, function(next) {
  //유저찾을때 active가 not equal인걸로 받을것임!
  // 미리 생성된 유저들중 active 필드가 없는곳이 있을것이므로
  // equal === true /{active:true} 하는게 아니라 active !== false 를 찾을것임!
  // this points to the current query
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    ); //2019-04-30T00:00:00.000z 를 15201233 iso or unix시간? 으로 바꿔줌

    return JWTTimestamp < changedTimestamp;
  }

  // False means NOT changed
  return false;
};

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  //  해쉬한값을 데이터베이스에 넣을거고 resetPassword 사용할때 param으로 해쉬안된 토큰정보를 가져와서
  // 다시 해쉬해 데이터베이스에 저장된 유저 토큰과 같을시 유효날짜 한번더 확인할것임!
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // token을 바로 유저에 저장안하고.. 다시 암호화해서 저장한다
  console.log({ resetToken }, this.passwordResetToken);

  // 10 mins 유효시간도 저장!
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
