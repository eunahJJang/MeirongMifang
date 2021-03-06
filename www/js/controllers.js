angular.module('starter.controllers', ['firebase'])
	.directive('ngRepeatEndWatch', function () {
		return {
			restrict: 'A',
			scope: {},
			link: function (scope, element, attrs) {
				if (attrs.ngRepeat) {
					if (scope.$parent.$last) {
						if (attrs.ngRepeatEndWatch !== '') {
							if (typeof scope.$parent.$parent[attrs.ngRepeatEndWatch] === 'function') {
								// Executes defined function
								scope.$parent.$parent[attrs.ngRepeatEndWatch]();
							} else {
								// For watcher, if you prefer
								scope.$parent.$parent[attrs.ngRepeatEndWatch] = true;
							}
						} else {
							// If no value was provided than we will provide one on you controller scope, that you can watch
							// WARNING: Multiple instances of this directive could yeild unwanted results.
							scope.$parent.$parent.ngRepeatEnd = true;
						}
					}
				} else {
					throw 'ngRepeatEndWatch: `ngRepeat` Directive required to use this Directive';
				}
			}
		};
	})

	.controller('AppCtrl', function ($scope, $state, $ionicModal, $cookieStore, $ionicHistory) {
		$ionicModal.fromTemplateUrl('templates/login.html',
			function (modal) {
				$scope.loginModal = modal;
			},
			{
				scope: $scope,
				animation: 'slide-in-up',
				focusFirstInput: true,
				backdropClickToClose: false,
				hardwareBackButtonClose: false
			}
		);

		//Be sure to cleanup the modal by removing it from the DOM
		$scope.$on('$destroy', function () {
			$scope.loginModal.remove();
		});

		$scope.$on('$ionicView.beforeEnter', function (e, data) {
			if ($cookieStore.get('loginLevel') != null) {
				$scope.$root.isLogin = true;
			} else {
				$scope.$root.isLogin = false;
			}
		});


		$scope.goHome = function () {
			$ionicHistory.nextViewOptions({
				disableBack: true
			});
			$state.go('app.tabs.main');
		}
	})

	.controller('mainCtrl', function ($scope, $rootScope, AuthenticationService) {

		$scope.onAuth = function() {

			if (AuthenticationService.isLogged()) {
				$scope.logout();
			}
			else
				$scope.login();
		};

		$scope.login = function () {
			$rootScope.$broadcast('event:auth-loginRequired', { state: 'app.tabs.main' });
		};

		$scope.logout = function () {
			$rootScope.$broadcast('event:auth-logoutRequired');
		};

		$scope.isLogged = false;
		$scope.$on('$ionicView.afterEnter', function(data) {
			$scope.isLogged = AuthenticationService.isLogged();
		});
		$scope.$on('event:auth-loginConfirmed', function(){
			$scope.isLogged = AuthenticationService.isLogged();
		});
		$scope.$on('event:auth-logout-complete', function() {
			$scope.isLogged = AuthenticationService.isLogged();
		});
	})

	.controller('LoginCtrl', function ($scope, $http, $state, $cookieStore, AuthenticationService, $rootScope, $cordovaPush, $cordovaDialogs, $cordovaMedia, $cordovaDevice) {

		$scope.message = "";
		$scope.$root.state = "app.tabs.main"; //로그인 후 보게되는 화면은 메인이 디폴트

		$scope.user = {
			username: null,
			password: null
		};

		$scope.login = function () {
			$scope.$root.username = $scope.user.username;
			AuthenticationService.login($scope.user.username, $scope.user.password);
			$scope.registerDevice();
		};

		$scope.closeLogin = function () {
			$scope.loginModal.hide();
			$rootScope.$broadcast('loginClosed');
		};

		$scope.$on('event:auth-loginRequired', function (e, args) {
			$scope.$root.state = args.state;
			$scope.loginModal.show();
		});


		//로그인 성공 쿠키값 셋팅 부분
		$scope.$on('event:auth-loginConfirmed', function (data) {
			$rootScope.loginLevel = AuthenticationService.getSession().loginLevel;
			$rootScope.username   = AuthenticationService.getSession().username;

			$scope.password = null  ;
			$scope.loginModal.hide();

//			$state.go($scope.$root.state, {}, {reload: true, inherit: false});
		});

		$scope.$on('event:auth-login-failed', function (e, status) {
			var error = " 登录失败。";
			if (status == 401) {
				error = "请输入正确的电子邮箱和密码。";
			}
			$scope.message = error;
			alert(error);
		});

		$scope.$on('event:auth-logoutRequired', function (e, args) {
			AuthenticationService.logout();
			$scope.unregister();
		});

		$scope.$on('event:auth-logout-complete', function () {
			$state.go('app.tabs.main', {}, {reload: true, inherit: false});
		});

		$scope.join = function () {
			$scope.closeLogin();
			$state.go('app.tabs.join');
		};

		//PushNotification
		$scope.notifications = [];

		// Register
		$scope.registerDevice = function (username, device) {
			var config = null;

			if (ionic.Platform.isAndroid()) {
				config = {
					"senderID": "240921071727" // REPLACE THIS WITH YOURS FROM GCM CONSOLE - also in the project URL like: https://console.developers.google.com/project/434205989073
				};
			}
			else if (ionic.Platform.isIOS()) {
				config = {
					"badge": "true",
					"sound": "true",
					"alert": "true"
				}
			}

			$cordovaPush.register(config).then(function (result) {
				$scope.registerDisabled = true;
				// ** NOTE: Android regid result comes back in the pushNotificationReceived, only iOS returned here
				if (ionic.Platform.isIOS()) {
					$scope.regId = result;
					storeDeviceToken("ios");
				}
			}, function (err) {
				console.log("Register error " + err)
			});
		}

		// Notification Received
		$scope.$on('pushNotificationReceived', function (event, notification) {
			console.log(JSON.stringify([notification]));
			if (ionic.Platform.isAndroid()) {
				handleAndroid(notification);
			}
			else if (ionic.Platform.isIOS()) {
				handleIOS(notification);
				$scope.$apply(function () {
					$scope.notifications.push(JSON.stringify(notification.alert));
				})
			}
		});

		// Android Notification Received Handler
		function handleAndroid(notification) {
			// ** NOTE: ** You could add code for when app is in foreground or not, or coming from coldstart here too
			//             via the console fields as shown.
			console.log("In foreground " + notification.foreground + " Coldstart " + notification.coldstart);
			if (notification.event == "registered") {
				$scope.regId = notification.regid;
				storeDeviceToken("android");
			}
			else if (notification.event == "message") {
				$cordovaDialogs.alert(notification.message, "美容秘方");
				$scope.$apply(function () {
					$scope.notifications.push(JSON.stringify(notification.message));
				})
			}
			else if (notification.event == "error")
				$cordovaDialogs.alert(notification.msg, "Push notification error event");
			else $cordovaDialogs.alert(notification.event, "Push notification handler - Unprocessed Event");
		}

		// IOS Notification Received Handler
		function handleIOS(notification) {
			// The app was already open but we'll still show the alert and sound the tone received this way. If you didn't check
			// for foreground here it would make a sound twice, once when received in background and upon opening it from clicking
			// the notification when this code runs (weird).
			if (notification.foreground == "1") {
				// Play custom audio if a sound specified.
				if (notification.sound) {
					var mediaSrc = $cordovaMedia.newMedia(notification.sound);
					mediaSrc.promise.then($cordovaMedia.play(mediaSrc.media));
				}

				if (notification.body && notification.messageFrom) {
					$cordovaDialogs.alert(notification.body, notification.messageFrom);
				}
				else $cordovaDialogs.alert(notification.alert, "美容秘方");

				if (notification.badge) {
					$cordovaPush.setBadgeNumber(notification.badge).then(function (result) {
						console.log("Set badge success " + result)
					}, function (err) {
						console.log("Set badge error " + err)
					});
				}
			}
			// Otherwise it was received in the background and reopened from the push notification. Badge is automatically cleared
			// in this case. You probably wouldn't be displaying anything at this point, this is here to show that you can process
			// the data in this situation.
			else {
				if (notification.body && notification.messageFrom) {
					$cordovaDialogs.alert(notification.body, "(RECEIVED WHEN APP IN BACKGROUND) " + notification.messageFrom);
				}
				else $cordovaDialogs.alert(notification.alert, "(RECEIVED WHEN APP IN BACKGROUND) Push Notification Received");
			}
		}

		// Stores the device token in a db using node-pushserver (running locally in this case)
		//
		// type:  Platform type (ios, android etc)
		function storeDeviceToken(type) {
			// Create a random userid to store with it
			var user = { email: $scope.user.username, type: type, regId: $scope.regId };
			console.log("Post token for registered device with data " + JSON.stringify(user));
			$http.get('http://meirong-mifang.com/push/register.php', {params: {"user": $scope.user.username, "type": type, "regId": $scope.regId}})
				.success(function (data, status) {
					console.log("Token stored, device is successfully subscribed to receive push notifications.");
				})
				.error(function (data, status) {
					console.log("Error storing device token." + data + " " + status)
				}
			);
		}

		// Removes the device token from the db via node-pushserver API unsubscribe (running locally in this case).
		// If you registered the same device with different userids, *ALL* will be removed. (It's recommended to register each
		// time the app opens which this currently does. However in many cases you will always receive the same device token as
		// previously so multiple userids will be created with the same token unless you add code to check).
		function removeDeviceToken() {
			var tkn = {"token": $scope.regId};
			$http.post('http://192.168.1.16:8000/unsubscribe', JSON.stringify(tkn))
				.success(function (data, status) {
					console.log("Token removed, device is successfully unsubscribed and will not receive push notifications.");
				})
				.error(function (data, status) {
					console.log("Error removing device token." + data + " " + status)
				}
			);
		}

		// Unregister - Unregister your device token from APNS or GCM
		// Not recommended:  See http://developer.android.com/google/gcm/adv.html#unreg-why
		//                   and https://developer.apple.com/library/ios/documentation/UIKit/Reference/UIApplication_Class/index.html#//apple_ref/occ/instm/UIApplication/unregisterForRemoteNotifications
		//
		// ** Instead, just remove the device token from your db and stop sending notifications **
		$scope.unregister = function () {
			console.log("Unregister called");
			removeDeviceToken();
			$scope.registerDisabled = false;
			//need to define options here, not sure what that needs to be but this is not recommended anyway
		}
	})

	.controller('JoinCtrl', function ($scope, $state, $http, $ionicHistory) {

		$ionicHistory.clearHistory();

		$scope.joinData = {};
		$scope.duplicatedId = false;

		var validEmail = function (email) {
			var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
			return re.test(email);
		}

		// Perform the login action when the user submits the login form
		$scope.doJoin = function () {
			//이메일 빈칸으로 입력
			if (($scope.joinData.username == null) || ($scope.joinData.username.trim() == '')) {
				alert("请输入您的电子邮箱。");
				return;
			}

			//이메일 형식이 아닐경우
			else if (!validEmail($scope.joinData.username)) {
				alert("请检查您的电子邮箱表格。");
				return;
			}

			//Check버튼에서 OK를 받지 못한 경우
			else if (!$scope.duplicatedId) {
				alert("请检查您的电子邮箱。");
				return;
			}
			else {

			}

			var pw1 = jQuery('.pw1').val();
			var pw2 = jQuery('.pw2').val();

			console.log('pw1 : ' + pw1);
			console.log('pw2 : ' + pw2);

			if (pw1 != pw2) {
				alert("请确认密码。");
			}

			else {
				$http.get("http://meirong-mifang.com/users/join.php", {params: {"username": $scope.joinData.username, "password": $scope.joinData.password}})
					.success(function (data) {
						if (data) {
							if ($scope.duplicatedId) {
								alert("欢迎参加美容秘方!");
								$state.go('app.tabs.main');
								//$ionicHistory.goBack([-1]);
							}
							else {
								alert("请检查您的电子邮箱。");
							}
						}

						else {
							alert("系统错误");
						}
					})
					.error(function (data) {
						console.log(data);
						alert("系统错误");
					});
			}
		}

		$scope.check = function () {
			//이메일 빈칸으로 입력
			if (($scope.joinData.username == null) || ($scope.joinData.username.trim() == '')) {
				alert("请输入您的电子邮箱。");
				return;
			}

			//입력 값이 이메일 형식이 아닌경우
			else if (!validEmail($scope.joinData.username)) {
				alert("请检查您的电子邮箱表格。");
				return;
			}

			//Validation 통
			else if (validEmail($scope.joinData.username)) {
				$http.get("http://meirong-mifang.com/users/checkEmail.php", {params: {"username": $scope.joinData.username}})
					.success(function (data) {
						if (data == false) {
							$scope.duplicatedId = true;
							alert("OK");
						} else {
							alert("该邮箱已被注册。");
						}
					})
					.error(function (data) {
						alert("系统错误");
					});
			}

			else {

			}

		};

	})

	.controller('MypageCtrl', function ($scope, $state, $http, $stateParams, $cookieStore, $rootScope, $cordovaToast, $ionicHistory, AuthenticationService) {
		$scope.$on('$ionicView.enter', function () {
			$scope.$on('loginClosed', function () {
				$ionicHistory.goBack([-1]);
			});

			var loginLevel = AuthenticationService.getSession().loginLevel;
			if (loginLevel == null || loginLevel == undefined) {
				$rootScope.$broadcast('event:auth-loginRequired', { state: 'app.mypage' });
			}
		})
	})

	.controller('ProfileCtrl', function ($scope) {
	})

	.controller('LikeCtrl', function ($scope) {
	})

	.controller('ChatAdminCtrl', function ($scope, $http) {
		$scope.data = [];
		$scope.getMessages = function () {
			$http.get("http://meirong-mifang.com/messages/getAdminMessage.php", {})
				.success(function (data) {
					for (var index = 0; index < data.length; index++) {
						$scope.data.push({ name: data[index].user, content: data[index].message, created_time: new Date(data[index].created_time).getTime() });
					}
				})
				.error(function (data) {
					alert("系统错误");
				})
		};

		$scope.getMessages();
	})

	.controller('ChatCtrl', function ($scope, $state, $stateParams, $http, $timeout, $ionicScrollDelegate, $rootScope, $cookieStore, $cordovaToast, $cordovaCamera, $ionicScrollDelegate, AuthenticationService) {

		$scope.$on('loginClosed', function () {
			$state.go('app.tabs.main');
		});

		/*--------------------------------------------
		 stateParam
		 --------------------------------------------*/
		switch($stateParams.type) {
			case 'admin':
				$scope.username = $stateParams.user;
				$scope.from = 'admin';
				$scope.to   = $scope.username;
				break;
			case 'user':
				$scope.username = AuthenticationService.getSession().username;
				$scope.from = $scope.username;
				$scope.to   = 'admin';
				break;
		}

		$scope.data     = {};
		$scope.messages = [];

		$scope.setScrollPos = function () {
			$ionicScrollDelegate.scrollBottom();
		};

		jQuery('.imgSndBtn').click(function () {
			jQuery('.sndBtnWrap').slideToggle();
		});

		$scope.takePicture = function () {
			jQuery('.sndBtnWrap').hide();
			var options = {
				quality          : 75,
				destinationType  : Camera.DestinationType.DATA_URL,
				sourceType       : Camera.PictureSourceType.CAMERA,
				allowEdit        : true,
				encodingType     : Camera.EncodingType.JPEG,
				targetWidth      : 300,
				targetHeight     : 300,
				popoverOptions   : CameraPopoverOptions,
				saveToPhotoAlbum : false
			};
		
			$cordovaCamera.getPicture(options).then(function (imageData) {
				$scope.chat.message = "data:image/jpeg;base64," + imageData;
				$scope.sendMessage();
			}, function (err) {
				alert('系统错误');
			});
		};

		$scope.uploadPhoto = function () {
			jQuery('.sndBtnWrap').hide();
			var options = {
				quality          : 75,
				destinationType  : Camera.DestinationType.DATA_URL,
				sourceType       : Camera.PictureSourceType.PHOTOLIBRARY,
				allowEdit        : true,
				encodingType     : Camera.EncodingType.JPEG,
				targetWidth      : 300,
				targetHeight     : 300,
				popoverOptions   : CameraPopoverOptions,
				saveToPhotoAlbum : false
			};
			$cordovaCamera.getPicture(options).then(function (imageData) {
				$scope.chat.message = "data:image/jpeg;base64," + imageData;
				$scope.sendMessage();
			}, function (err) {
				alert('系统错误');
			});
		};

		$scope.hideTime = true;
		var isIOS = ionic.Platform.isWebView() && ionic.Platform.isIOS();

		$scope.getMessages = function () {
			$scope.messages.length = 0;
			$http.get("http://meirong-mifang.com/messages/getMessages.php", {params: { from : $scope.username }})
				.success(function (data) {
					console.log('[ChatCtrl] getMessages() -> success');
					for (var index = 0; index < data.length; index++) {
						$scope.messages.push({from: data[index].sender_id, to: data[index].receiver_id, text: data[index].message, time : new Date(data[index].created_time).getTime() });
					}
				})
				.error(function (data) {
					console.log('[ChatCtrl] getMessages() -> error');
				});
		};

		$scope.sendMessage = function () {
			//채팅창에 아무것도 입력하지 않을 시 전송하지 않음.
			if ($scope.chat.message.trim() == '' || $scope.chat.message.trim() == null) {
				jQuery('#chatInput').focus();
				document.getElementById("chatInput").focus();
				return -1;
			}

			$scope.messages.push({
				from : $scope.from,
				to   : $scope.to,
				text : $scope.chat.message,
				time : new Date().getTime()
			});

			$http.get("http://meirong-mifang.com/messages/sendMessages.php", { params: { from : $scope.from, to : $scope.to, message : $scope.chat.message }})
				.success(function (data) {

				})
				.error(function (data) {
					alert("系统错误");
				});

			$scope.chat.message = "";
			$ionicScrollDelegate.scrollBottom(true);

			jQuery('.chatInput').focus();
		};

		$scope.inputUp = function () {
			if (isIOS) $scope.data.keyboardHeight = 216;
			$timeout(function () {
				$ionicScrollDelegate.scrollBottom(true);
			}, 300);
		};

		$scope.inputDown = function () {
			if (isIOS) $scope.data.keyboardHeight = 0;
			$ionicScrollDelegate.resize();
		};

		$scope.closeKeyboard = function () {
			// cordova.plugins.Keyboard.close();
		};

		if (!AuthenticationService.isLogged()) {
			$rootScope.$broadcast('event:auth-loginRequired', { state: 'app.tabs.main' });
			$scope.$on('event:auth-loginConfirmed', function() {
				$scope.getMessages();
			});
		}
		else {
		}

		$scope.$on('$ionicView.afterEnter', function() {
	 		$scope.getMessages();
		});
	})

	.controller('ProductsCtrl', function ($scope, $http, $stateParams) {
		$scope.getProducts = function (category) {
			$http.get("http://meirong-mifang.com/products/getList.php", {params: {"category": category}})
				.success(function (data) {
					$scope.noOfProduct = data.length;

					$scope.products = [];
					for (index = 0; index < data.length; index++) {
						$scope.products.push({
							category: category,
							shopId: data[index].shopId,
							shopName: data[index].shopName,
							logo: data[index].logo,
							region: data[index].region,
							minPrice: data[index].minPrice,
							maxPrice: data[index].maxPrice });
					}

					$scope.data = {
						activeB: category
					}
				})
				.error(function (data) {

				})
			//카테고리: 선택시 이미지 주소 가져오도록 하였습니다.
			$scope.categoryImg = "./img/" + category + ".png";
			console.log($scope.categoryImg);
		}
		category = $stateParams.category;
		if (category == null) {
			category = 'all';
		}
		$scope.getProducts(category);


	})

	.controller('ProductCtrl', function ($scope, $state, $http, $stateParams) {
		$scope.priceWon = [];
		$scope.imgs = [];
		$scope.imgs.push("http://meirong-mifang.com/img/1.png");
		$scope.imgs.push("http://meirong-mifang.com/img/2.png");
		$scope.imgs.push("http://meirong-mifang.com/img/3.png");
		$http.get("http://meirong-mifang.com/products/getDetail.php", {params: {"category": $stateParams.category, "shopId": $stateParams.shopId}})
			.success(function (data) {
				$scope.datas = [];
				$scope.logo = $stateParams.logo;
				$scope.shopName = data[0].shopName;
				$scope.shopId = $stateParams.shopId;
				for (index = 0; index < data.length; index++) {
					var price = removeComma(data[index].price);
					$scope.datas.push({
						surgeryId: data[index].surgeryId,
						method: data[index].method,
						price: (parseInt(price) / 10000) + " 万韩币" //단위가 길어서 만원 단위로 잘라 보여줍니다.
					});
				}
			})
			.error(function (data) {
			})

		$scope.changePage = function () {
			$state.go("app.tabs.detailImage", {"shopId": $stateParams.shopId, "surgeryId": "all"});
		}

		$scope.getCurrency = function (callback) {
			$http.get("http://meirong-mifang.com/products/getCurrency.php", {})
				.success(function (data) {
					if (typeof callback == "function") {
						callback(data);
					}
				})
				.error(function (data) {
					callback(0);
				});
		}

		//현재 화폐단위가 원화이면 클릭 시 중국위안으로, 현재 화폐단위가 위안이면 클릭 시 원화로 바꾸어 보여주는 메소드
		$scope.showConvPrice = function (data) {
			var currency = 0;
			$scope.currency = data;
			currency = data;
			var isWon = false;

			//현재 화폐단위가 won으로 끝날 경우 (문자열 끝에서 3개 잘라서 확인)
			if ($scope.datas[0].price.substr(-3, 3) == "万韩币") {
				isWon = true;
			}
			//현재 화폐단위가 CNY 로 끝날 경우 (문자열 끝에서 3개 잘라서 확인)
			else if ($scope.datas[0].price.substr(-3, 3) == "元") {
				isWon = false;
			}

			//현재 값이 won으로 끝날 경우(초기 값)
			//원화를 담는 배열에 현재 초기 원화 값을 저장해 둔다 -> 위안에서 원화를 보여줄 때 가져오기 위함
			//굳이 배열에 원화를 담아 두는 이유 : 환율이 실수이므로 여러차례 곱셈연산하다보면 값이 변하게 될까봐
			if (isWon) {
				for (var i = 0; i < $scope.datas.length; i++) {
					$scope.priceWon[i] = $scope.datas[i].price;
					var tmp = parseInt($scope.datas[i].price.replace(/,/g, ""));
					tmp *= 10000; //화면상엔 만원 단위로 잘려있습니다.
					tmp /= currency;
					tmp = parseInt(tmp) + "";
					tmp = comma(tmp);
					$scope.datas[i].price = tmp + " 元";
				}
				jQuery('.btnConvPrice').text('韩币');

			}
			else {
				for (var i = 0; i < $scope.datas.length; i++) {
					$scope.datas[i].price = $scope.priceWon[i];
				}

				jQuery('.btnConvPrice').text('人民币');
			}
		}
	})

	.controller('DetailImageCtrl', function ($state, $scope, $http, $stateParams) {

		$scope.getShopName = function () {
			$http.get("http://meirong-mifang.com/products/getShopLogo.php", {params: {"shopId": $stateParams.shopId}})
				.success(function (data) {
					$scope.shopName = data[0].shopName;
				})
				.error(function (data) {
					console.log("getShopLogo error");
				})
		}


		$scope.getEachDetailImage = function (surgeryId) {
			$http.get("http://meirong-mifang.com/products/getDetailImage.php", {params: {"shopId": $stateParams.shopId, "surgeryId": surgeryId}})
				.success(function (data) {
					$scope.datas = [];
					$scope.logo = $stateParams.logo;
					for (index = 0; index < data.length; index++) {
						$scope.datas.push({shopId: data[index].shopId, surgeryId: data[index].surgeryId, method: data[index].method, price: data[index].price, before: data[index].picBeforeSrc, after: data[index].picAfterSrc, desc: data[index].surgeryId+"번 시술에 대한 설명"});
					}
				})
				.error(function (data) {

				});
		}

		$scope.getAllDetailImage = function (shopId) {
			$http.get("http://meirong-mifang.com/products/getAllDetailImage.php", {params: {"shopId": shopId}})
				.success(function (data) {
					$scope.datas = [];
					$scope.logo = $stateParams.logo;
					for (index = 0; index < data.length; index++) {
						$scope.datas.push({shopId: data[index].shopId, surgeryId: data[index].surgeryId, method: data[index].method, price: data[index].price, before: data[index].picBeforeSrc, after: data[index].picAfterSrc, desc: data[index].surgeryId+"번 시술에 대한 설명"});
					}
				})
				.error(function (data) {

				});
		}

		surgeryId = $stateParams.surgeryId;
		if (surgeryId == 'all') {
			$scope.getAllDetailImage($stateParams.shopId);
		} else {
			$scope.getEachDetailImage(surgeryId);
		}

		$scope.changePage = function () {
			$state.go('app.tabs.productInfo', {"shopId": $stateParams.shopId});
		}
		$scope.getShopName();

		$scope.toggleDesc = function($index){
			var selectedSurg = jQuery('.surgDesc').eq($index);
			if( selectedSurg.css('display') == 'block' ){
				jQuery('.surgDesc').slideUp(200);
				return;
			}
			jQuery('.surgDesc').hide();
			selectedSurg.slideDown(200);
		}

	})

	.controller('ProductInfoCtrl', function ($state, $scope, $http, $stateParams) {
		$http.get("http://meirong-mifang.com/products/getShopInfo.php", {params: {"shopId": $stateParams.shopId}})
			.success(function (data) {
				$scope.datas = [];
				$scope.logoImg = data[0].logo;
				$scope.shopName = data[0].name;
				$scope.address = data[0].address;
				$scope.map = data[0].map;

				$scope.doctors = [];

				for (index = 0; index < data.length; index++) {
					$scope.doctors.push({
						imgsrc: data[index].docImgs,
						id: data[index].docId
					})
				}
			})
			.error(function (data) {
			});

		//이미지를 가져와서 이미지가 없는 병원의 경우에는 이미지 준비중이라는 이미지를 출력
		$http.get("http://meirong-mifang.com/products/getShopImg.php", {params: {"shopId": $stateParams.shopId}})
			.success(function (data) {

				$scope.shopimgs = [];


				//DB에 이미지가 존재하는 경우
				if (data) {
					$scope.hasImg = true;
					for (index = 0; index < data.length; index++) {
						$scope.shopimgs.push({
							imgsrc: data[index].imgThumbSrc
						})
					}
				}

				//DB에 이미지가 없는 경우
				else {
					$scope.hasImg = false;
					$scope.shopimgs.push({
						imgsrc: "http://meirong-mifang.com/img/emptyimg.jpg"
					})
				}


			})
			.error(function (data) {
				console.log('ProductInfoCtrl imgGet error');
			});

		$scope.shopId = $stateParams.shopId;

		$scope.changePage = function () {
			$state.go('app.tabs.single', {"shopId": $stateParams.shopId, "productId": $stateParams.productId});
		}
	})

	.controller('docProfile', function ($scope, $http, $stateParams) {
		$http.get("http://meirong-mifang.com/products/getDoctor.php", {params: {"docId": $stateParams.docId}})
			.success(function (data) {
				$scope.docName = data[0].name;
				$scope.imgSrc = data[0].imgSrc;
			})
			.error(function (data) {
			});

		$scope.docId = $stateParams.docId;
	})

	.controller('shopImgCtrl', function ($scope, $http, $stateParams) {
		$scope.imgList = [];
		var index = 0;
		$http.get("http://meirong-mifang.com/products/getShopImg.php", {params: {"shopId": $stateParams.shopId}})
			.success(function (data) {
				for (index = 0; index < data.length; index++) {
					$scope.imgList.push({
						imgsrc: data[index].imgSrc,
						desc: data[index].imgDesc
					})
				}
			})
			.error(function (data) {

			});


		var shopId = $stateParams.shopId;
		$scope.shopId = shopId;
	})

	.controller('CommCtrl', function ($scope) {
		$scope.pageTitle = "交流";
	})

