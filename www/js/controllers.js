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

.controller('AppCtrl', function($scope, $state, $ionicModal, $cookieStore, $ionicHistory) {
  $ionicModal.fromTemplateUrl('templates/login.html', function(modal) {
      $scope.loginModal = modal;
    },
    {
      scope: $scope,
      animation: 'slide-in-up',
      focusFirstInput: true
    }
  );

  //Be sure to cleanup the modal by removing it from the DOM
  $scope.$on('$destroy', function() {
    $scope.loginModal.remove();
  });

  $scope.$on('$ionicView.beforeEnter', function (e, data) {
    if ($cookieStore.get('loginLevel') != null) {
      $scope.$root.isLogin = true;
    } else {
      $scope.$root.isLogin = false;
    }
  });


  $scope.goHome = function(){
    $ionicHistory.nextViewOptions({
      disableBack: true
    });
    $state.go('app.main');
  }     
})

.controller('mainCtrl', function($scope, $rootScope, $cookieStore){
  $scope.login = function(){
    $rootScope.$broadcast('event:auth-loginRequired', { state: 'app.main' });
  }

  $scope.logout = function(){
    $rootScope.$broadcast('event:auth-logoutRequired');
  }
})
  
.controller('LoginCtrl', function($scope, $http, $state, $cookieStore, AuthenticationService, $rootScope, $cordovaPush, $cordovaDialogs, $cordovaMedia, $cordovaDevice) {

  $scope.message = "";

  $scope.user = {
    username: null,
    password: null
  };
 
  $scope.login = function() {
    $scope.$root.state = "app.main"
    $scope.$root.username = $scope.user.username;
    AuthenticationService.login($scope.user.username, $scope.user.password);
    $scope.registerDevice();
  };

  $scope.closeLogin = function() {
    $scope.loginModal.hide();
  };
 
  $scope.$on('event:auth-loginRequired', function(e, args) {
    $scope.$root.state = args.state;
    $scope.loginModal.show();
  });
  

  //로그인 성공 쿠키값 셋팅 부분
  $scope.$on('event:auth-loginConfirmed', function(data) {
    $cookieStore.put('username',$scope.user.username);
    $cookieStore.put('loginLevel',1);
    $scope.password = null;
    $scope.loginModal.hide();
    $state.go($scope.$root.state, {}, {reload: true, inherit: false});
  });

  $scope.$on('event:auth-login-failed', function(e, status) {
    var error = "Login failed.";
    if (status == 401) {
      error = "Invalid Username or Password.";
    }
    $scope.message = error;
    alert(error);
  });

  $scope.$on('event:auth-logoutRequired', function(e, args){
    AuthenticationService.logout($scope.user.username);
    $scope.unregister();
  });
 
  $scope.$on('event:auth-logout-complete', function() {
    $cookieStore.remove('username');
    $cookieStore.remove('loginLevel');
    $state.go('app.main', {}, {reload: true, inherit: false});
  }); 

  $scope.join = function(){
    $scope.closeLogin();
    $state.go('app.join');
  }

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
            $scope.registerDisabled=true;
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
        console.log("In foreground " + notification.foreground  + " Coldstart " + notification.coldstart);
        if (notification.event == "registered") {
            $scope.regId = notification.regid;
            storeDeviceToken("android");
        }
        else if (notification.event == "message") {
            $cordovaDialogs.alert(notification.message, "Push Notification Received");
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
            else $cordovaDialogs.alert(notification.alert, "Push Notification Received");

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
        $http.get('http://meirong-mifang.com/push/register.php', {params : {"user": $scope.user.username, "type": type, "regId": $scope.regId}})
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
        $scope.registerDisabled=false;
        //need to define options here, not sure what that needs to be but this is not recommended anyway
    }    
})

