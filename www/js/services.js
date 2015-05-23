angular.module('starter.services', ['http-auth-interceptor'])
.factory('AuthenticationService', function($rootScope, $http, authService, $cookieStore) {
  var service = {
    login: function(username, password) {
      $http.get('http://meirong-mifang.com/users/login.php', {params : {"username" : username, "password" : password}}, { ignoreAuthModule: true })
       .success(function (data, status, headers, config) {
         $cookieStore.put('loginLevel', data);
         $cookieStore.put('username', username);
    	   $http.defaults.headers.common.Authorization = data.authorizationToken;
          authService.loginConfirmed(data, function(config) {
            config.headers.Authorization = data.authorizationToken;
            return config;
          });
        })
        .error(function (data, status, headers, config) {
          $rootScope.$broadcast('event:auth-login-failed', status);
        });
    },
    logout: function(username) {
      // $http.post('https://logout', {}, { ignoreAuthModule: true })
      // .finally(function(data) {
        delete $http.defaults.headers.common.Authorization;
        $rootScope.$broadcast('event:auth-logout-complete');
      // });			
    },	
    loginCancelled: function() {
      authService.loginCancelled();
    }
  };
  return service;
})

.config(['$ionicConfigProvider', function($ionicConfigProvider) {
  $ionicConfigProvider.tabs.position('bottom');
}]);