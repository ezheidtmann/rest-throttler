rest-throttler.js
=================

Interceptor for rate-limiting requests done via rest.js-compatible clients.

Usage
-----
Using this interceptor is pretty straightforward. See below.

### Basic example ###
```javascript
var rest = require('rest');
var throttler = require('rest-throttler');

var slowClient = rest.chain(throttler, 1000); // 1 request per 1000 ms

slowClient('/foo').tap(console.log);
slowClient('/bar').tap(console.log);
slowClient('/buzz').tap(console.log);
slowClient('/quux').tap(console.log);
```

In this example, four requests will be performed sequentially, one after another, with 1000 msec delay between.

### Multiple throttlers ###
You can also create multiple unrelated throttlers:

```javascript
var rest = require('rest');
var throttler = require('rest-throttler');

var slowClient = rest.chain(throttler, 1000);
var verySlowClient = rest.chain(throttler, 2000);

slowClient('/foo').tap(console.log);
verySlowClient('/bar').tap(console.log);
slowClient('/buzz').tap(console.log);
```

In this example `slowClient` and `verySlowClient` have unrelated throttlers, so they are executed in parallel to each other, but still remain sequential within their local queues.

### Multiple clients ###
You can share single throttler between several clients:

```javascript
var rest = require('rest');
var throttler = require('rest-throttler');

var limit = throttler.limit(1000);

var muchSlowClient = rest.chain(throttler, limit);
var verySlackClient = rest.chain(throttler, limit);

muchSlowClient('/foo').tap(console.log);
verySlackClient('/bar').tap(console.log);
muchSlowClient('/buzz').tap(console.log);
verySlackClient('/quux').tap(console.log);
```

These two clients share same limit object, so they belong to single queue and won't be handled in parallel.

### Altering behavior ###
By default, interceptor ensures time delta between the last response and next request is no less than specified delay, so if you talk to slow server, you may wait somewhat longer than expected.

If you are not happy with this, you can tell throttler to only account interval between sending requests, disregarding when and if response arrives:
```javascript
var rest = require('rest');
var throttler = require('rest-throttler');

var slowClient = rest.chain(throttler, { limit: 1000, async: true });

slowClient('/foo').tap(console.log);
```

`limit` property accepts either explicit limit object, or delay number to create limit object automatically. Absent `limit` property disables throttling completely.

### Dynamic reconfiguration ###
You can override settings for specific request by assigning configuration hash object to `request.throttler` property.

Following example will uniformly distribute requests between two throttlers, without altering client itself:
```javascript
var rest = require('rest');
var throttler = require('rest-throttler');

var varyingClient = rest.chain(throttler);

var slowLimit = throttler.limit(1000);
var fastLimit = throttler.limit(250);

for (var i = 0; i < 10; i++) {
	varyingClient({
		path: 'http://httpbin.org/get?seq=' + i,
		throttler: {
			async: false,
			limit: (Math.random() < 0.5) ? slowLimit : fastLimit
		},
		seq: i
	}).tap(function(response) {
		var request = response.request;
		var delay = request.throttler.limit.delay;
		var prefix = '';
		
		if (delay === 1000) {
			prefix = '\t\t\t\t';
		}
		
		console.log(prefix + 'Seq #' + request.seq + ' used delay ' + request.throttler.limit.delay);
	}).done();
}
```

This can be also changed from preceding interceptors, for example, to implement optional rate limiting depending on domain, or whatever.

### Using as promise ###
`limit` object is actually promise factory. You can use it as follows:

```javascript
var limit = require('rest-throttler').limit;

var queue = limit(3000);
queue().tap(function() { console.log('This will show up immediately.'); });
queue().tap(function() { console.log('This will be delayed by 3 seconds.'); });
queue().tap(function() { console.log('All these remain sequential.'); });
```

Invoking `limit(delay)` returns function returning promise, that will resolve `delay` msec after last promise from same throttler had resolved.

It does not work!
-----------------
You are doing it wrong. Please make sure you either share **same `limit` object** between client instances you want to belong to same rate limiting queue.

Copyright
---------
rest-throttler.js is made available under the terms of MIT license. See LICENSE for details.