.controller('JoinCtrl', function($scope, $ionicModal, $state, $http, $ionicHistory){

  $ionicHistory.clearHistory();

  $scope.joinData = {};
  $scope.duplicatedId = false;

  $ionicModal.fromTemplateUrl('templates/join.html', {
    scope: $scope
  }).then(function(modal) {
    $scope.modal = modal;
  });

  var validEmail = function(email) {
    var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
    return re.test(email);
  }

  // Triggered in the login modal to close it
  $scope.closeJoin = function() {
 //   $scope.modal.hide();
    $state.go('app.products');
  };

  // Open the login modal
  $scope.join = function() {
    $scope.modal.show();
  };

  // Perform the login action when the user submits the login form
  $scope.doJoin = function() {
    
    //이메일 빈칸으로 입력
    if(($scope.joinData.username == null) || ($scope.joinData.username.trim() == '') ){
      alert("Please input your email");
      return ;
    }

    //이메일 형식이 아닐경우
    else if(!validEmail($scope.joinData.username)){
      alert("Please check your email form");
      return ;
    }

    //Check버튼에서 OK를 받지 못한 경우
    else if(!$scope.duplicatedId){
      alert("Please check your email by touching CHECK button");
      return ;
    }
    else{

    }

    var pw1 = jQuery('.pw1').val();
    var pw2 = jQuery('.pw2').val();

    console.log('pw1 : '+ pw1);
    console.log('pw2 : '+ pw2);

    if(pw1 != pw2){
      alert('Password needs checked');
    }

    else{
      console.log("id : "+$scope.joinData.username);
      console.log("pw : "+$scope.joinData.password);
      $http.get("http://meirong-mifang.com/users/join.php", {params : {"username" : $scope.joinData.username, "password" : $scope.joinData.password}})
        .success(function(data){
          if(data){
            if($scope.duplicatedId){
              alert("Welcome !!");
              $ionicHistory.goBack([-1]);              
            }
            else{
              alert("please check your email again.");
            }
          }

          else{
            alert("$http.get id insert error");
          }
        })
        .error(function(data){
          console.log(data);
          alert("$http.get query transfer error");
        });
      }
    }

      $scope.check = function(){
        //이메일 빈칸으로 입력
        if(($scope.joinData.username == null) || ($scope.joinData.username.trim() == '') ){
          alert("Please input your email");
          return ;
        }

        //입력 값이 이메일 형식이 아닌경우
        else if(!validEmail($scope.joinData.username)){
         alert("Please check your email form");
         return ;
        }

        //Validation 통
        else if(validEmail($scope.joinData.username)){
          $http.get("http://meirong-mifang.com/users/checkEmail.php", {params : {"username" : $scope.joinData.username}})
            .success(function(data){
              if(data == false){
                $scope.duplicatedId = true;
                alert("OK");
              }else{
                alert("duplicated");
              }
            })
            .error(function(data){
              alert("check database connection error.");
            });
        }

        else{

        }

      };
    
})

.controller('MypageCtrl', function($scope, $state, $http, $stateParams, $cookieStore, $rootScope, $cordovaToast) {
  if($cookieStore.get('loginLevel') == null){
    $rootScope.$broadcast('event:auth-loginRequired', { state: 'app.mypage' });
  }
})

.controller('ProfileCtrl', function($scope){

})

.controller('LikeCtrl', function($scope){
       $scope.products = [];
     $scope.products.push({ content: "눈의짱", shop_name: "압구정성형외과", id: 0, image: "http://www.stclinic.net/img/main_visual04.png", price: "200000~3000000" });    


  //     $http.get("http://cpromise.cafe24.com/twinkle/mypage.php", {params : {"username" : $stateParams.username}})
//       .success(function (data, status, headers, config) {
//     $scope.products = [];
//       $scope.products.push({ content: "눈의짱", shop_name: "압구정성형외과", id: 0, image: "http://www.stclinic.net/img/main_visual04.png", price: "200000~3000000" });
//       })
//       .error(function (data, status, headers, config) {
//           console.log("Error occurred.  Status:" + status);
//       });
  
})

.controller('ChatTabCtrl', function($scope, $cookieStore, $state){
 $loginLevel = $cookieStore.get("loginLevel");
 console.log('$loginLevel : '+$loginLevel);
 if($loginLevel > 1){
  $state.go("app.chatAdmin");
 }else{
  $state.go("app.chatUser");
 }
})

.controller('ChatAdminCtrl', function($scope, $http){
  $scope.datas = [];
  $scope.getMessages = function(){
    $http.get("http://meirong-mifang.com/messages/getAdminMessage.php", {})
      .success(function(data){
        for(index = 0; index < data.length; index++){
           $scope.datas.push( { name:data[index].user, content:data[index].message });
        }
      })
      .error(function(data){
        alert("erro");
      })
  }
  $scope.getMessages();
})