//리뷰 업로드 페이지를 관리하는 부분입니다.
	.controller('UploadReviewCtrl', function ($scope, $stateParams, $http, $cordovaCamera, $cordovaFile, $ionicHistory, $state, $cookieStore, AuthenticationService) {
		//카테고리를 선택하기 위한 categories 변수 입니다.
		$scope.categorys = ['眼部', '鼻部', '面部', '胸部', '身材', '微整形'];
		$scope.reviewImgs = [];
		//이미지 업로드 개수 제한
		var imgLim = 5;

		//uploadReview.html 안의 text area의 동적 크기 변경을 위해 선언하였습니다.
		$scope.autoExpand = function (e) {
			var element = typeof e === 'object' ? e.target : document.getElementById(e);
			var scrollHeight = element.scrollHeight - 0;
			element.style.height = scrollHeight + "px";
		};

		//카테고리를 선택하고 나면 해당 카테고리와 연관된 모든 병원 목록들을 가져오는 함수입니다.
		$scope.update = function (review) {
			//console.log(review.category);
			Category = review.category;
			if (Category == null) {
				console.log("category select error");
			} else {
				$scope.getShopId(Category);
			}
		}
		//인자로 받은 카테고리로 "products/getList.php"로부터 병원 ID와 병원 이름을 가져오는 함수입니다.
		$scope.getShopId = function (category) {
			$http.get("http://meirong-mifang.com/products/getList.php", {params: {"category": category}})
				.success(function (data) {
					$scope.noOfProduct = data.length;

					$scope.products = [];
					for (index = 0; index < data.length; index++) {
						$scope.products.push({
							//category:category,
							shopId: data[index].shopId,
							shopName: data[index].shopName
						});

						console.log(data[index].shopName);
					}
				})
				.error(function (data) {
					console.log("getShopId error");
				})
		}
		$scope.cancle = function () {
			//뒤로 돌아가기
			$ionicHistory.goBack([-1]);
		};
		//업로드 하는 부분입니다.
		$scope.upload = function (review) {
			if (review.category == null || review.hospital.shopName == null) {
				console.log("Empty category or Empty Shop name");
				return -1;
			}
			if (review.body.trim() == '' || review.body.trim() == null) {
				console.log('Empty body');
				return -1;
			}

			$scope.$root.username = AuthenticationService.getSession().username;

			for (var i = $scope.reviewImgs.length; i < imgLim; i++) {
				$scope.reviewImgs[i] = 'nonPicture';
			}

			$http({
				method: "post",
				url: "http://meirong-mifang.com/review/uploadReview.php",
				headers: {'Content-Type': 'application/x-www-form-urlencoded'},
				data: $.param({
					"hospital_id": review.hospital.shopId,
					"hospital_name": review.hospital.shopName,
					"category": review.category,
					"contents": review.body,
					"pictures": "getting ready",
					"picture1": $scope.reviewImgs[0],
					"picture2": $scope.reviewImgs[1],
					"picture3": $scope.reviewImgs[2],
					"picture4": $scope.reviewImgs[3],
					"picture5": $scope.reviewImgs[4],
					"user_name": $scope.$root.username
				})
			}).success(function (result) {
				console.log(result);

				//후기 올리고 다시 후기작성 페이지를 가면 이전에 작성했던 내용 리셋되있도록
				$scope.reviewImgs = [];
				jQuery('select').prop('selectedIndex', -1);
				review.body = "";
			})
				.error(function (data) {
					console.log('uploadReview db transfer error');
				});

			$state.go('app.tabs.review');
		};

		$scope.takePicture = function () {
			//이미지 업로드 개수 제한
			if ($scope.reviewImgs.length >= imgLim) {
				alert("You cannot upload images more than " + imgLim);
				return -1;
			}

			var options = {
				quality: 75,
				destinationType: Camera.DestinationType.DATA_URL,
				sourceType: Camera.PictureSourceType.CAMERA,
				allowEdit: true,
				encodingType: Camera.EncodingType.JPEG,
				targetWidth: 300,
				targetHeight: 300,
				popoverOptions: CameraPopoverOptions,
				saveToPhotoAlbum: false
			};

			$cordovaCamera.getPicture(options).then(function (imageData) {
				$scope.imgURI = "data:image/jpeg;base64," + imageData;
				$scope.reviewImgs.push($scope.imgURI);
			}, function (err) {
				alert(err);
			});
		}

		$scope.uploadPhoto = function () {
			//이미지 업로드 개수 제한
			if ($scope.reviewImgs.length >= imgLim) {
				alert("You cannot upload images more than " + imgLim);
				return -1;
			}

			var options = {
				quality: 75,
				destinationType: Camera.DestinationType.DATA_URL,
				sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
				allowEdit: true,
				encodingType: Camera.EncodingType.JPEG,
				targetWidth: 300,
				targetHeight: 300,
				popoverOptions: CameraPopoverOptions,
				saveToPhotoAlbum: false
			};
			$cordovaCamera.getPicture(options).then(function (imageData) {
				$scope.imgURI = "data:image/jpeg;base64," + imageData;
				$scope.reviewImgs.push($scope.imgURI);
			}, function (err) {
				alert(err);
			});
		}
	})
