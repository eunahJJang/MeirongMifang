angular.module('starter.services', ['http-auth-interceptor'])
.factory('AuthenticationService', function($rootScope, $http, authService) {
  var service = {
    login: function(username, password) {
      $http.get('http://cpromise.cafe24.com/twinkle/login.php', {params : {"username" : username, "password" : password}}, { ignoreAuthModule: true })
       .success(function (data, status, headers, config) {
    	   $http.defaults.headers.common.Authorization = data.authorizationToken;  // Step 1
        
          authService.loginConfirmed(data, function(config) {  // Step 2 & 3
            config.headers.Authorization = data.authorizationToken;
            return config;
          });
        })
        .error(function (data, status, headers, config) {
          $rootScope.$broadcast('event:auth-login-failed', status);
        });
    },
    logout: function(user) {
      $http.post('https://logout', {}, { ignoreAuthModule: true })
      .finally(function(data) {
        delete $http.defaults.headers.common.Authorization;
        $rootScope.$broadcast('event:auth-logout-complete');
      });			
    },	
    loginCancelled: function() {
      authService.loginCancelled();
    }
  };
  return service;
})