.controller('ChatAdminUserCtrl', function($scope, $http, $stateParams){
  $scope.datas = [];
  $scope.getMessages = function(user){
    $http.get("http://meirong-mifang.com/messages/getAdminUserMessage.php", {params : {"user" : user}})
      .success(function(data){
        for(index = 0; index < data.length; index++){
           $scope.messages.push( {from:data[index].sender_id, to:data[index].receiver_id, text:data[index].message, time:data[index].created_time});
        }
      })
      .error(function(data){
        alert("getPicerrer");
      })
  }
  $username = $stateParams.user;
  $scope.getMessages($username);
})

.controller('ChatCtrl', function($scope, $firebase, $http, $timeout, $ionicScrollDelegate, $rootScope, $cookieStore, $cordovaToast, $cordovaCamera, $ionicScrollDelegate){

//  $httpProvider.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded;charset=utf-8';
  
  $scope.userName = $cookieStore.get("username");
  console.log('userName : '+$scope.userName);
  $scope.data = {};
  $scope.messages = [];

  var getCurTime = function(){
    //현재시간
    var d = new Date();
    curtime = d.getFullYear()+"/"+(parseInt(d.getMonth())+1)+"/"+d.getDate()+" "+d.getHours()+":"+d.getMinutes()+":"+d.getSeconds();

    return curtime;
  }

  $scope.setScrollPos = function(){
    $ionicScrollDelegate.scrollBottom();
  };

  jQuery('.imgSndBtn').click( function(){
    jQuery('.sndBtnWrap').slideToggle();
  });

   $scope.takePicture = function() {
      jQuery('.sndBtnWrap').hide();
        var options = { 
            quality : 75, 
            destinationType : Camera.DestinationType.DATA_URL, 
            sourceType : Camera.PictureSourceType.CAMERA, 
            allowEdit : true,
            encodingType: Camera.EncodingType.JPEG,
            targetWidth: 300,
            targetHeight: 300,
            popoverOptions: CameraPopoverOptions,
            saveToPhotoAlbum: false
        };
 
        $cordovaCamera.getPicture(options).then(function(imageData) {
            $scope.chat.message = "data:image/jpeg;base64," + imageData;
            $scope.sendMessage();
        }, function(err) {
          alert('takepicerrer');
            // An error occured. Show a message to the user
        });
    }

    $scope.uploadPhoto = function() {
      jQuery('.sndBtnWrap').hide();
      var options = { 
            quality : 75, 
            destinationType : Camera.DestinationType.DATA_URL, 
            sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
            allowEdit : true,
            encodingType: Camera.EncodingType.JPEG,
            targetWidth: 300,
            targetHeight: 300,
            popoverOptions: CameraPopoverOptions,
            saveToPhotoAlbum: false
        };
      $cordovaCamera.getPicture(options).then(function(imageData) {
            $scope.chat.message = "data:image/jpeg;base64," + imageData;
            $scope.sendMessage();
        }, function(err) {
            // An error occured. Show a message to the user
        });
    }

  $scope.hideTime = true;
  var isIOS = ionic.Platform.isWebView() && ionic.Platform.isIOS();

  var getChatDate = function(dateString){

    if(dateString != null){
    var t = dateString.split(/[- :]/);

    var d = new Date(t[0], t[1]-1, t[2], t[3], t[4], t[5]);
    d = new Date(d);
    }
    else{
      var d = new Date();
    }
    var chatDate = "";

    chatDate += (""+d.getFullYear()).substring(2,4);
    chatDate += '/';

    chatDate += d.getMonth()+1;
    chatDate += '/';

    chatDate += d.getDate();
    chatDate += '\n';

    return chatDate;
  }

  var addZero = function(i) {
    if (i < 10) {
        i = "0" + i;
    }
    return i;
  }

  var getChatTime = function(dateString){
    if(dateString != null){
    var t = dateString.split(/[- :]/);

    var d = new Date(t[0], t[1]-1, t[2], t[3], t[4], t[5]);
    d = new Date(d);
    }
    else{
      var d = new Date();
    }

    var chatDate = "";

    if(d.getHours() > 12){
      chatDate += d.getHours() - 12;
      chatDate += ':';
      chatDate += addZero(d.getMinutes());
      chatDate += " PM";
    }
    else{
      chatDate += d.getHours();
      chatDate += ':';
      chatDate += addZero(d.getMinutes());
      chatDate += " AM";
    }

    return chatDate;
  }

  $scope.getMessages = function(){
    $http.get("http://meirong-mifang.com/products/getMessages.php", {params : {"from" : $scope.userName}})
      .success(function(data){
        console.log('getMessages() success');
        for(index = 0; index < data.length; index++){
           $scope.messages.push( {from:data[index].sender_id, to:data[index].receiver_id, text:data[index].message, date:getChatDate(data[index].created_time), time:getChatTime(data[index].created_time)});
        }
      })
      .error(function(data){
        console.log(data);
        console.log('getMessages error');
      })
  }

  $scope.sendMessage = function() {
    //채팅창에 아무것도 입력하지 않을 시 전송하지 않음.
    if($scope.chat.message.trim() == '' || $scope.chat.message.trim() == null){
      console.log('Empty Message');
      jQuery('#chatInput').focus();
      document.getElementById("chatInput").focus();
      return -1;
    }

    var d = new Date();
//    d = d.toLocaleTimeString().replace(/:\d+ /, ' '); //d예시 : 오후 10:26:10

    $scope.$root.username = 'user526';

    $scope.messages.push({
      from: $scope.userName,
      to: 'admin',
      text: $scope.chat.message,
      date: getChatDate(),
      time: getChatTime()
    });
/*
    $http.get("http://meirong-mifang.com/products/sendMessages.php", 
      {params : {"from" : $scope.$root.username, "to" : 'admin', "message" : $scope.chat.message}})
*/

    $http({
      method: "post",
      url: "http://meirong-mifang.com/products/sendMessages.php",
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      data: $.param({from: $scope.userName, to: 'admin', message: $scope.chat.message})
        }).success(function(result){
          console.log(result);
        }).error(function(data){
          console.log("data : "+data);
          console.log('sendMessage db transfer error');
      });  

    $scope.chat.message = "";
    $ionicScrollDelegate.scrollBottom(true);

    jQuery('.chatInput').focus();
  };

  $scope.inputUp = function() {
    if (isIOS) $scope.data.keyboardHeight = 216;
    $timeout(function() {
      $ionicScrollDelegate.scrollBottom(true);
    }, 300);

  };

  $scope.inputDown = function() {
    if (isIOS) $scope.data.keyboardHeight = 0;
    $ionicScrollDelegate.resize();
  };

  $scope.closeKeyboard = function() {
    // cordova.plugins.Keyboard.close();
  };

  if($cookieStore.get('loginLevel') == null){
    $rootScope.$broadcast('event:auth-loginRequired', { state: 'app.chat' });
  }else{
    $scope.getMessages();
  }
})

