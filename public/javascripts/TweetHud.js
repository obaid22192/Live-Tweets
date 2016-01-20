var app = angular.module('TweetGlobe', ['ngResource', 'ngMaterial', 'pubnub.angular.service']);
app.run(function($window) {
  var globe = JSON.parse($window.localStorage.getItem('globe'));
  if(globe === null || globe === undefined) {
    $window.localStorage.setItem('globe', JSON.stringify({world_globe: 'world'}));
  }
});

app.controller('TweetHud', function($window, $scope, $resource, $timeout, $rootScope, $timeout, $mdDialog, $mdMedia, PubNub) {

	var TWEET_SAMPLE_SIZE = 50, // The nubmer of Tweet to display in the left-hand column
      TREND_POLL_INTERVAL = 120000; // Trend update time interval
  // search by tag

  $scope.searchtag = '#newyear';

  // Select earth globe
  $scope.globe = JSON.parse(window.localStorage.getItem('globe')).world_globe
  $scope.globs = ('world-dark world no_clouds water_4k elev_bump').split(' ').map(function (glo) {
    return {globe: glo};
  });

  // $scope.$watch('globe', function() {
  //   $window.location.reload();
  // });
  $scope.$watch(function() {
    return $scope.globe;
  }, function(newValue, oldValue) {
    console.log("change detected: " + newValue)
    if(newValue !== oldValue) {
      $window.localStorage.setItem('globe', JSON.stringify({world_globe: newValue}));
      $window.location.reload();
    }
  });
  $scope.status = '  ';
  $scope.customFullscreen = $mdMedia('xs') || $mdMedia('sm');
  $scope.showAdvanced = function(ev, tweet) {

    var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'))  && $scope.customFullscreen;
    $mdDialog.show({
      controller: DialogController,
      templateUrl: '../templates/dialog.html',
      parent: angular.element(document.body),
      targetEvent: ev,
      locals: {
          tweet: tweet
      },
      clickOutsideToClose:true,
      fullscreen: useFullScreen
    })
    .then(function(answer) {
      $scope.status = 'You said the information was "' + answer + '".';
    }, function() {
      $scope.status = 'You cancelled the dialog.';
    });
    $scope.$watch(function() {
      return $mdMedia('xs') || $mdMedia('sm');
    }, function(wantsFullScreen) {
      $scope.customFullscreen = (wantsFullScreen === true);
    });
  };
  /**
   *  Initializes PubNub websocket connection
   */
  $scope.test = $resource('/search')
  $scope.test.query( { }, function (res) {
    // $scope.trends = res;
    // console.log(res)
  });

  $scope.init = function () {
  	$scope.tweets = [];

		PubNub.init({
      subscribe_key: pubnubConfig.subscribe_key,
      ssl: location.protocol == 'https:'
    });

	 	PubNub.ngSubscribe({
      channel: pubnubConfig.channel
    });

	  $rootScope.$on(PubNub.ngMsgEv(pubnubConfig.channel), function(event, payload) {

      // Add tweet to this hud
      // console.log(payload.message);
	    addTweet(payload.message);

      // Add tweet to 3D globe
      if(payload.message.coordinates) {
        TwtrGlobe.onTweet(payload.message);
      }
	  });

	  getTrends();
  }

  /**
   * GET request trends every TREND_POLL_INTERVAL and sets them on binded model
   */
  function getTrends () {

    $scope.trendsResource = $resource('/trends');

    $scope.trendsResource.query( { }, function (res) {
      $scope.trends = res;
      // console.log(res)
    });

    $timeout(function () {
    	getTrends();
    }, TREND_POLL_INTERVAL);
  }

  /**
   * Adds Tweet data to binded model
   */
  function addTweet (tweet) {

  	tweet.sentiment.state = getSentimentState(tweet.sentiment.score);

  	$scope.$apply(function () {
	  	$scope.tweets.unshift(tweet);
  	});

	  if ($scope.tweets.length > TWEET_SAMPLE_SIZE) {
	  	$scope.$apply(function () {
		  	$scope.tweets.pop();
	  	});
  	}

  	measureSentiment();
  }

  $scope.avgSentiment = (0).toFixed(2);
  var sentimentScoreTotal = 0;

  /**
   * Averages sentiment of the TWEET_SAMPLE_SIZE
   */
  function measureSentiment () {
    sentimentScoreTotal = 0;

    angular.forEach($scope.tweets, function(tweet, key) {
      sentimentScoreTotal = sentimentScoreTotal + tweet.sentiment.score;
    });

    $scope.avgSentiment = (Math.round((sentimentScoreTotal / TWEET_SAMPLE_SIZE) * 100) / 100).toFixed(2);
    $scope.sentimentState = getSentimentState($scope.avgSentiment);
  }

  /**
   *  Returns sentiment description for use as a CSS class
   */
	function getSentimentState (score) {

		var state = 'neutral';

  	if (score < 0) {
  		state = 'negative';
  	}
  	else if (score > 0) {
  		state = 'positive';
  	}

		return state;
	}

  /**
   * GET request to stop stream on the server
   */
  $scope.stop = function () {

    $scope.trendsResource = $resource('/stream/stop');

    $scope.trendsResource.query( { }, function (res) {

    });
  }

  /**
   * GET request to start stream on the server
   */
  $scope.start = function () {

    $scope.trendsResource = $resource('/stream/start');

    $scope.trendsResource.query( { }, function (res) {

    });
  }

  $scope.start_tag_search = function (tag_) {
    // alert('hi');
    if(tag_ === '') {
      return;
    }
    $scope.searchResource = $resource('/search-hash', {
      tag: '@tag'
    }, {
      query:
            {
                cache: false,
                method: 'GET'
            }
    });
    $scope.searchResource.query( {tag: tag_}, function (res) {

    });
    // $window.location.reload();
  }

  $scope.init();

});

function DialogController($scope, $mdDialog, tweet) {
  console.log(tweet);
  $scope.tweet = tweet;
  $scope.hide = function() {
    $mdDialog.hide();
  };
  $scope.cancel = function() {
    $mdDialog.cancel();
  };
  $scope.answer = function(answer) {
    $mdDialog.hide(answer);
  };
}