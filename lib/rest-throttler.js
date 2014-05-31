/*
 * Request throttling interceptor for rest.js
 * 
 * Licensed under the terms of MIT license. See LICENSE for details.
 */

/*jslint node: true, white: true, vars: true, es5: true */

'use strict';

var interceptor = require('./interceptor.js');
var when = require('when');
var mixin = require('rest/util/mixin');

var throttler = interceptor({
	init: function(config) {
		config = ((config === undefined) || (config === null)) ? {} : config;
		
		if ((typeof config === 'function') || (typeof config === 'number')) {
			config = { limit: config };
		}
		
		if (typeof config.limit === 'number') {
			config.limit = throttler.limit(config.limit);
		}
		
		if ((config.limit === undefined) || (config.limit === null)) {
			config.limit = null;
		}
		
		return config;
	},
	
	request: function(request, config) {
		config = mixin({}, config, request.throttler);
		
		if (config.limit !== null) {
			if (config.async) {
				return config.limit().yield(request);
			}
		
			return config.limit('request').yield(request);
		}
		
		return request;
	},
	
	response: function(response, config) {
		config = mixin({}, config, response.request.throttler);
		
		if (config.limit !== null) {
			return config.limit('response').yield(response);
		}
		
		return response;
	}
});

throttler.limit = function(delay) {
	var queue = [];
	var waiting = false;
	var scheduled = false;
	
	var limit = function(barrier) {
		return when.promise(function(resolve) {
			switch (barrier) {
				case undefined:
					resolve.pure = true;
					/* fallthrough */
				case 'request':
					enqueue(resolve);
					break;
			
				case 'response':
					resolve();
					schedule();
					break;
				
				default:
					throw new Error('unknown barrier type');
			}
		});
	};
	
	limit.queue = queue;
	limit.delay = delay;

	function schedule() {
		if (!scheduled) {
			scheduled = true;
			
			setTimeout(function() {
				scheduled = false;
				waiting = false;
				
				work();
			}, limit.delay);
		}
	};
	
	function work() {
		var task = limit.queue.shift();
		
		if (task !== undefined) {
			waiting = true;
			
			task();
			
			if (task.pure) {
				schedule();
			}
		}
	};
	
	function enqueue(task) {
		limit.queue.push(task);
		
		if (!waiting) {
			work();
		}
	};
	
	return limit;
};

module.exports = throttler;
