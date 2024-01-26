const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Tour = require('./../../models/tourModel');
const Review = require('./../../models/reviewModel');
const User = require('./../../models/userModel');

dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false
  })
  .then(() => console.log('DB connection successful!'));

// READ JSON FILE
const tours = JSON.parse(
  // node dev-data/data/import-dev-data.js --import   이걸치면  맨밑에 if문 식에 의해 지워지거나 import됨
  // node dev-data/data/import-dev-data.js --delete   이걸치면  맨밑에 if문 식에 의해 지워지거나 import됨

  fs.readFileSync(`${__dirname}/tours.json`, 'utf-8')
  // fs.readFileSync(`${__dirname}/tours-simple.json`, 'utf-8')
);
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'));
const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8')
);

// 중요!!**** 이거하기전에 userSchema.pre('save' 이거 다 꺼주고 해야함.. 안그러면 비번 다시 비크립트됨!
// IMPORT DATA INTO DB
const importData = async () => {
  try {
    await Tour.create(tours);
    //validateBeforeSave 써줘야한다.. 바로 컨펌패스워드 없이 들어가기에
    await User.create(users, { validateBeforeSave: false });
    await Review.create(reviews);
    console.log('Data successfully loaded!');
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

// DELETE ALL DATA FROM DB
const deleteData = async () => {
  try {
    await Tour.deleteMany();
    await User.deleteMany();
    await Review.deleteMany();

    console.log('Data successfully deleted!');
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

// 중요!! 이거하기전에 userSchema.pre('save' 이거 다 꺼주고 해야함.. 안그러면 비번 다시 비크립트됨!
if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
}
