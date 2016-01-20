var express = require('express');
var router = express.Router();
var fs = require('fs');
var nconf = require('nconf');
var moment = require('moment');
var tweetPublisher = require('../tweet-publisher');

/**
 * Defines route for root
 */
router.get('/', function (req, res) {

	// start stream and publishing
	tweetPublisher.start();

	// Render PubNub config for client-side javascript to reference
  res.render('index', {
		subscribe_key: nconf.get('PUBNUB_SUBSCRIBE_KEY'),
		channel: 'tweet_stream',
		ga_tracking_id: nconf.get('GA_TRACKING_ID')
	});
});

/**
 * Defines upgrade page route
 */
router.get('/upgrade', function (req, res) {
  res.render('upgrade');
});

/**
 * GET Starts stream
 */
router.get('/stream/start', function (req, res) {
	res.send( tweetPublisher.start() );
});

/**
 * GET Stops stream
 */
router.get('/stream/stop', function (req, res) {
	res.send( tweetPublisher.stop() );
});

router.get('/search-hash', function (req, res) {
	// res.send( tweetPublisher.stop() );
	// res.send(tweetPublisher.stop());
	console.log(req.param('tag'));
	console.log('helllo ');
	res.send(tweetPublisher.restart(req.param('tag')));
	// TweetPublisher.twitter.get('search/tweets', { q: 'banana since:2011-11-11', count: 100 }, function(err, data, response) {
  	// console.log(data)
	// })
});

var trends, trendsTimestamp;

/**
 * GET Returns trends from Twitter trends API
 */
router.get('/trends', function (req, res) {

	var now = moment();

	// Only allow request to trends API every 2 minutes to stay within rate limits
	if (trends && trendsTimestamp.diff(now, 'minutes') < 2 ) {
		console.log(' in am inside if statement');
		// return trends from memory
	  res.send(trends);
	  return;
	}

	TweetPublisher.twitter.get('search/tweets', { q: 'DvTest since:2016-01-01', count: 100 }, function(err, data, response) {

		if (err) {
	  	res.send(err);
	  	return;
		}
		console.log(data);
		trends = data[0]

		trendsTimestamp = moment();
		// console.log(data[0])
	  res.send(trends);
	});
});

module.exports = router;