.controller('ProductsCtrl', function($scope, $http, $stateParams) {
  $scope.getProducts = function(category){
    $http.get("http://meirong-mifang.com/products/getList.php", {params : {"category" : category}})
      .success(function(data){
        $scope.noOfProduct = data.length;

        $scope.products = [];
        for(index = 0; index < data.length; index++){
           $scope.products.push({ 
            category:category,
            shopId:data[index].shopId,
            shopName: data[index].shopName, 
            logo: data[index].logo, 
            region: data[index].region, 
            minPrice: data[index].minPrice, 
            maxPrice: data[index].maxPrice });
        }

        $scope.data = {
          activeB : category
        } 
      })
    //카테고리: 선택시 이미지 주소 가져오도록 하였습니다.
    $scope.categoryImg="../img/"+category+".png";
    console.log($scope.categoryImg);
      })
      .error(function(data){

      })
  }
  category = $stateParams.category;
  if(category == null){
    category = 'all';
  }
  $scope.getProducts(category);


})

.controller('ProductCtrl', function($scope, $state, $http, $stateParams) {
    $scope.priceWon = [];
    $http.get("http://meirong-mifang.com/products/getDetail.php", {params : {"category": $stateParams.category, "shopId": $stateParams.shopId}})
      .success(function(data){
          $scope.datas = [];
          $scope.logo = $stateParams.logo;
          $scope.shopId = $stateParams.shopId;
          for(index = 0; index < data.length; index++){
             $scope.datas.push({
              surgeryId:data[index].surgeryId, 
              method:data[index].method, 
              price:data[index].price+" won"});
          }
      })
      .error(function(data){
      })

      $scope.changePage = function(){
        $state.go("app.detailImage", {"shopId": $stateParams.shopId, "surgeryId" : "all"});
      }

      $scope.getCurrency = function(callback){
        $http.get("http://meirong-mifang.com/products/getCurrency.php", {})
          .success(function(data){
          if(typeof callback == "function"){
            callback(data);
          }
        })
          .error(function(data){
            callback(0);
          });
      }

      //현재 화폐단위가 원화이면 클릭 시 중국위안으로, 현재 화폐단위가 위안이면 클릭 시 원화로 바꾸어 보여주는 메소드
      $scope.showConvPrice = function(data){
        var currency = 0;
        $scope.currency = data;
        currency=data;
        var isWon = false;

        //현재 화폐단위가 won으로 끝날 경우 (문자열 끝에서 3개 잘라서 확인)
        if( $scope.datas[0].price.substr(-3,3) == "won"){
          isWon = true;
        }
        //현재 화폐단위가 CNY 로 끝날 경우 (문자열 끝에서 3개 잘라서 확인)
        else if( $scope.datas[0].price.substr(-3,3) == "CNY"){
          isWon = false;
        }

        //현재 값이 won으로 끝날 경우(초기 값)
        //원화를 담는 배열에 현재 초기 원화 값을 저장해 둔다 -> 위안에서 원화를 보여줄 때 가져오기 위함
        //굳이 배열에 원화를 담아 두는 이유 : 환율이 실수이므로 여러차례 곱셈연산하다보면 값이 변하게 될까봐
        if(isWon){
         for(var i=0; i< $scope.datas.length; i++){
          $scope.priceWon[i] = $scope.datas[i].price;
          var tmp = parseInt($scope.datas[i].price.replace(/,/g,""));
          tmp /= currency;
          tmp = parseInt(tmp)+"";
          tmp = comma(tmp);
          $scope.datas[i].price = tmp + " CNY";
         }
         jQuery('.btnConvPrice').text('원(₩)화보기');

        }
        else{
          for(var i=0; i< $scope.datas.length; i++){
            $scope.datas[i].price = $scope.priceWon[i];
          }

         jQuery('.btnConvPrice').text('위안(￥)화보기');
        }
      }
})

