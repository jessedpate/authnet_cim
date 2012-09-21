require.paths.unshift(__dirname);

var EventEmitter = require('events').EventEmitter;
var queryString = require('querystring'), requestFormats = require('request-formats');
var crypto = require('crypto'), https = require('https');
var xml2js = require('xml2js');

var environments = {
	sandbox: 'apitest.authorize.net',
	live: 'api.authorize.net'
};

/**
 * Return an interface to Authorize.net with provided options
 *
 * Example:
 *
 *    var paymentGateway = authnet_aim.createConnection({ environment: 'sandbox' });
 *
 * @param {Object} options
 * 		- {String} environment (sandbox || live)
 * 		- {Boolean} debug
 *
 * @return {AuthorizeNetCIMClient}		
 * @api public
 */
 
exports.createConnection = function(options) {
	options = options || {};
	options.debug = !!options.debug; // Force true boolean
	
	if(options.environment !== 'sandbox' && options.environment !== 'live') {
		throw new Error(options.environment + ' is not a valid Authorize.net environment.');
	}
	
	var connection = new RawHttpConnection({
		host: environments[options.environment],
		path: '/xml/v1/request.api',
		contentType: 'text/xml',
		debug: debug
	});

	return new AuthorizeNetCIMClient(options, connection);
};

