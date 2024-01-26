아이디 admin@natours.io
비번 test1234

sudo npm run debug 안될때는 3000포트 npm start 시킨다음 다른터미널에서 디버그실행후 3000을 꺼주면된다

**\*\*\*\***유저파일에 있는 모든 유저의 비번은 test1234이다!!

1. table에 require 적어놨더라도 데이터를 보낼때만 required 이지 db안에는 undefined로 필드가 없을수도있음

2. app.use((req, res, next) => {
   console.log('Calling first middleware');
   next();
   console.log('Calling after the next() function');
   });
   app.use((req, res, next) => {
   console.log('Calling second middleware');
   return next(); // It returns the function block immediately and call next() function so the return next(); and next(); return; are the same
   console.log('After calling return next()');
   });

<!-- 즉 next()만 반환하면 밑에 줄도 실행되면서 다음께 불러와지고 return next()하면 그밑에줄은 실행안됨
또한 에러를보낼때만 next(err) 사용하는거!!!!-->
<!-- Calling first middleware
Calling after the next() function
Calling second middleware -->

3. coordinate geokey 오류!!
   <!-- https://stackoverflow.com/questions/50321792/how-to-store-geojson-when-location-is-empty-in-mongodb 참고! --> 그냥 설정을 피해야한다.. type이 point가 되는순간 coordinate 를 무조건 찾음!
   간단히 말해서, 전혀 설정하지 마십시오. 문제는 아마도 몽구스 스키마로 인해 더욱 복잡해질 것입니다. MongoDB의 관점에서 보면 속성이 단순히 존재하지 않더라도 상관하지 않으며 이후에 인덱스에서 해당 속성을 무시합니다.

원하지 않을 때 실제로 무언가를 생성하는 것은 "몽구스"이므로 데이터를 제공하지 않는 경우 구조를 포함하지 않도록 간단히 "말"하십시오.

location: {
type: { type: String },
coordinates: { type: [], default: undefined }
}
배열이 값으로 coordinates설정되어 있는 한 몽구스는 문서가 데이터베이스에 지속될 때 문서에 "빈 배열"을 추가하려고 시도하지 않으며 이로 인해 인덱스에 문제가 발생합니다.defaultundefined

4. guides를 child referencing 사용시 객체 오브젝트 내용 얻는방법은
   getTour 함수에서 populate("guides") 써주면된다 => 하지만 쿼리를 두번하는거라.. 자식을 불러와야해서 all tour에 넣고싶으면 그만큼 퍼포먼스가 느려질수있다

5) 자식이 얼마나 커질지 모르고 업데이트 되어야할지 모르겠으면.. parent referencing이 최선이다! 자식에서 부모 아이디를 저장하는것!

6. denormalized = embeded 몽고디비 추천이유.. 한문서에 관계를 다 넣어버림
   normalized = referencing 일반 적인 시퀄 데이터베이스

7. 6번은 노션!

8. select에서 보여줄꺼 뺼꺼 결정할때 - 와 +는 같이 쓸수없음

9. virtual 을 이용하여,,, 리뷰가 부모인 투어를 레퍼렌싱할때 투어가 아이디를 저장하고있으면좋지만.. 리뷰가 10000만개 되면 너무 커진다.. 그서 부모 레퍼렌싱을 한건데...,,,/// virtual을 이용하면 이를 막을수있다!

10) protect 를통해 req에 유저 정보를 넣어준다!

11. 167강 퍼포먼스 높이는법...
    const doc = await features.query.explain();
    를 사용해서 execuionstate를 확인한뒤
    "nReturned": 4,
    "totalDocsExamined": 4, 를 보면된다.. 리턴된게 4개고 이를위해 다큐먼트 뒤진 아이탬객수가 4라는뜻..
    10개를 뒤져 4개를 얻는것보다 효율이 좋다.. 이는 tourSchema.index({ price: 1, ratingsAverage: -1 });
    와 같이 사용한다. 다만 getAllTour할때 마라미터 필드가 price또는 ratingAverage일때만 가능! -> 확인은 몽고디비 index필드에서 사용가능

    근데 주의해야할점은 자주 ㅅ쿼리안할꺼같은 필드는 안하는게좋음... 내가 tour를 업데이트할때마다 저모든 관련 인덱스
    필드를 미리 준비해놔야하기떄문이다!

    -- 필요없는 인택스 필드는 지워주셈!!

12) tourSchema.post 에서 this 는 모델자체를 가리킨다!
    인자로 받는 docs는 결과물을 리턴한다보면된다!!

13. pre에서 this에 추가 시키면 post에서 this에서 받을수있다 review pre 참고!!!
    save에서의 this는 만들어진 다큐먼트 자체를 리턴한다!! 하지만
    pre에서는 this는 쿼리를 반환시킨다
    post에서 /^findOneAnd/ 는 쿼리에 접근하여

14. id넘겨서 안될때는 \_id를 넘겨보자!! tourId .id 반응안하고 .\_id 반응함!
    const stats = await this.aggregate([
    {
    $match: { tour: tourId }
    },
    {
    $group: {
    _id: '$tour', //하나의 투어에 여러개의 리뷰가 있을껀데.. 투어별로 볼것임! 근데 메치에서 투어 하나만 선택했음
    nRating: { $sum: 1 }, // 1 x 토탈length 임.. 이렇게하면 x1이라생각해
    avgRating: { $avg: '$rating' } //rating의 평균을 구할것임
    }
    }
    ]);

15. 리액트와 다르게 pug파일에서 클래스명을 지정.. js파일에서 그 클래스명에 맞는 아이디를 가져와 거기서  
    addEventListener를 이용해 함수 연결.. 함수는 또다른 js파일에서 가져오는걸로 정리해둠!
    login(email, password) 참고.. 찾기로 찾압보면알수있음!

16) // THERE IS A LOGGED IN USER
    // locals 에 써주면 !! pug에서 변수명을 사용할수있다!!
    res.locals.user = currentUser;

17. back 에서 사용하는 문법과 프론트엔드에서 사용하는 문법(es6)가 달라서... 오류가 프론트앤드에서 많이남..
    그래서 bundle을 만들어 index에서 번들을 만들어 base에서 저거 하나의 번들만 script로 돌릴것임!
    //- npm run watch:js 를 입력하면 번들이 만들어질것임! package.json에 보면 js에 있는 index를 bundle파일로 변환할것임

18. // multer는 multi form 방식을 지원한다!

19. testing stripe -> card number 4242 4242 4242 4242 만료일 과 년도 CSV 아무거나 입력하면됨

20. pre 미들웨어에서는 항상 next() 붙여줘야함 안그러면 이동안함..다음껄로.. 걍 왠만하면 끝이아닌경우에 다 next() 붙여줘야 다음 곳으로 이동함!!

21.