.controller('DetailImageCtrl', function($state, $scope, $http, $stateParams){
  $scope.getEachDetailImage = function(surgeryId){
    $http.get("http://meirong-mifang.com/products/getDetailImage.php", {params : {"shopId" : $stateParams.shopId, "surgeryId" :surgeryId}})
      .success(function(data){
          $scope.datas = [];
          $scope.logo = $stateParams.logo;
          for(index = 0; index < data.length; index++){
             $scope.datas.push({shopId:data[index].shopId, surgeryId:data[index].surgeryId, method:data[index].method, price:data[index].price, before:data[index].picBeforeSrc, after:data[index].picAfterSrc});
          }
      })
      .error(function(data){

      });
  }

  $scope.getAllDetailImage = function(shopId){
    $http.get("http://meirong-mifang.com/products/getAllDetailImage.php", {params : {"shopId" : shopId}})
      .success(function(data){
          $scope.datas = [];
          $scope.logo = $stateParams.logo;
          for(index = 0; index < data.length; index++){
             $scope.datas.push({shopId:data[index].shopId, surgeryId:data[index].surgeryId, method:data[index].method, price:data[index].price, before:data[index].picBeforeSrc, after:data[index].picAfterSrc});
          }
      })
      .error(function(data){

      });
  }
  
  surgeryId = $stateParams.surgeryId;
  if(surgeryId == 'all'){
    $scope.getAllDetailImage($stateParams.shopId);
  }else{
    $scope.getEachDetailImage(surgeryId);
  }

  $scope.changePage = function(){
    $state.go('app.productInfo', {"shopId": $stateParams.shopId});
  }
})

