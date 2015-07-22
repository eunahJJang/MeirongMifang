angular.module('starter', ['ionic', 'ngCookies', 'ngCordova', 'ngAnimate', 'ngTouch', 'starter.controllers', 'starter.services', 'tabs'])

	.run(function ($ionicPlatform, $ionicPlatform, $http) {

		$ionicPlatform.ready(function () {
			if (window.cordova && window.cordova.plugins.Keyboard) {
				cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
			}
			if (window.StatusBar) {
				StatusBar.styleDefault();
			}
		});
	})

	.directive('input', function ($timeout) {
		return {
			restrict: 'E',
			scope: {
				'returnClose': '=',
				'onReturn': '&',
				'onFocus': '&',
				'onBlur': '&'
			},
			link: function (scope, element, attr) {
				element.bind('focus', function (e) {
					if (scope.onFocus) {
						$timeout(function () {
							scope.onFocus();
						});
					}
				});
				element.bind('blur', function (e) {
					if (scope.onBlur) {
						$timeout(function () {
							scope.onBlur();
						});
					}
				});
				element.bind('keydown', function (e) {
					if (e.which == 13) {
						if (scope.returnClose) element[0].blur();
						if (scope.onReturn) {
							$timeout(function () {
								scope.onReturn();
							});
						}
					}
				});
			}
		}
	})

	.config(function ($stateProvider, $urlRouterProvider, $ionicConfigProvider) {
		$stateProvider
			.state('app', {
				url: '/app',
				abstract: true,
				views : {
					root : {
						templateUrl : 'templates/layout.html',
						controller  : 'AppCtrl'
					}
				}
			})
			/*------------------------------------------------
			 app.tabs
			 ------------------------------------------------*/
			.state('app.tabs', {
				url: '/tabs',
				abstract : true,
				views    : {
					content : {
						templateUrl : 'templates/tabs.html',
						controller  : 'TabsCtrl'
					}
				}
			})
			/*------------------------------------------------
			 app.tabs.main
			 ------------------------------------------------*/
			.state('app.tabs.main', {
				url: '/main',
				views: {
					'app-tabs-main' : {
						templateUrl : 'templates/main.html',
						controller  : 'mainCtrl'
					}
				}
			})

			.state('app.tabs.single', {
				url: '/product/:category?shopId&logo',
				views: {
					'app-tabs-main' : {
						templateUrl : 'templates/product.html',
						controller  : 'ProductCtrl'
					}
				}
			})
			.state('app.tabs.detailImage', {
				url: '/productDetail/:shopId?surgeryId&logo',
				views: {
					'app-tabs-main' : {
						templateUrl : 'templates/detailImage.html',
						controller  : 'DetailImageCtrl'
					}
				}
			})
			.state('app.tabs.productInfo', {
				url: '/productInfo/:shopId',
				views: {
					'app-tabs-main' : {
						templateUrl : 'templates/productInfo.html',
						controller  : 'ProductInfoCtrl'
					}
				}
			})

			.state('app.tabs.docProfile', {
				url: '/docProfile/:docId',
				views: {
					'app-tabs-main' : {
						templateUrl : 'templates/docprofile.html',
						controller  : 'docProfile'
					}
				}
			})

			.state('app.tabs.shopImg', {
				url: '/shopImg/:shopId',
				views: {
					'app-tabs-main' : {
						templateUrl : 'templates/shopimg.html',
						controller  : 'shopImgCtrl'
					}
				}
			})

			.state('app.tabs.products', {
				url: '/products/:category',
				views: {
					'app-tabs-main' : {
						templateUrl     : 'templates/products.html',
						controller      : 'ProductsCtrl'
					}
				}
			})
			/*------------------------------------------------
			 app.tabs.communication
			 ------------------------------------------------*/
			.state('app.tabs.communication', {
				url: '/communication',
				views: {
					'app-tabs-communication' : {
						templateUrl : 'templates/notready.html',
						controller  : 'CommCtrl'
					}
				}
			})

			/*------------------------------------------------
			 app.tabs.review
			 ------------------------------------------------*/
			.state('app.tabs.review', {
				url: '/review',
				views: {
					'app-tabs-review' : {
						templateUrl   : 'templates/review.html',
						controller    : 'ReviewCtrl'
					}
				}
			})
			.state('app.tabs.uploadReview', {
				url: '/uploadReview',
				views: {
					'app-tabs-review' : {
						templateUrl   : 'templates/uploadReview.html',
						controller    : 'UploadReviewCtrl'
					}
				}
			})

			.state('app.reviewDetail', {
				url: '/reviewDetail/:reviewId',
				views: {
					content: {
						templateUrl : 'templates/reviewDetail.html',
						controller  : 'ReviewDetailCtrl'
					}
				}
			})

			.state('app.reviewWrite', {
				url: '/reviewWrite',
				views: {
					content: {
						templateUrl : 'templates/write.html',
						controller  : 'WriteCtrl'
					}
				}
			})

			/*------------------------------------------------
			 app.join
			 ------------------------------------------------*/
			.state('app.tabs.join', {
				url: '/join',
				views: {
					'app-tabs-join' : {
						templateUrl : 'templates/join.html',
						controller  : 'JoinCtrl'
					}
				}
			})
			/*------------------------------------------------
			 app.search
			 ------------------------------------------------*/
			.state('app.tabs.search', {
				url: '/search',
				views: {
					'app-tabs-main': {
						templateUrl : 'templates/notready.html',
						controller  : 'SearchCtrl'
					}
				}
			})
			/*------------------------------------------------
			 app.mypage
			 ------------------------------------------------*/
			.state('app.tabs.mypage', {
				url: '/mypage',
				views: {
					'app-tabs-mypage': {
						templateUrl : 'templates/mypage.html',
						controller  : 'MypageCtrl'
					}
				}
			})
			/*------------------------------------------------
			 app.profile
			 ------------------------------------------------*/
			.state('app.profile', {
				url: '/profile',
				views: {
					content: {
						templateUrl : 'templates/profile.html',
						controller  : 'ProfileCtrl'
					}
				}
			})
			/*------------------------------------------------
			 app.event
			 ------------------------------------------------*/
			.state('app.event', {
				url: '/event',
				views: {
					content: {
						templateUrl : 'templates/event.html'
					}
				}
			})
			/*------------------------------------------------
			 app.like
			 ------------------------------------------------*/
			.state('app.like', {
				url: '/like',
				views: {
					content: {
						templateUrl : 'templates/like.html',
						controller  : 'LikeCtrl'
					}
				}
			})
			/*------------------------------------------------
			 app.tabs.chat
			 ------------------------------------------------*/
			.state('app.tabs.chat', {
				url : '/chat/:type/:user',
				views: {
					'app-tabs-chat' : {
						templateUrl : 'templates/chat.html',
						controller  : 'ChatCtrl'
					}
				}
			})
			.state('app.tabs.chatAdmin', {
				url: '/chatAdmin',
				views: {
					'app-tabs-chat' : {
						templateUrl : 'templates/chatAdmin.html',
						controller  : 'ChatAdminCtrl'
					}
				}
			});

		// if none of the above states are matched, use this as the fallback
		$urlRouterProvider.otherwise('/app/tabs/main');

		$ionicConfigProvider.tabs.position('bottom');
		$ionicConfigProvider.backButton.previousTitleText(false).text('');
	});
