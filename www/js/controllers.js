//콤마찍기
function comma(str) {
    str = String(str);
    return str.replace(/(\d)(?=(?:\d{3})+(?!\d))/g, '$1,');
}

angular.module('starter.controllers', [])

.controller('AppCtrl', function($scope, $state, $ionicModal, $cookieStore) {
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
    if ($cookieStore.get('isLogin') == true) {
      $scope.$root.isLogin = true;
    } else {
      $scope.$root.isLogin = false;
    }
  });  
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
  
  $scope.$on('event:auth-loginConfirmed', function() {
    $cookieStore.put('isLogin', true);
    $scope.$root.isLogin = true;
    // $scope.username = null;
    $scope.password = null;
    $scope.loginModal.hide();
    $state.go($scope.$root.state);
  });

  $scope.$on('event:auth-login-failed', function(e, status) {
    var error = "Login failed.";
    if (status == 401) {
      error = "Invalid Username or Password.";
    }
    $scope.message = error;
  });

  $scope.$on('event:auth-logoutRequired', function(e, args){
    AuthenticationService.logout($scope.user.username);
    $scope.unregister();
  });
 
  $scope.$on('event:auth-logout-complete', function() {
    $cookieStore.put('isLogin', false); 
    $scope.$root.isLogin = false;
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
        $http.get('http://cpromise.cafe24.com/twinkle/gcm_server/register.php', {params : {"email": $scope.user.username, "type": type, "regId": $scope.regId}})
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

.controller('JoinCtrl', function($scope, $ionicModal, $state, $http){
  $scope.joinData = {};

  $ionicModal.fromTemplateUrl('templates/join.html', {
    scope: $scope
  }).then(function(modal) {
    $scope.modal = modal;
  });

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
    $http.get("http://cpromise.cafe24.com/twinkle/join.php", {params : {"username" : $scope.joinData.username, "password" : $scope.joinData.password}})
      .success(function(data){
        if(data == "true"){
          alert("OK");
        }else{
          alert("error");
        }
      })
      .error(function(data){
        alert("error");
      });
  };

  $scope.check = function(){
    $http.get("http://cpromise.cafe24.com/twinkle/checkEmail.php", {params : {"username" : $scope.joinData.username}})
      .success(function(data){
        if(data == "success"){
          alert("OK");
        }else{
          alert("duplicated");
        }
      })
      .error(function(data){
        alert("error");
      });
  };
})

.controller('MypageCtrl', function($scope, $state, $http, $stateParams, $cookieStore, $rootScope, $cordovaToast) {

  if($cookieStore.get('isLogin') != true){
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

.controller('ChatCtrl', function($scope, $http, $timeout, $ionicScrollDelegate, $rootScope, $cookieStore, $cordovaToast, $cordovaCamera){
  $scope.data = {};
  $scope.messages = [];
  
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
            $scope.imageData = imageData;
            $scope.imgURI = "data:image/jpeg;base64," + imageData;
        }, function(err) {
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
            $scope.imgURI = "data:image/jpeg;base64," + imageData;
        }, function(err) {
            // An error occured. Show a message to the user
        });
    }

  $scope.hideTime = true;
  var isIOS = ionic.Platform.isWebView() && ionic.Platform.isIOS();

  $scope.getMessages = function(){
    $http.get("meirong-mifang.com/products/getMessages.php", {params : {"from" : $scope.$root.username}})
      .success(function(data){
        for(index = 0; index < data.length; index++){
           $scope.messages.push( {from:data[index].sender_id, to:data[index].receiver_id, text:data[index].message, time:data[index].created_time});
        }
      })
      .error(function(data){
        alert("getPicerrer");
      })
  }

  $scope.sendMessage = function() {

    //채팅창에 아무것도 입력하지 않을 시 전송하지 않음.
    if($scope.data.message == '' || $scope.data.message == null){
      jQuery('#chatInput').focus();
      document.getElementById("chatInput").focus();
      return -1;
    }

    var d = new Date();
    d = d.toLocaleTimeString().replace(/:\d+ /, ' '); //d예시 : 오후 10:26:10
    $scope.messages.push({
      from: $scope.$root.username,
      to: 'admin',
      text: $scope.data.message,
      time: d
    });
    $http.get("http://meirong-mifang.com/products/sendMessages.php", {params : {"from" : $scope.$root.username, "to" : 'admin', "message" : $scope.data.message}})
      .success(function(data){
        for(index = 0; index < data.length; index++){
           $scope.messages.push( {from:data[index].sender_id, to:data[index].receiver_id, text:data[index].message, time:data[index].created_time});
           alert(1);
        }
      })
      .error(function(data){
  
      })

    delete $scope.data.message;
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

  if($scope.$root.isLogin != true){
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

     
      $scope.getCurrency = function(){
        $http.get("http://www.webservicex.net/CurrencyConvertor.asmx/ConversionRate?FromCurrency=CNY&ToCurrency=KRW")
          .success(function(data){

            return data.substring(84,90);
          })
          .error(function(data){
            alert('getCurrency-error');
            return false;
          });
      }

     var currency = $scope.getCurrency();
 //     var currency = 178;

      //현재 화폐단위가 원화이면 클릭 시 중국위안으로, 현재 화폐단위가 위안이면 클릭 시 원화로 바꾸어 보여주는 메소드
      $scope.showConvPrice = function(){
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
        }
        else{
          for(var i=0; i< $scope.datas.length; i++){
            $scope.datas[i].price = $scope.priceWon[i];
          }
        }
      }
})

.controller('DetailImageCtrl', function($scope, $http, $stateParams){
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
    $state.go("app.productInfo", {"shopId": $stateParams.shopId});
  }
})

.controller('ProductInfoCtrl', function($scope, $http, $stateParams){
  $http.get("http://meirong-mifang.com/products/getShopInfo.php", {params : {"shopId" : $stateParams.shopId}})
    .success(function(data){
      $scope.datas    = [];
      $scope.logoImg  = data[0].logo;
      $scope.shopName = data[0].name;
      $scope.address  = data[0].address;
      $scope.map      = data[0].map;

      $scope.doctors  = [];
      $scope.shopimgs = [];

      //shopImgSrc 임시로 지정
      $scope.shopImgSrc = data[0].shopImgs;
      $scope.shopImgSrc = "http://meirong-mifang.com/img/emptyimg.jpg";

      for(index = 0; index < data.length; index++){
        $scope.doctors.push({
            imgsrc : data[index].docImgs,
            id     : data[index].docId
          })
      }
    })
    .error(function(data){
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

.controller('ReviewCtrl', function($scope, $stateParams, $cordovaCamera, $cordovaFile){
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
});