.controller('ProductInfoCtrl', function($state, $scope, $http, $stateParams){
  $http.get("http://meirong-mifang.com/products/getShopInfo.php", {params : {"shopId" : $stateParams.shopId}})
    .success(function(data){
      $scope.datas    = [];
      $scope.logoImg  = data[0].logo;
      $scope.shopName = data[0].name;
      $scope.address  = data[0].address;
      $scope.map      = data[0].map;

      $scope.doctors  = [];

      for(index = 0; index < data.length; index++){
        $scope.doctors.push({
            imgsrc : data[index].docImgs,
            id     : data[index].docId
          })
      }
    })
    .error(function(data){
    });

    //이미지를 가져와서 이미지가 없는 병원의 경우에는 이미지 준비중이라는 이미지를 출력
    $http.get("http://meirong-mifang.com/products/getShopImg.php", {params : {"shopId" : $stateParams.shopId}})
  .success(function(data){

    $scope.shopimgs = [];


    //DB에 이미지가 존재하는 경우
    if(data){
      $scope.hasImg = true;
      for(index=0; index<data.length; index++){
        $scope.shopimgs.push({
          imgsrc : data[index].imgSrc
        })
      }
    }

    //DB에 이미지가 없는 경우
    else{
      $scope.hasImg = false;
      $scope.shopimgs.push({
        imgsrc : "http://meirong-mifang.com/img/emptyimg.jpg"
      })
    }


  })
  .error(function(data){
    console.log('ProductInfoCtrl imgGet error');
  });

    $scope.shopId   = $stateParams.shopId;

    $scope.changePage = function(){
        $state.go('app.single', {"shopId": $stateParams.shopId, "productId" : $stateParams.productId});
      }
})

.controller('docProfile', function($scope, $http, $stateParams){
  $http.get("http://meirong-mifang.com/products/getDoctor.php", {params : {"docId" : $stateParams.docId}})
    .success(function(data){
      $scope.docName = data[0].name;
      $scope.imgSrc  = data[0].imgSrc;
    })
    .error(function(data){
    });

  $scope.docId = $stateParams.docId;
})

.controller('shopImgCtrl', function($scope, $http, $stateParams){
  $scope.imgList = [];
  var index = 0;
  $http.get("http://meirong-mifang.com/products/getShopImg.php", {params : {"shopId" : $stateParams.shopId}})
  .success(function(data){
    for(index=0; index<data.length; index++){
      $scope.imgList.push({
        imgsrc : data[index].imgSrc,
        desc   : data[index].imgDesc
      })
    }
  })
  .error(function(data){

  });


  var shopId = $stateParams.shopId;
  $scope.shopId = shopId;
})

.controller('CommCtrl' , function($scope){
  $scope.pageTitle = "Communication";
})