//리뷰 페이지에서 사람들이 올린 글을 표시해주도록 하는 부분입니다.
	.controller('ReviewCtrl', function ($scope, $stateParams, $http, $ionicScrollDelegate, $cordovaCamera, $cordovaFile) {
		$scope.categorys = ['眼部', '鼻部', '面部', '胸部', '身材', '微整形'];

		//pageNum : 현재 페이지 번호,  totalNum : 전체 데이터 갯수, pageSu : 총 페이지 수
		$scope.pageNum = 0;
		$scope.totalNum;
		$scope.pageSu = 0;
		//선택한 카테고리의 리뷰 정보들을 뿌려주는 함수입니다.
		$scope.update = function (review) {
			console.log(review.category);
			Category = review.category;
			$scope.pageNum = 1;
			if (Category == null) {
				console.log("category select error");
			} else {
				$scope.totalPage(Category);
				$scope.getReview(Category, $scope.pageNum, $scope.resize);
			}
		};
		//해당 카테고리에 대한 리뷰 게시글의 총 갯수를 가져오는 함수입니다. 10개 = 1페이지 를 기준으로 총 페이지 수를 계산합니다.
		$scope.totalPage = function (category) {
			$http.get("http://meirong-mifang.com/review/getLength.php", {params: {"category": category, "rid": 0}})
				.success(function (data) {
					$scope.totalNum = data;
					$scope.pageSu = Math.ceil($scope.totalNum / 10);
				})
				.error(function (data) {
					console.log("totalPage error");
				})
		};
		//"review/getReview.php"로부터 해당 카테고리의 리뷰 자료들을 가져와 $scope.contents 변수에 저장합니다.
		//callback 함수로 resize 함수를 추가하였는데 이는 다른 페이지로 넘어갈 경우 크기를 재 조정시켜 상단으로 옮겨주는 역할을 합니다.
		$scope.getReview = function (category, pageNum, callback) {
			$http.get("http://meirong-mifang.com/review/getReview.php", {params: {"category": category, "rid": 0, "page": pageNum}})
				.success(function (data) {
					$scope.noOfProduct = data.length;
					console.log(data.length);
					$scope.contents = [];
					for (index = 0; index < data.length; index++) {
						$scope.contents.push({
							//category:data[index].part,
							shopId: data[index].shopId,
							shopName: data[index].shopName,
							rid: data[index].reviewId,
							pictures: data[index].pictures,
							picture1: data[index].picture1,
							contents: data[index].contents,
							username: data[index].userId,
							createdTime: data[index].createdTime});
						console.log(data[index].shopName);
						console.log(data[index].contents);
					}
					if (typeof callback == "function") {
						callback();
					}
				})
				.error(function (data) {
					console.log("getShopId error");
				});
		};

		//각 각 다음 페이지와 이전 페이지로 돌아가도록 해주는 함수들 입니다.
		$scope.nextPage = function () {
			if ($scope.pageNum == $scope.pageSu) return;
			$scope.pageNum++;
			$scope.getReview(Category, $scope.pageNum, $scope.resize);
		};
		$scope.beforePage = function () {
			if ($scope.pageNum == 1) return;
			$scope.pageNum--;
			$scope.getReview(Category, $scope.pageNum, $scope.resize);
		};
		//페이지가 변할 때마다 크기를 재조정 해주는 함수입니다.
		$scope.resize = function () {
			$ionicScrollDelegate.resize();
		};
	})

	.controller('ReviewDetailCtrl', function ($scope, $stateParams, $http) {

		var rId = $stateParams.reviewId;
		$scope.rId = rId;

		$scope.getReview = function (category) {
			$http.get("http://meirong-mifang.com/review/getReview.php", {params: {"category": category, "rid": rId}})
				.success(function (data) {

					$scope.shopId = data[0].shopId;
					$scope.shopName = data[0].shopName;
					$scope.writer = data[0].userId;
					$scope.content = data[0].contents;
					$scope.part = data[0].part;
					$scope.created_time = data[0].createdTime;
					$scope.pictures = [];

					if (data[0].picture1 != 'nonPicture') {
						$scope.pictures.push(data[0].picture1);
					}
					if (data[0].picture2 != 'nonPicture') {
						$scope.pictures.push(data[0].picture2);
					}
					if (data[0].picture3 != 'nonPicture') {
						$scope.pictures.push(data[0].picture3);
					}
					if (data[0].picture4 != 'nonPicture') {
						$scope.pictures.push(data[0].picture4);
					}
					if (data[0].picture5 != 'nonPicture') {
						$scope.pictures.push(data[0].picture5);
					}


					for (var i = 0; i < $scope.pictures.length; i++) {
						console.log($scope.pictures[i]);
					}

					console.log($scope.pictures.length);

					$scope.getLogo($scope.shopId);
				})
				.error(function (data) {
					console.log("getShopId error");
				})
		}

		$scope.getLogo = function (shopId) {
			$http.get("http://meirong-mifang.com/products/getShopLogo.php", {params: {"shopId": shopId}})
				.success(function (data) {
					$scope.logo = data[0].logo;
				})
				.error(function (data) {
					console.log("getShopLogo error");
				})
		}

		$scope.getReview();
	})

	.controller('SearchCtrl', function ($scope) {
		$scope.pageTitle = "搜索";
	});


