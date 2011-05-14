require.paths.unshift(__dirname);

var EventEmitter = require('events').EventEmitter;
var responseParser = require('response-parser'), requestFormats = require('request-formats');
var crypto = require('crypto'), http = require('http');

var host = {
	sandbox: 'apitest.authorize.net',
	live: 'api.authorize.net'
};


exports.createConnection = function(options) {
	var connection = new AuthorizenetCIMClient({
		host: host[options.host],
		path: '/xml/v1/request.api',
		contentType: 'text/xml',
		responseParser: responseParser
	}, options.auth);

	return new Client(options, connection);
};

var AuthorizenetCIMClient = function(options, auth) {
	var createClient;

	if (!auth) {
		createClient = function() {
			return http.createClient(443, options.host, true);
		};
	}
	else {
		createClient = function() {
			var credentials = crypto.createCredentials({
				cert: auth.cert,
				key: auth.key
			});
			
			return http.createClient(443, options.host, true, credentials);
		};
	}

	this.request = function(request, callback) {
		//console.log(request);
		
		// Change this
		
/*		var requestString = qs.stringify(request) */
		var req = createClient().request('POST', options.path, {
			host: options.host,
			'Content-Length': request.length,
			'Content-Type': options.contentType
		})

		console.log(req);
		req.end(request)
		req.on('response', function(res) {
			res.on('data', function(data) {
				callback(options.responseParser.parseResponse(request, data.toString()))
			})
		})
	}
};

var Client = function(options, client) {
    var methods = {}, id = false, key = false;

    methods.createCustomerProfile = function(request) {
        // Pg 21 of merchant service API guide
        if(!request.merchantCustomerId && !request.description && !request.email) return false;
        return requestFormats.createCustomerProfile(request);
    }; 
    methods.createCustomerPaymentProfile = function(request) {
        // Pg 27 of merchant service API guide
        return requestFormats.createCustomerPaymentProfile(request);
    };
    methods.createCustomerShippingAddress = function(request) {
        // Pg 31 of merchant service API guide
        return requestFormats.createCustomerShippingAddress(request);
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

    this.setLoginDetails = function(loginId, transKey) {
        id = loginId;
        key = transKey;
    };

    this.request = function(type, request) {
        var body = false, content = false;
        var emitter = new EventEmitter();

        if(!id || !key) throw new Error('Login ID or Transaction Key missing.');

        content = methods[type](request);

        if(type in methods && content) {
            body = requestFormats.body({
                requestType: type,
                login: id,
                transactionKey: key,
                content: content
            });
        }
        body = body.replace(/>/g, '>\n').replace(/</g, '\n<');
        console.log(body);

        if(body) {
            client.request(body, function(response) {
                emitter.emit((response.responsecode == 1) ? 'success' : 'failure', null, response)
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