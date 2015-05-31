angular.module('starter', ['ionic', 'ngCookies', 'ngCordova', 'ngAnimate', 'ngTouch', 'starter.controllers', 'starter.services', 'firebase'])

.run(function($ionicPlatform, $ionicPlatform, $http) { 
  
  $ionicPlatform.ready(function() {
    if (window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if (window.StatusBar) {
      StatusBar.styleDefault();
    }
  });
})

.directive('input', function($timeout) {
  return {
    restrict: 'E',
    scope: {
      'returnClose': '=',
      'onReturn': '&',
      'onFocus': '&',
      'onBlur': '&'
    },
    link: function(scope, element, attr) {
      element.bind('focus', function(e) {
        if (scope.onFocus) {
          $timeout(function() {
            scope.onFocus();
          });
        }
      });
      element.bind('blur', function(e) {
        if (scope.onBlur) {
          $timeout(function() {
            scope.onBlur();
          });
        }
      });
      element.bind('keydown', function(e) {
        if (e.which == 13) {
          if (scope.returnClose) element[0].blur();
          if (scope.onReturn) {
            $timeout(function() {
              scope.onReturn();
            });
          }
        }
      });
    }
  }
})

.config(function($stateProvider, $urlRouterProvider) {
  $stateProvider

  // 모든 화면의 기본
  .state('app', {
    url: "/app",
    abstract: true,
    templateUrl: "templates/layout.html",
    controller: 'AppCtrl'
  })

  //메인 페이지
  .state('app.main', {
    url: "/main",
    views: {
      'content': {
        templateUrl: "templates/main.html",
        controller: 'mainCtrl'
      }
    }
  })

  //상품 전체보기
  .state('app.products', {
    url: "/products/:category",
    views: {
      'content': {
        templateUrl: "templates/products.html",
        controller: 'ProductsCtrl',
      }
    }
  })

  // 가입 페이지
  .state('app.join', {
    url: "/join",
    views:{
      'content': {
        templateUrl:"templates/join.html",
        controller: 'JoinCtrl'
      }
    }
  })

  .state('app.search', {
    url: "/search",
    views: {
      'content': {
        templateUrl: "templates/notready.html",
        controller: 'SearchCtrl'
      }
    }
  })

  .state('app.mypage', {
    url: "/mypage",
    views: {
      'content': {
        templateUrl: "templates/mypage.html",
        controller: 'MypageCtrl'
      }
    }
  })

  .state('app.profile', {
    url: "/profile",
    views: {
      'content': {
        templateUrl: "templates/profile.html",
        controller: 'ProfileCtrl'
      }
    }
  })

  .state('app.event', {
    url: "/event",
    views: {
      'content': {
        templateUrl: "templates/event.html"
      }
    }
  })

  .state('app.like', {
    url: "/like",
    views: {
      'content': {
        templateUrl: "templates/like.html",
        controller: 'LikeCtrl'
      }
    }
  })

  .state('app.chatTab', {
    url: "/chatTab",
    views: {
      'content': {
        controller: 'ChatTabCtrl'
      }
    }
  })

  .state('app.chatUser', {
    url: "/chatUser",
    views: {
      'content': {
        templateUrl: "templates/chat.html",
        controller: 'ChatCtrl'
      }
    }
  })

  .state('app.chatAdminUser', {
    url: "/chatAdminUser/:user",
    views: {
      'content': {
        templateUrl: "templates/chat.html",
        controller: 'ChatAdminUserCtrl'
      }
    }
  })

  .state('app.chatAdmin', {
    url: "/chatAdmin",
    views: {
      'content': {
        templateUrl: "templates/chatAdmin.html",
        controller: 'ChatAdminCtrl'
      }
    }
  })
  
  .state('app.single', {
    url: "/product/:category?shopId&logo",
    views: {
      'content': {
        templateUrl: "templates/product.html",
        controller: 'ProductCtrl'
      }
    }
  })

  .state('app.detailImage',{
    url: "/productDetail/:shopId?surgeryId&logo",
    views: {
      'content':{
        templateUrl: "templates/detailImage.html",
        controller: 'DetailImageCtrl'
      }
    }
  })

  .state('app.productInfo', {
    url:"/productInfo/:shopId",
    views: {
      'content':{
        templateUrl: "templates/productInfo.html",
        controller: 'ProductInfoCtrl'
      }
    }
  })

  .state('app.docProfile', {
    url:"/docProfile/:docId",
    views: {
      'content':{
        templateUrl: "templates/docprofile.html",
        controller: 'docProfile'
      }
    }
  })

  .state('app.shopImg', {
    url:"/shopImg/:shopId",
    views: {
      'content':{
        templateUrl: "templates/shopimg.html",
        controller: 'shopImgCtrl'
      }
    }
  })

  .state('app.communication', {
    url:"/communication",
    views: {
      'content':{
        templateUrl: "templates/notready.html",
        controller: 'CommCtrl'
      }
    }
  })  

  .state('app.review', {
    url:"/review",
    views: {
      'content':{
        templateUrl: "templates/review.html",
        controller: 'ReviewCtrl'
      }
    }
  })

  .state('app.uploadReview',{
  url:"/uploadReview",
  views: {
    'content':{
    templateUrl:"templates/uploadReview.html",
    controller: 'UploadReviewCtrl'
    }
  }
  })

  .state('app.reviewWrite', {
    url:"/reviewWrite",
    views: {
      'content':{
        templateUrl: "templates/write.html",
        controller: 'WriteCtrl'
      }
    }
  });
  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/app/main');
});
