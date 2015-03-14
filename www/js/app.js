// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.controllers' is found in controllers.js
angular.module('starter', ['ionic', 'ngCookies', 'ngCordova', 'starter.controllers', 'starter.services'])

.run(function($ionicPlatform, $ionicPlatform, $http) { 
  
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
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
        templateUrl: "templates/main.html"
      },
      'sideMenu': {
        templateUrl:"templates/category.html"
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
      },
      'sideMenu': {
        templateUrl:"templates/category.html"
      }
    }
  })

  // [왼쪽사이드] 상세 카테고리 
  .state('app.subcategory', {
      url: "/subcategory/:currentCategory",
      views: {
        'sideMenu': {
          templateUrl:"templates/subcategory.html",
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
        templateUrl: "templates/search.html"
      }
    }
  })

  .state('app.mypage', {
    url: "/mypage",
    views: {
      'content': {
        templateUrl: "templates/mypage.html",
        controller: 'MypageCtrl'
      },
      'sideMenu': {
        templateUrl:"templates/category.html"
      }
    }
  })

  .state('app.chat', {
    url: "/chat",
    views: {
      'content': {
        templateUrl: "templates/chat.html",
        controller: 'ChatCtrl'
      }
    }
  })
  
  .state('app.single', {
    url: "/product/:productId",
    views: {
      'content': {
        templateUrl: "templates/product.html",
        controller: 'ProductCtrl'
      },
      'sideMenu': {
        templateUrl:"templates/category.html"
      }
    }
  })

  .state('app.detailImage',{
    url: "/productDetail/:productId/:detailId",
    views: {
      'content':{
        templateUrl: "templates/detailImage.html",
        controller: 'DetailImageCtrl'
      }
    }
  });
  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/app/main');
});