//modal 컨텐트 크기조
function setModalHeight(parentTag) {
	var modalHeight;
	var mHeader = jQuery(parentTag + ' ion-header-bar').outerHeight();
	var mContent = jQuery(parentTag + ' ion-content form').outerHeight();

	console.log('mHeader : ' + mHeader);
	console.log('mContent : ' + mContent);

	// 더한 이유는 스크롤이 생기지 않도록
	modalHeight = mHeader + mContent + 4;
	console.log('modalHeight : ' + modalHeight);

	jQuery(parentTag).height(modalHeight + 'px');
}

//콤마찍기
function comma(str) {
	str = String(str);
	return str.replace(/(\d)(?=(?:\d{3})+(?!\d))/g, '$1,');
}
//콤마지우기
function removeComma(str) {
	str = String(str);
	return str.split(",").join("");
}

//키보드 show/hide 리스너 등록
window.addEventListener('native.keyboardshow', keyboardShowHandler);
window.addEventListener('native.keyboardhide', keyboardHideHandler);

//키보드 show 이벤트
function keyboardShowHandler(e){
	$('.modal').css('bottom',(e.keyboardHeight+120)+'px');
}

//키보드 hide 이벤트
function keyboardHideHandler(e){
	$('.modal').css('bottom','50%');
}