//리뷰 업로드 페이지를 관리하는 부분입니다.
.controller('UploadReviewCtrl', function($scope, $stateParams, $http, $cordovaCamera, $cordovaFile, $ionicHistory, $state){
  //카테고리를 선택하기 위한 categorys 변수 입니다.
  $scope.categorys =['eye','nose','face','bosom','body','beauty'];
  
  //uploadReview.html 안의 textarea의 동적 크기 변경을 위해 선언하였습니다.
  $scope.autoExpand = function(e) {
      var element = typeof e === 'object' ? e.target : document.getElementById(e);
        var scrollHeight = element.scrollHeight -0; 
      element.style.height =  scrollHeight + "px";    
  };
  
  //카테고리를 선택하고 나면 해당 카테고리와 연관된 모든 병원 목록들을 가져오는 함수입니다.
  $scope.update = function(review) {
    //console.log(review.category);
    Category = review.category;
    if(Category ==null){
    console.log("category select error");
    }else{
    $scope.getShopId(Category);
    }
    }
  //인자로 받은 카테고리로 "products/getList.php"로부터 병원 ID와 병원 이름을 가져오는 함수입니다.
  $scope.getShopId = function(category){
    $http.get("http://meirong-mifang.com/products/getList.php", {params : {"category" : category}})
      .success(function(data){
        $scope.noOfProduct = data.length;

        $scope.products = [];
        for(index = 0; index < data.length; index++){
           $scope.products.push({ 
            //category:category,
            shopId:data[index].shopId,
            shopName: data[index].shopName});
        }
      })
      .error(function(data){
      console.log("getShopId error");
      })
    }
  $scope.cancle = function(){
    //뒤로 돌아가기
    $ionicHistory.goBack([-1]);
  };
  //업로드 하는 부분입니다.
  $scope.upload = function(review){
    if(review.category == null || review.hospital.shopName == null){
      console.log("Empty category or Empty Shop name");
      return -1;
    }
    if(review.body.trim() == '' || review.body.trim() == null){
      console.log('Empty body');
      return -1;
    }
    //userId는 임의로 설정하였습니다.
    $scope.$root.username = 'user526';
    //"review/uploadReview.php"로 작성 정보를 보냅니다.
    $http.get("http://meirong-mifang.com/review/uploadReview.php", 
      {params : {"hospital_id":review.hospital.shopId, "hospital_name": review.hospital.shopName, "category": review.category, 
           "pictures": 'nonPicture', "contents":review.body, "user_name": $scope.$root.username}})
      .success(function(data){
        console.log('uploadReview success');
      })
      .error(function(data){
        console.log('uploadReview db transfer error');
      })  
    $state.go('app.review');
  };
   
   $scope.takePicture = function() {
        var options = { 
            quality : 75, 
            destinationType : Camera.DestinationType.DATA_URL, 
            sourceType : Camera.PictureSourceType.CAMERA, 
            allowEdit : true,
            encodingType: Camera.EncodingType.JPEG,
            targetWidth: 300,
            targetHeight: 300,
            popoverOptions: CameraPopoverOptions,
            saveToPhotoAlbum: false
        };
 
        $cordovaCamera.getPicture(options).then(function(imageData) {
            $scope.imgURI = "data:image/jpeg;base64," + imageData;
        }, function(err) {
            // An error occured. Show a message to the user
        });
    }

    $scope.uploadPhoto = function() {
      var options = { 
            quality : 75, 
            destinationType: Camera.DestinationType.FILE_URI, 
            sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
            allowEdit : true,
            encodingType: Camera.EncodingType.JPEG,
            targetWidth: 300,
            targetHeight: 300,
            popoverOptions: CameraPopoverOptions,
            saveToPhotoAlbum: false
        };
      $cordovaCamera.getPicture(options).then(function(imageData) {
            $scope.imgURI = "data:image/jpeg;base64," + imageData;
        }, function(err) {
            // An error occured. Show a message to the user
        });
    }
})
//리뷰 페이지에서 사람들이 올린 글을 표시해주도록 하는 부분입니다.
.controller('ReviewCtrl',function($scope, $stateParams, $http, $cordovaCamera, $cordovaFile){
  $scope.categorys =['eye','nose','face','bosom','body','beauty'];
  //선택한 카테고리의 리뷰 정보들을 뿌려주는 함수입니다.
  $scope.update = function(review) {
    console.log(review.category);
    Category = review.category;
    if(Category ==null){
    console.log("category select error");
    }else{
    $scope.getReview(Category);
    }
    }
  //"review/getReview.php"로부터 해당 카테고리의 리뷰 자료들을 가져와 $scope.contents 변수에 저장합니다.
  $scope.getReview = function(category){
    $http.get("http://meirong-mifang.com/review/getReview.php", {params : {"category" : category}})
      .success(function(data){
        $scope.noOfProduct = data.length;

        $scope.contents = [];
        for(index = 0; index < data.length; index++){
           $scope.contents.push({ 
            //category:data[index].part,
            shopId:data[index].shopId,
            shopName: data[index].shopName,
      pictures: data[index].pictures,
      contents: data[index].contents,
      username: data[index].userId,
      createdTime: data[index].createdTime});
      console.log(data[index].shopName);
      console.log(data[index].contents);
    }
      })
      .error(function(data){
      console.log("getShopId error");
      })
  }
})

.controller('SearchCtrl', function($scope){
  $scope.pageTitle = "Search";
});


//modal 컨텐트 크기조
function setModalHeight(parentTag){
  var modalHeight;
  var mHeader = jQuery(parentTag+' ion-header-bar').outerHeight();
  var mContent = jQuery(parentTag+' ion-content form').outerHeight();

  console.log('mHeader : '+mHeader);
  console.log('mContent : '+mContent);

  // 더한 이유는 스크롤이 생기지 않도록
  modalHeight = mHeader + mContent + 4;
  console.log('modalHeight : '+modalHeight);

  jQuery(parentTag).height(modalHeight + 'px');
}

//콤마찍기
function comma(str) {
    str = String(str);
    return str.replace(/(\d)(?=(?:\d{3})+(?!\d))/g, '$1,');
}

