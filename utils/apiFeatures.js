class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }
  // ex)
  // this.queryString {
  //   duration: { gte: '6' },
  //   difficulty: 'easy',
  //   sort: '-price,-ratingsAverage',
  //   fields: 'name',
  //   limit: '2',
  //   page: '2'
  // }

  // 일단 제일먼저 필터를 해준다!! page sort limit fields 다 제외시키고!
  filter() {
    // console.log('this query', await this.query);
    // Filtering

    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(each => delete queryObj[each]);

    //Advanced Filtering
    let queryStr = JSON.stringify(queryObj);
    // 필터 조건자앞에 다 $ 가 붙어야함..
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
    console.log('queryStr', queryStr);
    console.log('this.queryString', this.queryString);
    this.query = this.query.find(JSON.parse(queryStr));
    // let query = Tour.find(JSON.parse(queryStr));
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      console.log('this.queryString.sort', this.queryString.sort);
      const sortBy = this.queryString.sort.split(',').join(' ');
      console.log('sortBy', sortBy);
      // sortBy => -price -ratingsAverage
      this.query = this.query.sort(sortBy);
      // sort
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      console.log('limiteFields', fields);
      // +name,+duration +없어도됨... +는 저 필드만 보여주겠다는거고 -는 -만 뺴고 나머지 보여주겠다
      this.query = this.query.select(fields);
    } else {
      // -는 포함안시킴
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);

    // if (this.queryString.page) {
    //   const numTours = await Tour.countDocuments();
    //   console.log('numTours', numTours);
    //   if (skip > numTours) {
    //     throw new Error('This page does not exist');
    //   }
    // }
    return this;
  }
}
module.exports = APIFeatures;
