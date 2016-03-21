// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.controllers' is found in controllers.js
angular.module('starter', ['ionic', 'starter.controllers', 'ngCordova', 'ionic-audio'])

.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      cordova.plugins.Keyboard.disableScroll(true);

    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }
  });
})
.filter('trusted', ['$sce', function ($sce) {
    return function(url) {
        return $sce.trustAsResourceUrl(url);
    };
}])

.service('FileService', function($ionicPlatform, $cordovaFile){
  var createDirectory = function(audioDirectory){
    $cordovaFile.checkDir(cordova.file.externalRootDirectory, audioDirectory)
    .then(function (success) {
      // directory already exists
      console.log("success", success)
    }, function (error) {
      //if directory not created then CREATE it
      $cordovaFile.createDir(cordova.file.externalRootDirectory, audioDirectory, false)
        .then(function (success) {
          // success
          console.log("directory created", success)
        }, function (error) {
          // error
          console.log("directory not created", error)
        });
    });
  }
  return{
    createDirectory: createDirectory
  }
})

.service('Sounds', function($ionicPlatform, $cordovaFile, $ionicLoading, FileService, $timeout, $cordovaMedia){
  var self = this;
  $ionicPlatform.ready(function() {
    var recorder = new Object;
    var recorded_file_url;
    var audioDirectory = "store_audio"
    self.myRecordObj = recorder; 
    recorder.stop = function($scope) {
      $scope.isRecording = false;
      $scope.recordInfo = "recording stopped"
      window.plugins.audioRecorderAPI.stop(function(msg) {
        // success
        var fileName = msg.split('/')[msg.split('/').length - 1];
        FileService.createDirectory(audioDirectory); //call to create directory service
        saveAudio(fileName, $scope);
      }, function(msg) {
        // failed
        alert('ko: ' + msg);
      });
    }

    saveAudio = function(fileName, $scope){
      if (cordova.file.documentsDirectory) {
        directory = cordova.file.documentsDirectory; // for iOS
      } else {
        directory = cordova.file.externalRootDirectory; // for Android
      }
      var recorded_file = "record" + Date.now() +".m4a"
      $cordovaFile.copyFile(
        cordova.file.dataDirectory, fileName,
        directory+audioDirectory, recorded_file
      )
        .then(function (success) {
          $scope.isRecording = false;
          $scope.recordInfo = "";
          recorded_file_url= success.nativeURL
          $scope.recorded_file_url= success.nativeURL
          console.log("success.nativeURL", success.nativeURL);
          $scope.isRecordComplete = true;
        }, function (error) {
          $scope.recordInfo = ""
          $scope.isRecording = false;
          alert('file fail'+ JSON.stringify(error));
        });
    }

    recorder.sendAudio = function($scope){
      console.log(recorded_file_url)
      $scope.recordInfo= "audio sending("+ recorded_file_url + ")..."
      $timeout(function() {
        $scope.recordInfo= '';
      }, 6000);
    }

    recorder.record = function($scope) {
      $scope.isRecording = true;
      $scope.recordInfo = "recording going on..."
      window.plugins.audioRecorderAPI.record(function(savedFilePath) {
        console.log('savedFilePath', savedFilePath)
        var fileName = savedFilePath.split('/')[savedFilePath.split('/').length - 1];
        FileService.createDirectory(audioDirectory); //call to create directory service
        saveAudio(fileName, $scope);
      }, function(msg) {
        alert('ko: ' + msg);
      }, 10);
    }
    recorder.playback = function($scope) {
      $scope.recordInfo = "playing..."
      AudioToggle.setAudioMode(AudioToggle.SPEAKER);
      window.plugins.audioRecorderAPI.playback(function(msg) {
        // complete
        $scope.recordInfo = "";
        $scope.$apply();
      }, function(msg) {
        // failed
        $scope.recordInfo = "";
        alert('ko: ' + msg);
      });
    }

    // audio play plugin code
    var mediaStatusCallback = function(status) {
      if(status == 1) {
        $ionicLoading.show({template: 'Loading...'});
      } else {
        $ionicLoading.hide();
      }
    }
    var media;
    var playStatus;
    var iOSPlayOptions = {
      numberOfLoops: 2,
      playAudioWhenScreenIsLocked : false
    }
    var media = null;
    var mediaTimer = null;
    recorder.playSound = function(callPlayCallabck, onStopCallback){
      if(recorded_file_url != undefined){
        AudioToggle.setAudioMode(AudioToggle.SPEAKER);
        callPlayCallabck();
          if(recorded_file_url.charAt(0) == 'f'){
            recorded_file_url = recorded_file_url.slice(7); // for ios
          }
        media = new Media(""+recorded_file_url, null, null, mediaStatusCallback);
        media.play(media, { playAudioWhenScreenIsLocked : false });
        // Update my_media position every second
        var totalDuration;
        $timeout(function() {
            totalDuration = media.getDuration();
        }, 100);
        if (mediaTimer == null) {
          mediaTimer = setInterval(function() {
            console.log(totalDuration);
            // get my_media position
            media.getCurrentPosition(
              // success callback
              function(position) {
                console.log("getCurrentPosition position : ",position);
                if (position > -1) {
                console.log("getCurrentPosition position : ",position);
                console.log("getCurrentPosition totalDuration : ",totalDuration);
                  setAudioPosition(position, totalDuration, onStopCallback);
                }
              },
              // error callback
              function(e) {
                console.log("Error getting pos=" + e);
                setAudioPosition("Error: " + e);
              }
            );
          }, 100);
        }
      }
    }
    recorder.pauseSound = function(){
      if(media != null){
        media.pause();
        clearInterval(mediaTimer);
        mediaTimer = null;
      }
    }
    function setAudioPosition(position, totalDuration, onStopCallback) {
      if(position <= 0){
        document.getElementById('audio_bar').style.width = (100) + "%";
        clearInterval(mediaTimer);
        mediaTimer = null;
       onStopCallback();
        playStatus = "playComplete";
      }else{
        console.log("position:",position);
        console.log("totalDuration", totalDuration)
        // console.log("100/position",(position/totalDuration) * 100)
        // document.getElementById('audio_bar').style.width = ((position/totalDuration) * 100) + "%";
        document.getElementById('audio_bar').style.width = ((100-(100/position))) + "%";
      }
      document.getElementById('audio_position').innerHTML = position + " sec";
    }
    // end audio play plugin code
  });
})


.config(function($stateProvider, $urlRouterProvider) {
  $stateProvider

    .state('app', {
    url: '/app',
    abstract: true,
    templateUrl: 'templates/menu.html',
    controller: 'AppCtrl'
  })

  .state('app.search', {
    url: '/search',
    views: {
      'menuContent': {
        templateUrl: 'templates/search.html'
      }
    }
  })

  .state('app.browse', {
      url: '/browse',
      views: {
        'menuContent': {
          templateUrl: 'templates/browse.html'
        }
      }
    })
    .state('app.playlists', {
      url: '/playlists',
      views: {
        'menuContent': {
          templateUrl: 'templates/playlists.html',
          controller: 'PlaylistsCtrl'
        }
      }
    })

  .state('app.single', {
    url: '/playlists/:playlistId',
    views: {
      'menuContent': {
        templateUrl: 'templates/playlist.html',
        controller: 'PlaylistCtrl'
      }
    }
  });
  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/app/playlists');
});