var AuthorizeNetCIMClient = function(options, client) {
    var id = false, key = false;

	/**
	 * Set the login id and transaction key to be sent to auth.net
	 * on every request from this client. This must be set before
	 * making requests.
	 *
	 * Example:
	 *
	 *    var paymentGateway.setLoginDetails({loginId: 'yourLoginId', transactionKey: 'yourTransactionKey'});
	 *
	 * @param {Object} params
	 * 		- {String} loginId
	 * 		- {string} transactionKey
	 *
	 * @api public
	 */
	
	this.setLoginDetails = function(params) {
		params = params || {};
		
        id = params.loginId;
        key = params.transactionKey;
    };

	/**
	 * Creates a customer profile and (optionally) creates payment profiles
	 * and shipping address profiles along with it.
	 *
	 * This function maps to createCustomerProfileRequest in the authnet API.
	 * Pg 21 of merchant service API guide for full parameter details.
	 * 
	 * Example:
	 *
	 *    paymentGateway.createCustomerProfile({ ... }, function(err, result) {
	 *		if(err) { ... }
	 *		else { ... }
	 *    });
	 *
	 * @param {Object} params
	 * 		- {String} merchantCustomerId
	 * 		- {String} description
	 * 		- {String} email
	 *
	 * @api public
	 */

	this.createCustomerProfile = function(params, cb) {
		sendAuthNetRequest('createCustomerProfile', params, cb);
	};

	/**
	 * Create a payment profile for an existing customer profile
	 *
	 * This function maps to createCustomerPaymentProfileRequest in the authnet API.
	 * Pg 27 of merchant service API guide for full parameter details.
	 * 
	 * Example:
	 *
	 *    paymentGateway.createCustomerPaymentProfile({ ... }, function(err, result) {
	 *		if(err) { ... }
	 *		else { ... }
	 *    });
	 *
	 * @param {Object} params
	 *
	 * @api public
	 */

	this.createCustomerShippingAddress = function(params, cb) {
		sendAuthNetRequest('createCustomerPaymentProfile', params, cb);
	};

	/**
	 * Create a new shipping address for an existing customer profile
	 *
	 * This function maps to createCustomerShippingAddress in the authnet API.
	 * Pg 31 of merchant service API guide for full parameter details.
	 * 
	 * Example:
	 *
	 *    paymentGateway.createCustomerShippingAddress({ ... }, function(err, result) {
	 *		if(err) { ... }
	 *		else { ... }
	 *    });
	 *
	 * @param {Object} params
	 *
	 * @api public
	 */

	this.createCustomerShippingAddress = function(params, cb) {
		sendAuthNetRequest('createCustomerShippingAddress', params, cb);
	};

	/**
	 * Create a new authorization only transaction from an existing customer profile
	 *
	 * This function maps to createCustomerProfileTransactionRequest in the authnet API.
	 * Pg 33 of merchant service API guide for full parameter details.
	 * 
	 * Example:
	 *
	 *    paymentGateway.createAuthOnlyTransaction({ ... }, function(err, result) {
	 *		if(err) { ... }
	 *		else { ... }
	 *    });
	 *
	 * @param {Object} params
	 *
	 * @api public
	 */

	this.createAuthOnlyTransaction = function(params, cb) {
		var data = {
			profileTransAuthOnly: params
		};
		
		sendAuthNetRequest('createCustomerProfileTransaction', data, cb);
	};

	/**
	 * Create a new authorization and capture transaction from an existing customer profile
	 *
	 * This function maps to createCustomerProfileTransactionRequest in the authnet API.
	 * Pg 33 of merchant service API guide for full parameter details.
	 * 
	 * Example:
	 *
	 *    paymentGateway.createAuthAndCaptureTransaction({ ... }, function(err, result) {
	 *		if(err) { ... }
	 *		else { ... }
	 *    });
	 *
	 * @param {Object} params
	 *
	 * @api public
	 */

	this.createAuthAndCaptureTransaction = function(params, cb) {
		var data = {
			profileTransAuthCapture: params
		};
		
		sendAuthNetRequest('createCustomerProfileTransaction', data, cb);
	};

	/**
	 * Create a new capture only transaction from an existing customer profile
	 *
	 * This function maps to createCustomerProfileTransactionRequest in the authnet API.
	 * Pg 33 of merchant service API guide for full parameter details.
	 * 
	 * Example:
	 *
	 *    paymentGateway.createCaptureTransaction({ ... }, function(err, result) {
	 *		if(err) { ... }
	 *		else { ... }
	 *    });
	 *
	 * @param {Object} params
	 *
	 * @api public
	 */

	this.createCaptureTransaction = function(params, cb) {
		var data = {
			profileTransCaptureOnly: params
		};
		
		sendAuthNetRequest('createCustomerProfileTransaction', data, cb);
	};

	/**
	 * Create a new prior authorization and capture transaction from an existing customer profile
	 *
	 * This function maps to createCustomerProfileTransactionRequest in the authnet API.
	 * Pg 33 of merchant service API guide for full parameter details.
	 * 
	 * Example:
	 *
	 *    paymentGateway.createPriorAuthAndCaptureTransaction({ ... }, function(err, result) {
	 *		if(err) { ... }
	 *		else { ... }
	 *    });
	 *
	 * @param {Object} params
	 *
	 * @api public
	 */

	this.createPriorAuthAndCaptureTransaction = function(params, cb) {
		var data = {
			profileTransPriorAuthCapture: params
		};
		
		sendAuthNetRequest('createCustomerProfileTransaction', data, cb);
	};

	/**
	 * Create a new refund transaction from an existing customer profile
	 *
	 * This function maps to createCustomerProfileTransactionRequest in the authnet API.
	 * Pg 33 of merchant service API guide for full parameter details.
	 * 
	 * Example:
	 *
	 *    paymentGateway.createAuthOnlyTransaction({ ... }, function(err, result) {
	 *		if(err) { ... }
	 *		else { ... }
	 *    });
	 *
	 * @param {Object} params
	 *
	 * @api public
	 */

	this.createRefundTransaction = function(params, cb) {
		var data = {
			profileTransRefund: params
		};
		
		sendAuthNetRequest('createCustomerProfileTransaction', data, cb);
	};

	/**
	 * Create a void transaction from an existing customer profile
	 *
	 * This function maps to createCustomerProfileTransactionRequest in the authnet API.
	 * Pg 33 of merchant service API guide for full parameter details.
	 * 
	 * Example:
	 *
	 *    paymentGateway.createVoidTransaction({ ... }, function(err, result) {
	 *		if(err) { ... }
	 *		else { ... }
	 *    });
	 *
	 * @param {Object} params
	 *
	 * @api public
	 */

	this.createVoidTransaction = function(params, cb) {
		var data = {
			profileTransAVoid: params
		};
		
		sendAuthNetRequest('createCustomerProfileTransaction', data, cb);
	};



	this.deleteCustomerProfile = function(params, cb) {
		sendAuthNetRequest('deleteCustomerProfile', params, cb);
	};

	this.deleteCustomerPaymentProfile = function(params, cb) {
		sendAuthNetRequest('deleteCustomerPaymentProfile', params, cb);
	};

	this.deleteCustomerShippingAddress = function(params, cb) {
		sendAuthNetRequest('deleteCustomerShippingAddress', params, cb);
	};

	this.getCustomerProfile = function(params, cb) {
		sendAuthNetRequest('getCustomerProfile', params, cb);
	};

	this.getCustomerPaymentProfile = function(params, cb) {
		sendAuthNetRequest('getCustomerPaymentProfile', params, cb);
	};

	this.getCustomerShippingAddress = function(params, cb) {
		sendAuthNetRequest('getCustomerShippingAddress', params, cb);
	};

	this.updateCustomerProfile = function(params, cb) {
		sendAuthNetRequest('updateCustomerProfile', params, cb);
	};

	this.updateCustomerPaymentProfile = function(params, cb) {
		sendAuthNetRequest('updateCustomerPaymentProfile', params, cb);
	};

	this.updateCustomerShippingAddress = function(params, cb) {
		sendAuthNetRequest('updateCustomerShippingAddress', params, cb);
	};

	var sendAuthNetRequest = function(method, params, cb) {
		var requestBody = requestFormats[method](params);
		var requestEmitter = request(requestBody);
		
		requestEmitter.on('success', function(response) {
			cb(null, response);
		});
		
		requestEmitter.on('failure', function() {
			cb(response);
		});
	};

	var parseAuthnetResponse = function(response) {
		var parsedResponse = {};
		parsedResponse.code = response.messages.message.code;
		if(parsedResponse.directResponse) {
			var dr = response.directResponse.split(',');
			parsedResponse.response_code = dr[0];
			parsedResponse.response_subcode = dr[1];
			parsedResponse.reason_code = dr[2];
			parsedResponse.response_reason = dr[3];
			parsedResponse.auth_code = dr[4];
			parsedResponse.avs = dr[5];
			parsedResponse.transaction_id = dr[6];
		}
		
		return parsedResponse;
	};


    

    methods.createCustomerProfileTransaction = function(request) {
        // Pg 33 of merchant service API guide
        return requestFormats.createCustomerProfileTransaction(request);
    };
    
    methods.deleteCustomerProfile = function(request) {
        // Pg 68 of merchant service API guide
        return requestFormats.deleteCustomerProfile(request);
    };
    methods.deleteCustomerPaymentProfile = function(request) {
        // Pg 69 of merchant service API guide
        return requestFormats.deleteCustomerPaymentProfile(request);
    };
    methods.deleteCustomerShippingAddress = function(request) {
        // Pg 70 of merchant service API guide
        return requestFormats.deleteCustomerShippingAddress(request);
    };

    methods.getCustomerProfile = function(request) {
        // Pg 71 of merchant service API guide
        return requestFormats.getCustomerProfile(request);
    };
    methods.getCustomerPaymentProfile = function(request) {
        // Pg 72 of merchant service API guide
        return requestFormats.getCustomerPaymentProfile(request);
    };
    methods.getCustomerShippingAddress = function(request) {
        // Pg 73 of merchant service API guide
        return requestFormats.getCustomerShippingAddress(request);
    };

    methods.updateCustomerProfile = function(request) {
        // Pg 75 of merchant service API guide
        return requestFormats.updateCustomerProfile(request);
    };
    methods.updateCustomerPaymentProfile = function(request) {
        // Pg 76 of merchant service API guide
        return requestFormats.updateCustomerPaymentProfile(request);
    };
    methods.updateCustomerShippingAddress = function(request) {
        // Pg 82 of merchant service API guide
        return requestFormats.updateCustomerShippingAddress(request);
    };

    
    var request = function(content) {
        var body = false;
        var emitter = new EventEmitter();

        if(content) {
            body = requestFormats.body({
                requestType: type,
                login: id,
                transactionKey: key,
                content: content
            });
        }
		
		//Temp for debugging
        //console.log(body.replace(/>/g, '>\n').replace(/</g, '\n<'));
		
        if(body) {
            client.sendServerRequest(body, function(response) {
				var parsedResponse = parseAuthnetResponse(response);
                if(response.messages.resultCode == 'Error') {
					emitter.emit('failure', parsedResponse);
				}
				else {
					if(parsedResponse.response_code !== undefined) {
						if(parsedResponse.response_code == 1) {
							emitter.emit('success', parsedResponse);
						}
						else {
							emitter.emit('failure', parsedResponse);
						}
					}
					else {
						emitter.emit('success', parsedResponse);
					}
				}
            });

            return emitter;
        }
        else {
            setTimeout(function() {
                emitter.emit('error', 'Invalid request');
            }, 10);
            
            return emitter;
        }
    };
};

var RawHttpConnection = function(options, auth) {
	var debug = options.debug;

	this.sendServerRequest = function(request, callback) {
		var id = +new Date();
		
		var requestString = queryString.stringify(request);
		var req = https.request({
			host: options.host,
			path: options.path,
			method: 'POST',
			headers: {
				'Content-Length': request.length,
				'Content-Type': options.contentType
			}
		});

		if(debug) {
			console.log('AUTHNET_CIM Request ' + id + ': Sending request to ' + options.host + options.path);
			console.log('AUTHNET_CIM Request ' + id + ': Request body - ' + request);
		}

		req.write(request);
		req.on('error', function(err) {
			if(debug) console.log('AUTHNET_CIM Request ' + id + ': Error - ' + err);
			callback(err);
		});
		
		req.on('response', function(res) {
			if(debug) console.log('AUTHNET_CIM Request ' + id + ': Response received with status code ' + res.statusCode);
			
			res.on('data', function(data) {
				var parser = new xml2js.Parser(), response;
				data = data.toString();

				if(debug) console.log('AUTHNET_CIM Request ' + id + ': Response body - ' + data);
				
				parser.addListener('end', function(result) {
					callback(null, result);
				});
				
				parser.parseString(data);
			});
		});

		req.end();
	};
};
